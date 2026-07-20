import { Injectable } from '@nestjs/common';
import type { TemplateDefinition } from '@shared/communication';

@Injectable()
export class VariableValidator {
  validate(template: TemplateDefinition, variables: Record<string, unknown>): string[] {
    const errors: string[] = [];

    for (const requiredVar of template.variables) {
      const value = variables[requiredVar];
      if (value === undefined || value === null || value === '') {
        errors.push(`Missing required variable: "${requiredVar}"`);
      }
    }

    return errors;
  }

  validateAll(templates: TemplateDefinition[], allVariables: Record<string, unknown>): string[] {
    const allErrors: string[] = [];
    for (const template of templates) {
      const errors = this.validate(template, allVariables);
      allErrors.push(...errors);
    }
    return allErrors;
  }
}
