import { Controller, Get, NotFoundException, Param, Query, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { TokenAuthGuard } from '../auth/token-auth.guard';
import { ScopeGuard, RequireScope } from '../guards/scope.guard';
import { RateLimitGuard } from '../rate-limit/rate-limit.guard';
import { ExternalAuth } from '../../../common/decorators/public.decorator';
import { DocumentService } from '../../document-engine/document.service';
import { toV1 } from './mappers/document-response.mapper';
import type { V1DocumentResponse, PublicApiResponse } from '@shared/public-api';

type PublicApiRequest = Request & { tenantId: string };

@Controller('api/v1/public/documents')
@ExternalAuth('api-token-deferred')
@UseGuards(TokenAuthGuard, ScopeGuard, RateLimitGuard)
export class V1DocumentsController {
  constructor(private readonly documentService: DocumentService) {}

  @Get()
  @RequireScope('documents:read')
  async list(
    @Req() request: PublicApiRequest,
    @Query('folderId') folderId?: string,
  ): Promise<PublicApiResponse<V1DocumentResponse[]>> {
    const documents = await this.documentService.listDocuments(request.tenantId, folderId);
    return { data: documents.map(toV1) };
  }

  @Get(':id')
  @RequireScope('documents:read')
  async get(
    @Param('id') id: string,
    @Req() request: PublicApiRequest,
  ): Promise<PublicApiResponse<V1DocumentResponse>> {
    const document = await this.documentService.getDocument(request.tenantId, id);
    if (!document) throw new NotFoundException('Document not found');
    return { data: toV1(document) };
  }
}
