import {
  Controller, Get, Post, Body, Param, Query,
  UseGuards, HttpStatus, ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { TenantsService } from './tenants.service';
import { CreateTenantDto, TenantListDto } from './dto';

@ApiTags('Admin - Tenants')
@ApiBearerAuth()
@Controller('api/v1/admin/tenants')
export class TenantsController {
  constructor(private readonly tenantsService: TenantsService) {}

  @Post()
  @ApiOperation({ summary: 'Crear nuevo tenant con admin e invitación' })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Tenant creado' })
  @ApiResponse({ status: HttpStatus.CONFLICT, description: 'Slug duplicado' })
  async create(@Body() dto: CreateTenantDto) {
    return this.tenantsService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Listar tenants (paginado, con búsqueda)' })
  async findAll(@Query() query: TenantListDto) {
    return this.tenantsService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener detalle de un tenant' })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.tenantsService.findOne(id);
  }
}
