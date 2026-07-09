import { Controller, Get, Post, Delete, Param, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { TenantId } from '../../common/decorators/tenant-id.decorator';
import { AnnouncementsService } from './announcements.service';
import { BackupService } from './backup.service';
import { GdprService } from './gdpr.service';

@ApiTags('Admin Tools')
@ApiBearerAuth()
@Controller('api/v1/admin-tools')
export class AdminToolsController {
  constructor(
    private readonly announcements: AnnouncementsService,
    private readonly backup: BackupService,
    private readonly gdpr: GdprService,
  ) {}

  // ─── Announcements ───

  @Get('announcements')
  @ApiOperation({ summary: 'Obtener anuncios activos' })
  getActiveAnnouncements() {
    return this.announcements.getActive();
  }

  @Post('announcements')
  @ApiOperation({ summary: 'Crear anuncio' })
  createAnnouncement(@Body() body: { message: string; expiresInDays?: number }) {
    return this.announcements.create(body.message, body.expiresInDays);
  }

  // ─── Backups ───

  @Post('backups')
  @ApiOperation({ summary: 'Crear backup de la base de datos' })
  async createBackup() {
    const filename = await this.backup.createBackup();
    return { success: true, filename };
  }

  @Get('backups')
  @ApiOperation({ summary: 'Listar backups disponibles' })
  listBackups() {
    return this.backup.listBackups();
  }

  // ─── GDPR ───

  @Get('gdpr/export/:tenantId')
  @ApiOperation({ summary: 'Exportar todos los datos de un tenant' })
  exportGdpr(@Param('tenantId') tenantId: string) {
    return this.gdpr.exportTenantData(tenantId);
  }

  @Delete('gdpr/:tenantId')
  @ApiOperation({ summary: 'Eliminar todos los datos de un tenant (RGPD)' })
  deleteGdpr(@Param('tenantId') tenantId: string) {
    return this.gdpr.deleteTenantData(tenantId);
  }
}
