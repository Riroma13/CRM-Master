import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { TokenAuthGuard } from '../auth/token-auth.guard';
import { ScopeGuard, RequireScope } from '../guards/scope.guard';
import { RateLimitGuard } from '../rate-limit/rate-limit.guard';
import { DocumentService } from '../../document-engine/document.service';
import { toV1 } from './mappers/document-response.mapper';
import type { V1DocumentResponse, PublicApiResponse } from '@shared/public-api';

@Controller('api/v1/public/documents')
@UseGuards(TokenAuthGuard, ScopeGuard, RateLimitGuard)
export class V1DocumentsController {
  constructor(private readonly documentService: DocumentService) {}

  @Get()
  @RequireScope('documents:read')
  async list(
    @Query('tenantId') tenantId: string,
    @Query('folderId') folderId?: string,
  ): Promise<PublicApiResponse<V1DocumentResponse[]>> {
    const documents = await this.documentService.listDocuments(tenantId, folderId);
    return { data: documents.map(toV1) };
  }

  @Get(':id')
  @RequireScope('documents:read')
  async get(
    @Param('id') id: string,
    @Query('tenantId') tenantId: string,
  ): Promise<PublicApiResponse<V1DocumentResponse>> {
    const document = await this.documentService.getDocument(tenantId, id);
    return { data: toV1(document) };
  }
}
