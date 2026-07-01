import { Injectable, NestMiddleware, Logger, UnauthorizedException } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

const RESERVED_SLUGS = new Set([
  'www', 'api', 'admin', 'app', 'mail', 'ftp', 'crmmaster',
  'mission-control', 'help', 'support', 'docs', 'status',
  'billing', 'login', 'signup', 'staging', 'dev', 'test',
]);

@Injectable()
export class TenantResolveMiddleware implements NestMiddleware {
  private readonly logger = new Logger(TenantResolveMiddleware.name);
  private cache = new Map<string, { tenantId: string; isActive: boolean }>();

  async use(req: Request, _res: Response, next: NextFunction) {
    const host = req.headers.host || '';
    const slug = this.extractSlug(host);

    // Sin slug → request a admin-web (Mission Control)
    if (!slug || RESERVED_SLUGS.has(slug)) {
      (req as any).isAdminRequest = true;
      return next();
    }

    const cached = this.cache.get(slug);
    if (cached) {
      if (!cached.isActive) {
        throw new UnauthorizedException('Tenant desactivado');
      }
      (req as any).tenantId = cached.tenantId;
      (req as any).tenantSlug = slug;
      return next();
    }

    // Esto se reemplazará con inyección de PrismaService cuando esté disponible
    // Por ahora el middleware se completa con el PrismaService real
    (req as any).tenantSlug = slug;
    next();
  }

  private extractSlug(host: string): string | null {
    // Extrae el primer segmento del subdominio
    // "asesoria-garcia.crmmaster.com" → "asesoria-garcia"
    // "localhost:3000" → null
    const match = host.match(/^([a-z0-9][a-z0-9-]*)\./);
    return match ? match[1] : null;
  }

  invalidateCache(slug: string) {
    this.cache.delete(slug);
  }
}
