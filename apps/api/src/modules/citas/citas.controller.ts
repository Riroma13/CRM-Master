import {
  Controller,
  Get,
  Post,
  Patch,
  Put,
  Body,
  Param,
  Query,
  ParseUUIDPipe,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery, ApiBearerAuth } from '@nestjs/swagger';
import { z } from 'zod';
import { CitasService } from './citas.service';
import { DisponibilidadService } from './disponibilidad.service';
import { TenantId } from '../../common/decorators/tenant-id.decorator';
import {
  BookCitaSchema,
  UpdateCitaSchema,
  DisponibilidadSchema,
} from './dto';
import type { BookCitaDto, UpdateCitaDto, DisponibilidadDto } from './dto';

/** Helper: validates input with a Zod schema and throws BadRequestException on failure. */
function validateOrThrow<T extends z.ZodTypeAny>(
  schema: T,
  data: unknown,
): z.output<T> {
  const result = schema.safeParse(data);
  if (!result.success) {
    throw new BadRequestException(
      result.error.issues[0]?.message || 'Validation failed',
    );
  }
  return result.data;
}

@ApiTags('Tenant - Calendario')
@Controller('api/v1/tenant/calendario')
export class CitasController {
  constructor(
    private readonly citasService: CitasService,
    private readonly disponibilidadService: DisponibilidadService,
  ) {}

  // ──────────────────────────────────────────────
  // Public endpoints — no auth required
  // Tenant resolved from Host header via TenantResolveMiddleware
  // ──────────────────────────────────────────────

  @Get('slots')
  @ApiOperation({
    summary: 'Obtener slots disponibles para una fecha',
    description:
      'Endpoint público. Devuelve los slots de cita disponibles para una fecha específica según la configuración del tenant.',
  })
  @ApiQuery({
    name: 'fecha',
    required: true,
    example: '2026-07-05',
    description: 'Fecha en formato YYYY-MM-DD',
  })
  async getSlots(
    @TenantId() tenantId: string,
    @Query('fecha') fecha: string,
  ) {
    if (!fecha || !/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
      throw new BadRequestException('Formato de fecha inválido. Use YYYY-MM-DD');
    }

    const date = new Date(fecha + 'T00:00:00Z');
    return this.citasService.getSlots(tenantId, date);
  }

  @Post('citas')
  @ApiOperation({
    summary: 'Agendar una cita',
    description:
      'Endpoint público. Crea una nueva cita con prevención de doble reserva.',
  })
  async createCita(
    @TenantId() tenantId: string,
    @Body() body: BookCitaDto,
  ) {
    const parsed = validateOrThrow(BookCitaSchema, body);
    return this.citasService.bookSlot(tenantId, {
      fecha: new Date(parsed.fecha),
      duracion: 30,
      clienteNombre: parsed.clienteNombre,
      clienteEmail: parsed.clienteEmail,
      clienteTelefono: parsed.clienteTelefono,
      descripcion: parsed.descripcion,
    });
  }

  // ──────────────────────────────────────────────
  // Tenant admin endpoints — auth via BetterAuthGuard (future scope)
  // BetterAuthGuard currently passes through for non-/api/v1/admin/ routes.
  // @ApiBearerAuth() documents the intent for when tenant-admin auth is wired.
  // ──────────────────────────────────────────────

  @Get('citas')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Listar citas del tenant',
    description: 'Endpoint para administradores del tenant. Lista todas las citas.',
  })
  async listCitas(@TenantId() tenantId: string) {
    return this.citasService.listCitas(tenantId);
  }

  @Patch('citas/:id')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Confirmar o cancelar una cita',
    description:
      'Endpoint para administradores del tenant. Cambia el estado de una cita a confirmada o cancelada.',
  })
  async updateCita(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: UpdateCitaDto,
  ) {
    const parsed = validateOrThrow(UpdateCitaSchema, body);

    switch (parsed.estado) {
      case 'confirmada':
        return this.citasService.confirmCita(id);
      case 'cancelada':
        return this.citasService.cancelCita(id);
      case 'completada':
        throw new BadRequestException(
          'El estado "completada" no está soportado aún. Use confirmada o cancelada.',
        );
      default:
        throw new BadRequestException(`Estado no soportado: ${parsed.estado}`);
    }
  }

  @Get('disponibilidad')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Obtener configuración de disponibilidad',
    description:
      'Endpoint para administradores del tenant. Devuelve la configuración actual de disponibilidad o los valores por defecto.',
  })
  async getDisponibilidad(@TenantId() tenantId: string) {
    return this.disponibilidadService.getDisponibilidad(tenantId);
  }

  @Put('disponibilidad')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Actualizar configuración de disponibilidad',
    description:
      'Endpoint para administradores del tenant. Crea o actualiza la configuración de disponibilidad de horarios.',
  })
  async updateDisponibilidad(
    @TenantId() tenantId: string,
    @Body() body: DisponibilidadDto,
  ) {
    const parsed = validateOrThrow(DisponibilidadSchema, body);
    return this.disponibilidadService.upsertDisponibilidad(tenantId, parsed);
  }
}
