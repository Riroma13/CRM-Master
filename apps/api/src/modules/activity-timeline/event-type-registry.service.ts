import { Injectable, Logger } from '@nestjs/common';
import { EventTypeRegistry, EventTypeMetadata } from '../../../../../packages/shared/src/activity-timeline';

@Injectable()
export class EventTypeRegistryService {
  private readonly logger = new Logger(EventTypeRegistryService.name);
  private readonly registry = new EventTypeRegistry();
  private seeded = false;

  constructor() {
    this.seed();
  }

  getRegistry(): EventTypeRegistry {
    return this.registry;
  }

  getAllTypes(): EventTypeMetadata[] {
    return this.registry.getAll();
  }

  getByModule(module: string): EventTypeMetadata[] {
    return this.registry.getByModule(module);
  }

  isRegistered(eventType: string): boolean {
    return this.registry.isRegistered(eventType);
  }

  private seed(): void {
    if (this.seeded) return;
    this.seeded = true;

    const knownTypes: EventTypeMetadata[] = [
      { eventType: 'cliente.creado', module: 'clientes', description: 'Cliente creado en el sistema', category: 'crm', since: '2024-01-01' },
      { eventType: 'cliente.actualizado', module: 'clientes', description: 'Datos de cliente actualizados', category: 'crm', since: '2024-01-01' },
      { eventType: 'evento.creado', module: 'eventos', description: 'Evento académico creado', category: 'scheduling', since: '2024-01-01' },
      { eventType: 'sistema.añadido', module: 'sistemas', description: 'Nuevo sistema registrado', category: 'crm', since: '2024-01-01' },
      { eventType: 'sistema.modificado', module: 'sistemas', description: 'Sistema modificado', category: 'crm', since: '2024-01-01' },
      { eventType: 'documento.generado', module: 'documentos', description: 'Documento generado desde plantilla', category: 'document', since: '2024-01-01' },
      { eventType: 'documento.firmado', module: 'documentos', description: 'Documento firmado digitalmente', category: 'document', since: '2024-01-01' },
      { eventType: 'documento.subido', module: 'documentos', description: 'Documento subido al sistema', category: 'document', since: '2024-06-01' },
      { eventType: 'documento.eliminado', module: 'documentos', description: 'Documento eliminado', category: 'document', since: '2024-06-01' },
      { eventType: 'documento.compartido', module: 'documentos', description: 'Documento compartido externamente', category: 'document', since: '2024-06-01' },
      { eventType: 'presupuesto.enviado', module: 'presupuestos', description: 'Presupuesto enviado al cliente', category: 'crm', since: '2024-01-01' },
      { eventType: 'presupuesto.aceptado', module: 'presupuestos', description: 'Presupuesto aceptado por el cliente', category: 'crm', since: '2024-01-01' },
      { eventType: 'incidencia.creada', module: 'incidencias', description: 'Nueva incidencia reportada', category: 'crm', since: '2024-01-01' },
      { eventType: 'incidencia.resuelta', module: 'incidencias', description: 'Incidencia marcada como resuelta', category: 'crm', since: '2024-01-01' },
      { eventType: 'pago.recibido', module: 'pagos', description: 'Pago recibido y confirmado', category: 'crm', since: '2024-01-01' },
      { eventType: 'automatizacion.ejecutada', module: 'automatizaciones', description: 'Regla de automatización ejecutada', category: 'automation', since: '2024-01-01' },
      { eventType: 'email.enviado', module: 'comunicaciones', description: 'Correo electrónico enviado', category: 'communication', since: '2024-01-01' },
      { eventType: 'login.realizado', module: 'auth', description: 'Inicio de sesión registrado', category: 'auth', since: '2024-01-01' },
      { eventType: 'password.cambiado', module: 'auth', description: 'Contraseña de usuario cambiada', category: 'auth', since: '2024-01-01' },
      { eventType: 'reserva.creada', module: 'citas', description: 'Nueva cita o reserva creada', category: 'scheduling', since: '2024-01-01' },
      { eventType: 'encuesta.respondida', module: 'encuestas', description: 'Encuesta de satisfacción respondida', category: 'crm', since: '2024-01-01' },
      { eventType: 'usuario.registrado', module: 'auth', description: 'Nuevo usuario registrado', category: 'auth', since: '2024-01-01' },
      { eventType: 'notificacion.enviada', module: 'notificaciones', description: 'Notificación enviada al usuario', category: 'notification', since: '2024-01-01' },
      { eventType: 'workflow.iniciado', module: 'workflow', description: 'Flujo de trabajo iniciado', category: 'automation', since: '2024-01-01' },
      { eventType: 'workflow.completado', module: 'workflow', description: 'Flujo de trabajo completado exitosamente', category: 'automation', since: '2024-01-01' },
      { eventType: 'workflow.error', module: 'workflow', description: 'Error en ejecución de workflow', category: 'automation', since: '2024-01-01' },
      { eventType: 'workflow.pausado', module: 'workflow', description: 'Flujo de trabajo pausado', category: 'automation', since: '2024-01-01' },
      { eventType: 'notificacion.leida', module: 'notificaciones', description: 'Notificación marcada como leída', category: 'notification', since: '2024-06-01' },
      { eventType: 'notificacion.error', module: 'notificaciones', description: 'Error al enviar notificación', category: 'notification', since: '2024-06-01' },
      { eventType: 'notificacion.programada', module: 'notificaciones', description: 'Notificación programada para envío futuro', category: 'notification', since: '2024-06-01' },
      { eventType: 'integracion.conectada', module: 'integraciones', description: 'Integración con servicio externo conectada', category: 'integration', since: '2024-06-01' },
      { eventType: 'integracion.desconectada', module: 'integraciones', description: 'Integración con servicio externo desconectada', category: 'integration', since: '2024-06-01' },
      { eventType: 'integracion.error', module: 'integraciones', description: 'Error en integración con servicio externo', category: 'integration', since: '2024-06-01' },
    ];

    for (const metadata of knownTypes) {
      try {
        this.registry.register(metadata);
      } catch {
        this.logger.warn(`Duplicate event type skipped: ${metadata.eventType}`);
      }
    }

    this.logger.log(`EventTypeRegistry seeded with ${knownTypes.length} event types`);
  }
}
