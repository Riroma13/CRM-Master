import { Injectable, Logger } from '@nestjs/common';
import { EnrichmentContext, EnrichmentResult } from '../../../../../../packages/shared/src/activity-timeline';
import { PrismaService } from '../../../common/prisma.service';

interface EntityMapping {
  model: string;
  field: string;
}

const ENTITY_MAP: Record<string, EntityMapping> = {
  cliente: { model: 'cliente', field: 'nombre' },
  sistema: { model: 'sistema', field: 'nombreSistema' },
  documento: { model: 'documento', field: 'filename' },
  presupuesto: { model: 'presupuesto', field: 'titulo' },
  incidencia: { model: 'incidencia', field: 'titulo' },
  cita: { model: 'cita', field: 'titulo' },
  tarea: { model: 'tarea', field: 'titulo' },
  pago: { model: 'pagoIntent', field: 'referencia' },
  usuario: { model: 'user', field: 'name' },
  user: { model: 'user', field: 'name' },
  recurso: { model: 'resource', field: 'nombre' },
  resource: { model: 'resource', field: 'nombre' },
  item_inventario: { model: 'itemInventario', field: 'nombre' },
  evento_academico: { model: 'eventoAcademico', field: 'titulo' },
  integracion: { model: 'integrationConnector', field: 'name' },
  workflow: { model: 'workflowInstance', field: 'id' },
  webhook: { model: 'webhook', field: 'url' },
  notificacion: { model: 'notificationInstance', field: 'id' },
  encuesta: { model: 'encuesta', field: 'id' },
};

@Injectable()
export class EntityNameEnricher {
  readonly name = 'entity-name';
  readonly description = 'Resolves entity display name from entityType + entityId';

  private readonly logger = new Logger(EntityNameEnricher.name);

  constructor(private readonly prisma: PrismaService) {}

  async enrich(context: EnrichmentContext): Promise<EnrichmentResult> {
    if (!context.entityId || !context.entityType) {
      return {};
    }

    const mapping = ENTITY_MAP[context.entityType];
    if (!mapping) {
      this.logger.debug(`No entity mapping for type: ${context.entityType}`);
      return {};
    }

    try {
      const scoped = this.prisma.forTenant(context.tenantId);
      const record = await (scoped as any)[mapping.model].findUnique({
        where: { id: context.entityId },
        select: { [mapping.field]: true },
      });

      if (record && record[mapping.field]) {
        return { subjectName: String(record[mapping.field]) };
      }
    } catch (error) {
      this.logger.warn(
        `Failed to resolve entity name for ${context.entityType}/${context.entityId}: ${(error as Error).message}`,
      );
    }

    return {};
  }
}
