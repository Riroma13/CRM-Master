import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';

@Injectable()
export class TenantHealthService {
  constructor(private readonly prisma: PrismaService) {}

  async getHealth(tenantId: string) {
    const now = new Date();

    // Count open incidencias
    const incidenciasAbiertas = await this.prisma.admin.incidencia.count({
      where: { tenantId, estado: { in: ['abierta', 'en_curso'] } },
    });

    // Count overdue tareas
    const tareasVencidas = await this.prisma.admin.tarea.count({
      where: {
        tenantId,
        estado: { not: 'Hecho' },
        fechaLimite: { lt: now },
      },
    });

    // Count citas pendientes sin confirmar
    const citasSinConfirmar = await this.prisma.admin.cita.count({
      where: {
        tenantId,
        estado: 'pendiente',
        fecha: { lt: now },
      },
    });

    // Calculate score: 0 = critical, 100 = perfect
    let score = 100;
    score -= incidenciasAbiertas * 10;
    score -= tareasVencidas * 5;
    score -= citasSinConfirmar * 3;
    score = Math.max(0, Math.min(100, score));

    let status: '🟢' | '🟡' | '🔴';
    if (score >= 80) status = '🟢';
    else if (score >= 50) status = '🟡';
    else status = '🔴';

    return {
      status,
      score,
      indicators: {
        incidenciasAbiertas,
        tareasVencidas,
        citasSinConfirmar,
      },
      calculatedAt: now.toISOString(),
    };
  }
}
