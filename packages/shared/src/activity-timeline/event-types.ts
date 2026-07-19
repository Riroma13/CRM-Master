import { z } from 'zod';

export const knownEventTypes = [
  'cliente.creado',
  'cliente.actualizado',
  'evento.creado',
  'sistema.añadido',
  'sistema.modificado',
  'documento.generado',
  'documento.firmado',
  'presupuesto.enviado',
  'presupuesto.aceptado',
  'incidencia.creada',
  'incidencia.resuelta',
  'pago.recibido',
  'automatizacion.ejecutada',
  'email.enviado',
  'login.realizado',
  'password.cambiado',
  'reserva.creada',
  'encuesta.respondida',
  'usuario.registrado',
  'notificacion.enviada',
] as const;

export const EventType = z.enum(knownEventTypes);
export type EventType = z.infer<typeof EventType>;
