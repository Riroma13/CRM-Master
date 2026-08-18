import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  UploadedFile,
  UseInterceptors,
  UseGuards,
  Req,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import { PluginManagerService } from './plugin-manager.service';
import { PluginRegistryService } from './registry/plugin-registry.service';
import { PluginGuard } from './guards/plugin.guard';
import { IdentityOrganizationGuard } from '../identity/identity-organization.guard';

@Controller('api/v1/plugins')
@UseGuards(IdentityOrganizationGuard, PluginGuard)
export class PluginController {
  constructor(
    private readonly pluginManager: PluginManagerService,
    private readonly registry: PluginRegistryService,
  ) {}

  private tenantId(request: Request & { pluginContext?: { tenantId: string } }): string {
    const tenantId = request.pluginContext?.tenantId;
    if (!tenantId) throw new UnauthorizedException('IDENTITY_SESSION_REQUIRED');
    return tenantId;
  }

  @Post('install')
  @UseInterceptors(FileInterceptor('package'))
  async install(
    @Req() request: Request & { pluginContext: { tenantId: string } },
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new NotFoundException('Package file is required');
    }
    return this.pluginManager.install(this.tenantId(request), file.buffer);
  }

  @Post(':id/activate')
  async activate(
    @Param('id') id: string,
    @Req() request: Request & { pluginContext: { tenantId: string } },
  ) {
    await this.pluginManager.activate(this.tenantId(request), id);
    return { status: 'ok' };
  }

  @Post(':id/deactivate')
  async deactivate(
    @Param('id') id: string,
    @Req() request: Request & { pluginContext: { tenantId: string } },
  ) {
    await this.pluginManager.deactivate(this.tenantId(request), id);
    return { status: 'ok' };
  }

  @Delete(':id')
  async uninstall(
    @Param('id') id: string,
    @Req() request: Request & { pluginContext: { tenantId: string } },
  ) {
    await this.pluginManager.uninstall(this.tenantId(request), id);
    return { status: 'ok' };
  }

  @Get()
  async list(@Req() request: Request & { pluginContext: { tenantId: string } }) {
    return this.registry.list(this.tenantId(request));
  }

  @Get(':id')
  async get(
    @Param('id') id: string,
    @Req() request: Request & { pluginContext: { tenantId: string } },
  ) {
    const plugin = await this.registry.get(this.tenantId(request), id);
    if (!plugin) {
      throw new NotFoundException('Plugin not found');
    }
    return plugin;
  }
}
