export interface CompiledTemplate {
  id: string;
}

export interface TemplateRenderer {
  compile(template: string): CompiledTemplate;
  render(compiled: CompiledTemplate, variables: Record<string, unknown>): string;
}

export interface SecureTemplateRenderer extends TemplateRenderer {
  readonly allowedHelpers: string[];
  readonly allowedProperties: string[];
}
