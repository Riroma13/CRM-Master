import { Injectable, Logger } from '@nestjs/common';
import type { CompiledTemplate, SecureTemplateRenderer } from '@shared/communication';

const ALLOWED_HELPERS: string[] = ['eq', 'ne', 'lt', 'gt', 'and', 'or', 'not', 'default'];
const ALLOWED_PROPERTIES: string[] = [
  'nombre', 'name', 'email', 'phone', 'telefono',
  'cliente', 'tenant', 'fecha', 'date', 'time',
  'mensaje', 'message', 'body', 'subject',
  'link', 'url', 'button', 'action',
];

@Injectable()
export class SecureTemplateRendererImpl implements SecureTemplateRenderer {
  readonly allowedHelpers = ALLOWED_HELPERS;
  readonly allowedProperties = ALLOWED_PROPERTIES;
  private readonly logger = new Logger(SecureTemplateRendererImpl.name);
  private cache = new Map<string, any>();

  compile(template: string): CompiledTemplate {
    const id = `tmpl-${template.length}-${Date.now()}`;
    if (this.cache.has(template)) {
      return this.cache.get(template);
    }

    // Validate template for forbidden patterns
    this.validateTemplate(template);

    const compiled: CompiledTemplate = { id };
    this.cache.set(template, compiled);
    return compiled;
  }

  render(compiled: CompiledTemplate, variables: Record<string, unknown>): string {
    // Simple variable interpolation without Handlebars to avoid prototype access
    let output = this.cache.get(compiled.id)?.raw || '';
    if (!output) {
      // Fallback: reverse lookup
      for (const [tmpl, cached] of this.cache.entries()) {
        if (cached.id === compiled.id) {
          output = tmpl;
          break;
        }
      }
    }

    return output.replace(/\{\{(\w+)\}\}/g, (_match: string, varName: string) => {
      if (!ALLOWED_PROPERTIES.includes(varName)) {
        this.logger.warn(`Blocked variable "${varName}" — not in allowed list`);
        return `{{${varName}}}`;
      }
      const value = variables[varName];
      return value != null ? String(value) : `{{${varName}}}`;
    });
  }

  private validateTemplate(template: string): void {
    const forbidden = [
      /__proto__/,
      /prototype/,
      /constructor/,
      /globalThis/,
      /process\./,
      /require\s*\(/,
      /eval\s*\(/,
      /Function\s*\(/,
    ];

    for (const pattern of forbidden) {
      if (pattern.test(template)) {
        throw new Error(`Template contains forbidden pattern: ${pattern}`);
      }
    }
  }
}
