import {
  Controller, Post, Get, Body, UseGuards,
  HttpCode, HttpStatus, ConflictException, Req,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Request } from 'express';
import { AuthService } from './auth.service';
import { TenantsService } from '../tenants/tenants.service';
import { randomBytes } from 'crypto';

@ApiTags('Auth')
@Controller('api/v1/auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly tenantsService: TenantsService,
  ) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Iniciar sesión (tenant resuelto por subdominio)' })
  async login(@Body() body: any) {
    return this.authService.login(body);
  }

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

    return this.tenantsService.create({
      slug,
      name: businessName || `${name}'s Business`,
      adminEmail: email,
      adminName: name,
    });
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Cerrar sesión' })
  async logout() {
    return;
  }
}
