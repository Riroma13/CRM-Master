import {
  Controller,
  Get,
  Param,
  Res,
  NotFoundException,
  GoneException,
  Logger,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import type { Response } from 'express';
import { PrismaService } from '../../common/prisma.service';
import { StorageService } from './storage.service';
import { Public } from '../../common/decorators/public.decorator';

@ApiTags('Public - Documentos Compartidos')
@Controller('api/v1/shared')
@Public()
export class SharedController {
  private readonly logger = new Logger(SharedController.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly storageService: StorageService,
  ) {}

  @Get(':token')
  @ApiOperation({ summary: 'Descargar documento compartido mediante token' })
  async download(@Param('token') token: string, @Res() res: Response) {
    // 1. Find share link by token with documento data
    const shareLink = await this.prisma.admin.shareLink.findUnique({
      where: { token },
      include: { documento: true },
    });

    if (!shareLink) {
      throw new NotFoundException('El enlace de descarga no existe');
    }

    // 2. Validate: documento not deleted
    if (shareLink.documento.isDeleted) {
      throw new NotFoundException('El documento no está disponible');
    }

    // 3. Validate: not expired
    if (shareLink.expiresAt && new Date() > shareLink.expiresAt) {
      throw new GoneException('El enlace de descarga ha expirado');
    }

    // 4. Validate: maxDownloads not reached
    if (
      shareLink.maxDownloads !== null &&
      shareLink.downloadCount >= shareLink.maxDownloads
    ) {
      throw new GoneException(
        'El enlace de descarga ha alcanzado el límite de descargas',
      );
    }

    // 5. Increment downloadCount atomically
    await this.prisma.admin.shareLink.update({
      where: { id: shareLink.id },
      data: { downloadCount: { increment: 1 } },
    });

    this.logger.log(
      `Downloaded: ${shareLink.documento.filename} (token: ${token.slice(0, 12)}..., count: ${shareLink.downloadCount + 1})`,
    );

    // 6. Stream the file
    const storageFile = await this.storageService.get(
      shareLink.documento.storageKey,
    );

    res.setHeader('Content-Type', shareLink.documento.mimeType);
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${shareLink.documento.filename}"`,
    );

    storageFile.stream.pipe(res);
  }
}
