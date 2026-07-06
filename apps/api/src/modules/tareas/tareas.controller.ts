import {
  Controller, Get, Post, Body, Param, Query,
  UseGuards, ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { TareasService } from './tareas.service';
import { CreateTareaRapidaSchema, TareaListQuery, CreateTareaDto } from './dto';
import { AdminAuthGuard } from '../../common/guards/admin-auth.guard';
import { TenantScopeGuard } from '../../common/guards/tenant-scope.guard';

@ApiTags('Admin - Tareas')
@ApiBearerAuth()
@UseGuards(AdminAuthGuard, TenantScopeGuard)
@Controller('api/v1/admin/clientes/:clienteId/tareas')
export class TareasController {
  constructor(private readonly tareasService: TareasService) {}

  @Get()
  @ApiOperation({ summary: 'Listar tareas de un cliente' })
  async findAll(
    @Param('clienteId', ParseUUIDPipe) clienteId: string,
    @Query() query: any,
  ) {
    const parsed = TareaListQuery.parse(query);
    return this.tareasService.findAll(clienteId, parsed);
  }

  @Post()
  @ApiOperation({ summary: 'Crear tarea rápida para un cliente' })
  async create(
    @Param('clienteId', ParseUUIDPipe) clienteId: string,
    @Body() dto: CreateTareaDto,
  ) {
    const parsed = CreateTareaRapidaSchema.parse(dto);
    return this.tareasService.create(clienteId, parsed);
  }
}
