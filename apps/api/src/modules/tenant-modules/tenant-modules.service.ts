import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';

export const AVAILABLE_MODULES = [
  { id: 'dashboard', label: 'Dashboard', defaultEnabled: true },
  { id: 'clientes', label: 'Clientes', defaultEnabled: true },
  { id: 'documentos', label: 'Documentos', defaultEnabled: true },
  { id: 'tareas', label: 'Tareas', defaultEnabled: true },
  { id: 'calendario', label: 'Calendario', defaultEnabled: true },
  { id: 'recursos', label: 'Recursos', defaultEnabled: true },
  { id: 'sistemas', label: 'Sistemas', defaultEnabled: true },
  { id: 'perfil', label: 'Perfil', defaultEnabled: true },
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
