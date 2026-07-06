import {
  Controller, Get, Post, Body, Param, Query,
  UseGuards, ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { EventosService } from './eventos.service';
import { CreateEventoSchema, EventoListQuery, CreateEventoDto } from './dto';
import { AdminAuthGuard } from '../../common/guards/admin-auth.guard';
import { TenantScopeGuard } from '../../common/guards/tenant-scope.guard';
import { z } from 'zod';

@ApiTags('Admin - Eventos')
@ApiBearerAuth()
@UseGuards(AdminAuthGuard, TenantScopeGuard)
@Controller('api/v1/admin/clientes/:clienteId/eventos')
export class EventosController {
  constructor(private readonly eventosService: EventosService) {}

  @Get()
  @ApiOperation({ summary: 'Listar eventos de bitácora de un cliente' })
  async findAll(
    @Param('clienteId', ParseUUIDPipe) clienteId: string,
    @Query() query: any,
  ) {
    const parsed = EventoListQuery.parse(query);
    return this.eventosService.findAll(clienteId, parsed);
  }

  @Post()
  @ApiOperation({ summary: 'Crear nuevo evento de bitácora para un cliente' })
  async create(
    @Param('clienteId', ParseUUIDPipe) clienteId: string,
    @Body() dto: CreateEventoDto,
  ) {
    const parsed = CreateEventoSchema.parse(dto);
    return this.eventosService.create(clienteId, parsed);
  }
}
