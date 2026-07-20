import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  Query,
  UploadedFile,
  UseInterceptors,
  UseGuards,
  NotFoundException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { PluginManagerService } from './plugin-manager.service';
import { PluginRegistryService } from './registry/plugin-registry.service';
import { PluginGuard } from './guards/plugin.guard';

@Controller('api/v1/plugins')
@UseGuards(PluginGuard)
export class PluginController {
  constructor(
    private readonly pluginManager: PluginManagerService,
    private readonly registry: PluginRegistryService,
  ) {}

  @Post('install')
  @UseInterceptors(FileInterceptor('package'))
  async install(
    @Query('tenantId') tenantId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new NotFoundException('Package file is required');
    }
    return this.pluginManager.install(tenantId, file.buffer);
  }

  @Post(':id/activate')
  async activate(
    @Param('id') id: string,
    @Body('tenantId') tenantId: string,
    @Query('tenantId') queryTenantId: string,
  ) {
    tenantId = tenantId || queryTenantId;
    await this.pluginManager.activate(tenantId, id);
    return { status: 'ok' };
  }

  @Post(':id/deactivate')
  async deactivate(
    @Param('id') id: string,
    @Body('tenantId') tenantId: string,
    @Query('tenantId') queryTenantId: string,
  ) {
    tenantId = tenantId || queryTenantId;
    await this.pluginManager.deactivate(tenantId, id);
    return { status: 'ok' };
  }

  @Delete(':id')
  async uninstall(
    @Param('id') id: string,
    @Body('tenantId') tenantId: string,
    @Query('tenantId') queryTenantId: string,
  ) {
    tenantId = tenantId || queryTenantId;
    await this.pluginManager.uninstall(tenantId, id);
    return { status: 'ok' };
  }

  @Get()
  async list(@Query('tenantId') tenantId: string) {
    return this.registry.list(tenantId);
  }

  @Get(':id')
  async get(
    @Param('id') id: string,
    @Query('tenantId') tenantId: string,
  ) {
    const plugin = await this.registry.get(tenantId, id);
    if (!plugin) {
      throw new NotFoundException('Plugin not found');
    }
    return plugin;
  }
}
