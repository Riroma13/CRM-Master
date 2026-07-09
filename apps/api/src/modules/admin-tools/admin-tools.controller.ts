import { Controller, Get, Post, Delete, Param, Body, UploadedFile, UseInterceptors, BadRequestException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';
import { TenantId } from '../../common/decorators/tenant-id.decorator';
import { AnnouncementsService } from './announcements.service';
import { BackupService } from './backup.service';
import { GdprService } from './gdpr.service';
import { CsvImportService } from './csv-import.service';

@ApiTags('Admin Tools')
@ApiBearerAuth()
@Controller('api/v1/admin-tools')
export class AdminToolsController {
  constructor(
    private readonly announcements: AnnouncementsService,
    private readonly backup: BackupService,
    private readonly gdpr: GdprService,
    private readonly csvImport: CsvImportService,
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

  // ─── CSV Import ───

  @Post('csv-import')
  @ApiOperation({ summary: 'Importar clientes desde CSV' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file'))
  async importCsv(@TenantId() tenantId: string, @UploadedFile() file: Express.Multer.File | undefined) {
    if (!file) throw new BadRequestException('Archivo CSV requerido');
    const content = file.buffer.toString('utf-8');
    return this.csvImport.importClients(tenantId, content);
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
