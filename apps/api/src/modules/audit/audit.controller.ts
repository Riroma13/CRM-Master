import { Controller, Get, Param, Query, HttpCode, HttpStatus, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery, ApiBearerAuth } from '@nestjs/swagger';
import { AuditService } from './audit.service';
import { AuditEventQuerySchema, PaginatedResult, IntegrityVerificationResult } from './dto';
import { AuditEventRow } from './audit.service';
import { AuditGuard } from './guards/audit.guard';
import { IntegrityVerifier } from './integrity/integrity-verifier';

@ApiTags('Audit')
@ApiBearerAuth()
@UseGuards(AuditGuard)
@Controller('api/v1/audit')
export class AuditController {
  constructor(
    private readonly auditService: AuditService,
    private readonly integrityVerifier: IntegrityVerifier,
  ) {}

  @Get('events')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get paginated audit events with filters' })
  @ApiQuery({ name: 'tenantId', required: true })
  @ApiQuery({ name: 'actorType', required: false, enum: ['user', 'system', 'integration', 'workflow', 'admin', 'api'] })
  @ApiQuery({ name: 'actorId', required: false })
  @ApiQuery({ name: 'resourceType', required: false, enum: ['user', 'role', 'permission', 'tenant', 'configuration', 'workflow', 'notification', 'document', 'integration', 'automation', 'communication', 'auth', 'api'] })
  @ApiQuery({ name: 'resourceId', required: false })
  @ApiQuery({ name: 'action', required: false, enum: ['create', 'read', 'update', 'delete', 'login', 'logout', 'authenticate', 'authorize', 'deny', 'assign', 'revoke', 'start', 'complete', 'fail', 'export', 'import', 'purge'] })
  @ApiQuery({ name: 'outcome', required: false, enum: ['success', 'failure', 'denied', 'error'] })
  @ApiQuery({ name: 'correlationId', required: false })
  @ApiQuery({ name: 'dateFrom', required: false })
  @ApiQuery({ name: 'dateTo', required: false })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getEvents(
    @Query() query: Record<string, unknown>,
  ): Promise<PaginatedResult<AuditEventRow>> {
    const parsed = AuditEventQuerySchema.parse(query);
    return this.auditService.getEvents(parsed.tenantId, parsed);
  }

  @Get('events/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get a single audit event by ID' })
  @ApiQuery({ name: 'tenantId', required: true })
  async getEvent(
    @Param('id') id: string,
    @Query('tenantId') tenantId: string,
  ): Promise<AuditEventRow> {
    return this.auditService.getEvent(tenantId, id);
  }

  @Get('integrity/verify')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify hash chain integrity for a tenant' })
  @ApiQuery({ name: 'tenantId', required: true })
  @ApiQuery({ name: 'dateFrom', required: false })
  @ApiQuery({ name: 'dateTo', required: false })
  async verifyIntegrity(
    @Query('tenantId') tenantId: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ): Promise<IntegrityVerificationResult> {
    if (dateFrom || dateTo) {
      return this.integrityVerifier.verifyRange(tenantId, dateFrom, dateTo);
    }
    return this.integrityVerifier.verifyChain(tenantId);
  }
}
