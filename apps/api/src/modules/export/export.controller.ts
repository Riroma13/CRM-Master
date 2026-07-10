import { Controller, Get, Res } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Response } from 'express';
import { PrismaService } from '../../common/prisma.service';
import { TenantId } from '../../common/decorators/tenant-id.decorator';

@ApiTags('Export')
@ApiBearerAuth()
@Controller('api/v1/export')
export class ExportController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('clientes/csv')
  @ApiOperation({ summary: 'Exportar clientes a CSV' })
  async exportClientesCsv(@TenantId() tenantId: string, @Res() res: Response) {
    const clientes = await this.prisma.admin.cliente.findMany({
      where: { tenantId },
      orderBy: { nombre: 'asc' },
    });

    const headers = ['nombre', 'tipo_negocio', 'estado_relacion', 'salud', 'tags', 'creado'];
    const rows = clientes.map((c: any) => [
      c.nombre,
      c.tipoNegocio || '',
      c.estadoRelacion,
      c.saludGeneral,
      (c.tags || []).join('; '),
      c.createdAt.toISOString().split('T')[0],
    ]);

    const csv = [headers.join(','), ...rows.map((r: string[]) => r.map((v: string) => `"${v.replace(/"/g, '""')}"`).join(','))].join('\n');

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="clientes-${new Date().toISOString().split('T')[0]}.csv"`);
    res.send(csv);
  }

  @Get('all/json')
  @ApiOperation({ summary: 'Exportar todos los datos del tenant (JSON)' })
  async exportAllJson(@TenantId() tenantId: string, @Res() res: Response) {
    const [clientes, tareas, citas, documentos, incidencias, sistemas] = await Promise.all([
      this.prisma.admin.cliente.findMany({ where: { tenantId } }),
      this.prisma.admin.tarea.findMany({ where: { tenantId } }),
      this.prisma.admin.cita.findMany({ where: { tenantId } }),
      this.prisma.admin.documento.findMany({ where: { tenantId, isDeleted: false }, select: { id: true, filename: true, category: true, createdAt: true } }),
      this.prisma.admin.incidencia.findMany({ where: { tenantId } }),
      this.prisma.admin.sistema.findMany({ where: { tenantId } }),
    ]);

    const data = { exportedAt: new Date().toISOString(), clientes, tareas, citas, documentos, incidencias, sistemas };

    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="datos-${new Date().toISOString().split('T')[0]}.json"`);
    res.json(data);
  }
}
