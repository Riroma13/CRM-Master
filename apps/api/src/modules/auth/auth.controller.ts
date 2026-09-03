import {
  Controller, Post, Get, Body, UseGuards,
  HttpCode, HttpStatus, ConflictException, Req, Res,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Request } from 'express';
import { AuthService } from './auth.service';
import { TenantsService } from '../tenants/tenants.service';
import { Public } from '../../common/decorators/public.decorator';
import { randomBytes } from 'crypto';
import { AUTH_SESSION_TOKEN } from './auth.service';

const SESSION_COOKIE = '__Secure-better-auth.session_token';

function readSessionToken(cookie: string | undefined): string | null {
  return cookie?.split(';').map(value => value.trim()).find(value => value.startsWith(`${SESSION_COOKIE}=`))?.slice(SESSION_COOKIE.length + 1) || null;
}

@ApiTags('Auth')
@Controller('api/v1/auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly tenantsService: TenantsService,
  ) {}

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Iniciar sesión por email + password' })
  async login(@Body() body: any, @Res({ passthrough: true }) response: any, @Req() request: Request) {
    const result = await this.authService.login(body, (request as any)?.hostTenantId);
    const token = (result as any)[AUTH_SESSION_TOKEN];
    if (response?.cookie) {
      response.cookie(SESSION_COOKIE, token || '', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        ...(process.env.NODE_ENV === 'production' ? { domain: '.crmmaster.com' } : {}),
      });
    }
    return result;
  }

  @Public()
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Registrar nuevo tenant con admin' })
  async register(@Body() body: any) {
    const { email, password, name, businessName } = body;
    if (!email || !password || !name) {
      throw new ConflictException('Email, contraseña y nombre son requeridos');
    }

    const slug = (businessName || name)
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, '-')
      .replace(/--+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 40) || `user-${randomBytes(4).toString('hex')}`;

    const result = await this.tenantsService.create({
      slug,
      name: businessName || `${name}'s Business`,
      adminEmail: email,
      adminName: name,
    });

    // Store password hash with bcrypt
    const bcrypt = await import('bcryptjs');
    const passwordHash = bcrypt.hashSync(password, 10);
    await this.tenantsService.updatePassword(email, passwordHash);

    return result;
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Cerrar sesión' })
  async logout(@Req() request: Request, @Res({ passthrough: true }) response: any) {
    await this.authService.logout(readSessionToken(request.headers.cookie));
    response.clearCookie(SESSION_COOKIE, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      ...(process.env.NODE_ENV === 'production' ? { domain: '.crmmaster.com' } : {}),
    });
    return;
  }
}
