import {
  Controller, Post, Patch, Body, Param, Req,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Request } from 'express';
import { ClientUserManagementService } from './client-user-management.service';
import { CreateClientUserDto, ResetPasswordDto } from './dto/client-user-management.dto';

@ApiTags('Admin - Client Users')
@ApiBearerAuth()
@Controller('api/v1/admin/client-users')
export class ClientUserManagementController {
  constructor(private readonly service: ClientUserManagementService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new ClientUser' })
  async create(@Body() dto: CreateClientUserDto, @Req() req: Request) {
    const tenantId = (req as any).tenantId;
    return this.service.create(dto, tenantId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Disable a ClientUser' })
  async disable(@Param('id', ParseUUIDPipe) id: string, @Req() req: Request) {
    const tenantId = (req as any).tenantId;
    return this.service.disable(id, tenantId);
  }

  @Post(':id/reset-password')
  @ApiOperation({ summary: 'Reset password for a ClientUser' })
  async resetPassword(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ResetPasswordDto,
    @Req() req: Request,
  ) {
    const tenantId = (req as any).tenantId;
    return this.service.resetPassword(id, dto, tenantId);
  }
}
