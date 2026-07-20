import { SecureTemplateRendererImpl } from '../secure-template-renderer';

describe('SecureTemplateRenderer', () => {
  let renderer: SecureTemplateRendererImpl;

  beforeEach(() => { renderer = new SecureTemplateRendererImpl(); });

  it('should render variables', () => {
    const compiled = renderer.compile('Hola {{nombre}}');
    const result = renderer.render(compiled, { nombre: 'Juan' });
    expect(result).toBe('Hola Juan');
  });

  it('should keep unreplaced variables when variable missing', () => {
    const compiled = renderer.compile('Hola {{nombre}}');
    const result = renderer.render(compiled, {});
    expect(result).toBe('Hola {{nombre}}');
  });

  it('should throw on prototype access', () => {
    expect(() => renderer.compile('{{__proto__}}')).toThrow();
  });

  it('should throw on constructor access', () => {
    expect(() => renderer.compile('{{constructor}}')).toThrow();
  });

  it('should block forbidden variable names in render', () => {
    const compiled = renderer.compile('Bienvenido {{nombre}}');
    const result = renderer.render(compiled, { __proto__: 'hack' });
    expect(result).toBe('Bienvenido {{nombre}}');  // __proto__ not in allowed list
  });
});
