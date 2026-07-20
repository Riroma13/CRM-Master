import { Injectable, Logger } from '@nestjs/common';
import type { AiProvider } from '../../../../../../packages/shared/src/automation';

/**
 * ProviderRegistry — registro de proveedores de IA.
 *
 * Los providers se registran via inyección de dependencias.
 * Actions dependen de AiProvider, nunca de un proveedor concreto.
 * Añadir un nuevo provider = implementar AiProvider + registrar en el módulo.
 */
@Injectable()
export class ProviderRegistry {
  private readonly logger = new Logger(ProviderRegistry.name);
  private providers = new Map<string, AiProvider>();

  register(provider: AiProvider): void {
    this.providers.set(provider.id, provider);
    this.logger.log(`AI provider registered: ${provider.id}`);
  }

  getProvider(id: string): AiProvider | undefined {
    return this.providers.get(id);
  }

  getAvailableProviders(): string[] {
    return Array.from(this.providers.keys());
  }
}
