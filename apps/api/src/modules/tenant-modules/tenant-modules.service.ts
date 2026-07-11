import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';

export const AVAILABLE_MODULES = [
  { id: 'dashboard', label: 'Dashboard', defaultEnabled: true },
  { id: 'clientes', label: 'Clientes', defaultEnabled: true },
  { id: 'pipeline', label: 'Pipeline', defaultEnabled: true },
  { id: 'reportes', label: 'Reportes', defaultEnabled: true },
  { id: 'presupuestos', label: 'Presupuestos', defaultEnabled: true },
  { id: 'webhooks', label: 'Webhooks', defaultEnabled: true },
  { id: 'plantillas', label: 'Plantillas', defaultEnabled: true },
  { id: 'email', label: 'Email', defaultEnabled: true },
  { id: 'automations', label: 'Automatizaciones', defaultEnabled: true },
  { id: 'pagos', label: 'Pagos', defaultEnabled: true },
  { id: 'calendar', label: 'Google Calendar', defaultEnabled: true },
  { id: 'encuestas', label: 'Encuestas', defaultEnabled: true },
  { id: 'planes', label: 'Plan', defaultEnabled: true },
  { id: 'calendarioAcademico', label: 'Cal. Académico', defaultEnabled: true },
  { id: 'preferencias', label: 'Preferencias', defaultEnabled: true },
  { id: 'documentos', label: 'Documentos', defaultEnabled: true },
  { id: 'tareas', label: 'Tareas', defaultEnabled: true },
  { id: 'calendario', label: 'Calendario', defaultEnabled: true },
  { id: 'recursos', label: 'Recursos', defaultEnabled: true },
  { id: 'sistemas', label: 'Sistemas', defaultEnabled: true },
  { id: 'perfil', label: 'Perfil', defaultEnabled: true },
  { id: 'notificaciones', label: 'Notificaciones', defaultEnabled: true },
  { id: 'incidencias', label: 'Incidencias', defaultEnabled: true },
];

const MODULE_IDS = AVAILABLE_MODULES.map((m) => m.id);

function getDefaultModules(): string[] {
  return AVAILABLE_MODULES.filter((m) => m.defaultEnabled).map((m) => m.id);
}

@Injectable()
export class TenantModulesService {
  constructor(private readonly prisma: PrismaService) {}

  async getModules(tenantId: string) {
    const tenant = await this.prisma.admin.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant) throw new NotFoundException('Tenant no encontrado');

    const config = (tenant.config as any) ?? {};
    const enabledModules: string[] = config.modules ?? getDefaultModules();

    return {
      available: AVAILABLE_MODULES,
      enabled: enabledModules,
    };
  }

  async updateModules(tenantId: string, enabled: string[]) {
    const tenant = await this.prisma.admin.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant) throw new NotFoundException('Tenant no encontrado');

    // Validate module IDs
    const invalid = enabled.filter((id) => !MODULE_IDS.includes(id));
    if (invalid.length > 0) {
      throw new NotFoundException(`Módulos inválidos: ${invalid.join(', ')}`);
    }

    const config = (tenant.config as any) ?? {};
    config.modules = enabled;

    await this.prisma.admin.tenant.update({
      where: { id: tenantId },
      data: { config: config as any },
    });

    return { available: AVAILABLE_MODULES, enabled };
  }
}
