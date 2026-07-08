import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Req,
  UploadedFile,
  ParseUUIDPipe,
  BadRequestException,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiConsumes,
} from '@nestjs/swagger';
import { z } from 'zod';
import type { Request } from 'express';
import { DocumentosService } from './documentos.service';
import { StorageService } from './storage.service';
import { TenantId } from '../../common/decorators/tenant-id.decorator';
import {
  UploadDocumentSchema,
  CreateShareLinkSchema,
  DOCUMENT_CATEGORIES,
} from './dto';

/** Helper: validates input with a Zod schema and throws BadRequestException on failure. */
function validateOrThrow<T extends z.ZodTypeAny>(
  schema: T,
  data: unknown,
): z.output<T> {
  const result = schema.safeParse(data);
  if (!result.success) {
    throw new BadRequestException(
      result.error.issues[0]?.message || 'Validation failed',
    );
  }
  return result.data;
}

@ApiTags('Tenant - Documentos')
@ApiBearerAuth()
@Controller('api/v1/tenant/documentos')
export class DocumentosController {
  constructor(
    private readonly documentosService: DocumentosService,
    private readonly storageService: StorageService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Subir un documento' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file'))
  async upload(
    @TenantId() tenantId: string,
    @UploadedFile() file: Express.Multer.File | undefined,
    @Body() body: any,
    @Req() req: Request,
  ) {
    if (!file) {
      throw new BadRequestException('El archivo es requerido');
    }

    // Validate max file size (50MB)
    const MAX_SIZE = 50 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      throw new BadRequestException(
        'El archivo excede el tamaño máximo de 50MB',
      );
    }

    const parsed = validateOrThrow(UploadDocumentSchema, {
      category: body.category,
      description: body.description,
      clienteId: body.clienteId,
    });

    // Get tenant slug from request (set by TenantResolveMiddleware)
    const tenantSlug = (req as any).tenantSlug;
    if (!tenantSlug) {
      throw new BadRequestException('No se pudo resolver el slug del tenant');
    }

    // Save file to storage
    const saved = await this.storageService.save(tenantSlug, {
      buffer: file.buffer,
      originalname: file.originalname,
    });

    // Get user ID from request (set by BetterAuthGuard)
    const userId = (req as any).user?.id || 'system';

    // Create database record
    return this.documentosService.create(tenantId, {
      filename: saved.filename,
      storageKey: saved.storageKey,
      mimeType: file.mimetype,
      sizeBytes: file.size,
      category: parsed.category,
      description: parsed.description,
      clienteId: parsed.clienteId,
      uploadedBy: userId,
    });
  }

  @Get()
  @ApiOperation({ summary: 'Listar documentos del tenant' })
  async findAll(@TenantId() tenantId: string) {
    return this.documentosService.findAll(tenantId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener detalle de un documento' })
  async findOne(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.documentosService.findOne(tenantId, id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar metadatos de un documento' })
  async update(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: any,
  ) {
    const data: Record<string, any> = {};

    if (body.category !== undefined) {
      if (!DOCUMENT_CATEGORIES.includes(body.category)) {
        throw new BadRequestException(
          `Categoría inválida. Use: ${DOCUMENT_CATEGORIES.join(', ')}`,
        );
      }
      data.category = body.category;
    }

    if (body.description !== undefined) {
      if (
        typeof body.description !== 'string' ||
        body.description.length > 1000
      ) {
        throw new BadRequestException(
          'La descripción debe ser un texto de máximo 1000 caracteres',
        );
      }
      data.description = body.description;
    }

    if (body.clienteId !== undefined) {
      if (typeof body.clienteId !== 'string' || body.clienteId.length !== 36) {
        throw new BadRequestException('clienteId debe ser un UUID válido');
      }
      data.clienteId = body.clienteId;
    }

    return this.documentosService.update(tenantId, id, data);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar documento (borrado lógico)' })
  async remove(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    await this.documentosService.softDelete(tenantId, id);
    return { message: 'Documento eliminado correctamente' };
  }

  @Post(':id/share')
  @ApiOperation({ summary: 'Generar link de descarga compartible' })
  async createShareLink(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: any,
    @Req() req: Request,
  ) {
    const parsed = validateOrThrow(CreateShareLinkSchema, body);
    const userId = (req as any).user?.id || 'system';

    return this.documentosService.createShareLink(
      tenantId,
      id,
      { expiresIn: parsed.expiresIn, maxDownloads: parsed.maxDownloads },
      userId,
    );
  }
}
