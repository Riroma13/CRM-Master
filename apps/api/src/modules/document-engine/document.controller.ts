import { Controller, Get, Post, Delete, Param, Query, Body, ParseUUIDPipe, HttpCode, HttpStatus, UseGuards } from '@nestjs/common';
import { DocumentService } from './document.service';
import { DocumentPermissionGuard } from './guards/document-permission.guard';
import { UploadSchema, DocumentQuery, VersionListQuery } from './dto';

@Controller('api/v1/documents')
@UseGuards(DocumentPermissionGuard)
export class DocumentController {
  constructor(private readonly documentService: DocumentService) {}

  @Post('upload')
  @HttpCode(HttpStatus.CREATED)
  async upload(@Body() body: unknown, @Query('tenantId') tenantId: string) {
    const parsed = UploadSchema.parse(body);
    const file = Buffer.from(parsed.fileName); // placeholder — real file from multipart
    return this.documentService.upload(tenantId, file, parsed.fileName, parsed.mimeType, parsed.folderId);
  }

  @Get()
  async list(@Query() query: unknown, @Query('tenantId') tenantId: string) {
    const parsed = DocumentQuery.parse(query);
    return this.documentService.listDocuments(tenantId, parsed.folderId);
  }

  @Get(':documentId')
  async get(@Param('documentId') documentId: string, @Query('tenantId') tenantId: string) {
    return this.documentService.getDocument(tenantId, documentId);
  }

  @Delete(':documentId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(@Param('documentId') documentId: string, @Query('tenantId') tenantId: string) {
    await this.documentService.softDelete(tenantId, documentId);
  }

  @Get(':documentId/versions')
  async listVersions(@Param('documentId') documentId: string, @Query('tenantId') tenantId: string, @Query() query: unknown) {
    VersionListQuery.parse(query);
    const doc = await this.documentService.getDocument(tenantId, documentId);
    return doc?.versions ?? [];
  }
}
