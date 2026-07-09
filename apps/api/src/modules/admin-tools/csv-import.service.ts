import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';

@Injectable()
export class CsvImportService {
  private readonly logger = new Logger(CsvImportService.name);

  constructor(private readonly prisma: PrismaService) {}

  async importClients(tenantId: string, csvContent: string) {
    const lines = csvContent.trim().split('\n');
    if (lines.length < 2) throw new BadRequestException('CSV debe tener cabecera + al menos 1 fila');

    const headers = lines[0].split(',').map((h) => h.trim().toLowerCase());
    const nameIdx = headers.findIndex((h) => h === 'nombre' || h === 'name');
    const negocioIdx = headers.findIndex((h) => h.includes('tipo') || h.includes('negocio'));
    const emailIdx = headers.findIndex((h) => h === 'email' || h === 'contacto');
    const estadoIdx = headers.findIndex((h) => h === 'estado' || h === 'relacion');

    if (nameIdx === -1) throw new BadRequestException('CSV debe tener columna "nombre"');

    const created: any[] = [];
    const errors: string[] = [];

    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(',').map((c) => c.trim());
      const nombre = cols[nameIdx];
      if (!nombre) { errors.push(`Fila ${i + 1}: nombre vacío`); continue; }

      try {
        const cliente = await this.prisma.admin.cliente.create({
          data: {
            tenantId,
            nombre,
            tipoNegocio: negocioIdx >= 0 ? cols[negocioIdx] || undefined : undefined,
            contactoPrincipal: emailIdx >= 0 ? cols[emailIdx] || undefined : undefined,
            estadoRelacion: estadoIdx >= 0 ? cols[estadoIdx] || 'Activo' : 'Activo',
          },
        });
        created.push(cliente.nombre);
      } catch (err: any) {
        errors.push(`Fila ${i + 1}: ${err.message}`);
      }
    }

    this.logger.log(`CSV import: ${created.length} creados, ${errors.length} errores`);

    return {
      imported: created.length,
      errors: errors.length > 0 ? errors.slice(0, 10) : undefined,
      totalLines: lines.length - 1,
    };
  }
}
