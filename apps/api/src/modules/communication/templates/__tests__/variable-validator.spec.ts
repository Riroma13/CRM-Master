import { VariableValidator } from '../variable-validator';

describe('VariableValidator', () => {
  const validator = new VariableValidator();
  const template = { id: 't1', tenantId: 't1', name: 'test', channel: 'email', body: '', variables: ['nombre', 'email'], isActive: true };

  it('should pass when all variables present', () => {
    const errors = validator.validate(template, { nombre: 'Juan', email: 'juan@test.com' });
    expect(errors).toHaveLength(0);
  });

  it('should fail when variable missing', () => {
    const errors = validator.validate(template, { nombre: 'Juan' });
    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain('email');
  });

  it('should fail when variable is empty string', () => {
    const errors = validator.validate(template, { nombre: 'Juan', email: '' });
    expect(errors).toHaveLength(1);
  });

  it('should report multiple missing variables', () => {
    const errors = validator.validate(template, {});
    expect(errors).toHaveLength(2);
  });
});
