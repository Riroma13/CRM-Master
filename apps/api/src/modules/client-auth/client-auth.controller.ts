import {
  Controller, Post, Get, Body, Req, Res, UseGuards,
  HttpCode, HttpStatus, UnauthorizedException, ForbiddenException,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Request, Response } from 'express';
import { ClientAuthService } from './client-auth.service';
import { ClientLoginDto } from './dto/client-auth.dto';
import { Public } from '../../common/decorators/public.decorator';
import { ClientAuthGuard } from './client-auth.guard';

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: true,
  sameSite: 'lax' as const,
  path: '/',
  maxAge: 7 * 24 * 60 * 60 * 1000,
};

@ApiTags('Client Auth')
@Controller('api/v1/client')
export class ClientAuthController {
  constructor(private readonly clientAuthService: ClientAuthService) {}

  @Public()
  @Post('auth/login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Client login — sets __Secure-client-session cookie' })
  async login(@Body() dto: ClientLoginDto, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const tenantId = (req as any).tenantId;
    if (!tenantId) {
      throw new ForbiddenException('No se pudo resolver el tenant');
    }

    const result = await this.clientAuthService.login(dto, tenantId);

    res.cookie(
      ClientAuthService.COOKIE_NAME,
      result.token,
      COOKIE_OPTIONS,
    );

    return {
      clientUser: result.clientUser,
      cliente: result.cliente,
    };
  }

  @Public()
  @Post('auth/logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Client logout — clears cookie' })
  async logout(@Res({ passthrough: true }) res: Response) {
    res.clearCookie(ClientAuthService.COOKIE_NAME, { path: '/' });
    return;
  }

  @UseGuards(ClientAuthGuard)
  @Get('me')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get client profile from cookie' })
  async me(@Req() req: Request) {
    const clientUserId = (req as any).clientUserId;
    if (!clientUserId) {
      throw new UnauthorizedException('No autenticado');
    }

    const result = await this.clientAuthService.getMe(clientUserId);
    if (!result) {
      throw new UnauthorizedException('Usuario no encontrado');
    }

    return result;
  }
}
