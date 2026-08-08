import {
  Injectable,
  NestMiddleware,
  Logger,
  HttpException,
} from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { PrismaService } from '../prisma.service';

const RESERVED_SLUGS = new Set([
  'www', 'api', 'admin', 'app', 'mail', 'ftp', 'crmmaster',
  'mission-control', 'help', 'support', 'docs', 'status',
  'billing', 'login', 'signup', 'staging', 'dev', 'test',
]);

@Injectable()
export class TenantResolveMiddleware implements NestMiddleware {
  private readonly logger = new Logger(TenantResolveMiddleware.name);
  private cache = new Map<
    string,
    { tenantId: string; isActive: boolean }
  >();
  private readonly CACHE_TTL_MS = 60_000;

  constructor(private readonly prisma: PrismaService) {}

  async use(req: Request, _res: Response, next: NextFunction) {
    const hostHeader = req.headers.host;
    const forwardedHost = req.headers['x-forwarded-host'];
    if (Array.isArray(hostHeader) || Array.isArray(forwardedHost)) {
      throw new HttpException('Ambiguous Host header', 400);
    }
    const host = hostHeader || '';
    if (forwardedHost && forwardedHost !== host) {
      throw new HttpException('Conflicting proxy Host header', 400);
    }
    const slug = this.extractSlug(host);

    // Sin slug → request a admin-web (Mission Control)
    if (!slug || RESERVED_SLUGS.has(slug)) {
      // En desarrollo, las rutas de tenant usan el primer tenant por defecto
      const path = req.originalUrl || req.path || '';
      if (process.env.NODE_ENV === 'development' && path.includes('/tenant/')) {
        const devTenant = await this.prisma.admin.tenant.findFirst({
          orderBy: { createdAt: 'asc' },
        });
        if (devTenant) {
           this.setTenantContext(req, devTenant.id, devTenant.slug);
          return next();
        }
      }
      (req as any).isAdminRequest = true;
      return next();
    }

    const cached = this.cache.get(slug);
    if (cached) {
      if (!cached.isActive) {
        throw new HttpException('Tenant desactivado', 403);
      }
       this.setTenantContext(req, cached.tenantId, slug);
      return next();
    }

    // Cache miss — query DB
    const tenant = await this.prisma.admin.tenant.findUnique({
      where: { slug },
    });

    if (!tenant) {
      throw new HttpException('Tenant not found', 404);
    }

    const entry = {
      tenantId: tenant.id,
      isActive: tenant.isActive ?? true,
    };
    this.cache.set(slug, entry);

    // Auto-expire cache entry after TTL
    setTimeout(() => {
      this.cache.delete(slug);
    }, this.CACHE_TTL_MS);

    if (!entry.isActive) {
      throw new HttpException('Tenant desactivado', 403);
    }

    this.setTenantContext(req, entry.tenantId, slug);
    next();
  }

  private extractSlug(host: string): string | null {
    // Extrae el primer segmento del subdominio
    // "asesoria-garcia.crmmaster.com" → "asesoria-garcia"
    // "localhost:3000" → null
    if (!host) return null;
    if (host === 'crmmaster.com' || /^localhost(?::\d+)?$/.test(host)) return null;
    const match = host.match(/^([a-z0-9][a-z0-9-]*)\.crmmaster\.com(?::\d+)?$/);
    if (!match) throw new HttpException('Malformed Host header', 400);
    return match[1];
  }

  private setTenantContext(req: Request, tenantId: string, tenantSlug: string) {
    const request = req as any;
    if (request.hostTenantId && request.hostTenantId !== tenantId) {
      throw new HttpException('Host tenant context cannot be overwritten', 400);
    }
    if (request.hostTenantSlug && request.hostTenantSlug !== tenantSlug) {
      throw new HttpException('Host tenant context cannot be overwritten', 400);
    }
    request.hostTenantId ??= tenantId;
    request.hostTenantSlug ??= tenantSlug;
    request.tenantId = tenantId;
    request.tenantSlug = tenantSlug;
  }

  invalidateCache(slug: string) {
    this.cache.delete(slug);
  }
}
