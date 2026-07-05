import {
  Controller, Get, Post, Patch, Body, Param, Query,
  UseGuards, ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ClientsService } from './clients.service';
import { CreateClienteDto, UpdateClienteDto, ClienteListQuery } from './dto';
import { AdminAuthGuard } from '../../common/guards/admin-auth.guard';
import { TenantScopeGuard } from '../../common/guards/tenant-scope.guard';

@ApiTags('Admin - Clients')
@ApiBearerAuth()
@UseGuards(AdminAuthGuard, TenantScopeGuard)
@Controller('api/v1/admin/clientes')
export class ClientsController {
  constructor(private readonly clientsService: ClientsService) {}

  @Post()
  @ApiOperation({ summary: 'Crear nuevo cliente' })
  create(@Body() dto: CreateClienteDto) {
    return this.clientsService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Listar clientes (cross-tenant para superadmin)' })
  findAll(@Query() query: any) {
    return this.clientsService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detalle completo del cliente' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.clientsService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar datos del cliente' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateClienteDto,
  ) {
    return this.clientsService.update(id, dto);
  }
}
