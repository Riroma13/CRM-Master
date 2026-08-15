import {
  BadRequestException,
  CanActivate,
  Controller,
  ExecutionContext,
  ForbiddenException,
  Get,
  Headers,
  Injectable,
  Post,
  Req,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ApiConsumes } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { TenantId } from '../../common/decorators/tenant-id.decorator';
import { Public } from '../../common/decorators/public.decorator';
import {
  hasIdentityPermission,
  IdentityOrganizationGuard,
} from '../identity/identity-organization.guard';
import { ImportExportService } from './import-export.service';

@Injectable()
export class ExportCapabilityGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<any>();
    const membership = request.identityMembership;
    if (!membership || !hasIdentityPermission(membership.role, 'configuracion', 'read')) {
      throw new ForbiddenException('IDENTITY_PERMISSION_DENIED');
    }
    return true;
  }
}

@ApiTags('Export')
@ApiBearerAuth()
@Controller('api/v1/export')
@Public()
@UseGuards(IdentityOrganizationGuard, ExportCapabilityGuard)
export class ExportController {
  constructor(private readonly service: ImportExportService) {}

  @Get('clientes/csv')
  @ApiOperation({ summary: 'Exportar clientes a CSV' })
  async exportClientesCsv(@TenantId() tenantId: string, @Req() req: any, @Res() res: Response) {
    const session = req.identitySession;
    return this.service.exportClientesCsv(
      tenantId,
      session.userId,
      req.identityMembership.organizationId,
      res,
    );
  }

  @Get('all/json')
  @ApiOperation({ summary: 'Exportar todos los datos del tenant (JSON)' })
  async exportAllJson(@TenantId() tenantId: string, @Req() req: any, @Res() res: Response) {
    const session = req.identitySession;
    return this.service.exportAllJson(
      tenantId,
      session.userId,
      req.identityMembership.organizationId,
      res,
    );
  }

  @Post('import/clientes/csv')
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file'))
  async importClientesCsv(
    @TenantId() tenantId: string,
    @Req() req: any,
    @Headers('idempotency-key') idempotencyKey: string,
    @UploadedFile() file: Express.Multer.File | undefined,
  ) {
    if (!file) throw new BadRequestException('CSV file required');
    const session = req.identitySession;
    return this.service.enqueueClientesCsvImport(
      tenantId,
      session.userId,
      req.identityMembership.organizationId,
      idempotencyKey,
      file.buffer,
    );
  }
}
