import { Controller, Get, Post, Patch, Delete, Param, Query, Body, ParseUUIDPipe, HttpCode, HttpStatus } from '@nestjs/common';
import { FolderService } from './folder.service';

@Controller('api/v1/documents/folders')
export class FolderController {
  constructor(private readonly folderService: FolderService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() body: { name: string; parentId?: string }, @Query('tenantId') tenantId: string) {
    return this.folderService.create(tenantId, body.name, body.parentId);
  }

  @Get()
  async list(@Query('tenantId') tenantId: string) {
    return this.folderService.list(tenantId);
  }

  @Get('tree')
  async tree(@Query('tenantId') tenantId: string) {
    return this.folderService.getTree(tenantId);
  }

  @Patch(':id')
  async update(@Param('id', ParseUUIDPipe) id: string, @Body() body: { name: string }, @Query('tenantId') tenantId: string) {
    return this.folderService.update(id, tenantId, body.name);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(@Param('id', ParseUUIDPipe) id: string, @Query('tenantId') tenantId: string) {
    await this.folderService.delete(id, tenantId);
  }
}
