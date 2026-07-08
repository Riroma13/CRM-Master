import { createParamDecorator, ExecutionContext, BadRequestException } from '@nestjs/common';

/**
 * Custom parameter decorator that extracts the tenant ID from the request.
 * The tenant ID is resolved by TenantResolveMiddleware from the Host header.
 *
 * Usage:
 *   @Get('slots')
 *   async getSlots(@TenantId() tenantId: string) { ... }
 */
export const TenantId = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string => {
    const request = ctx.switchToHttp().getRequest();
    const tenantId = (request as any).tenantId;
    if (!tenantId) {
      throw new BadRequestException(
        'No se pudo resolver el tenant a partir del subdominio',
      );
    }
    return tenantId;
  },
);
