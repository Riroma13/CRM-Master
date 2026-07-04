import { IS_PUBLIC_KEY, Public } from './public.decorator';

describe('@Public() decorator', () => {
  it('should set isPublic metadata to true on a class', () => {
    @Public()
    class TestController {}

    const isPublic = Reflect.getMetadata(IS_PUBLIC_KEY, TestController);
    expect(isPublic).toBe(true);
  });

  it('should set isPublic metadata to true on a method', () => {
    class TestController {
      @Public()
      handler() {}
    }

    // NestJS SetMetadata stores on descriptor.value for methods
    const isPublic = Reflect.getMetadata(
      IS_PUBLIC_KEY,
      TestController.prototype.handler,
    );
    expect(isPublic).toBe(true);
  });

  it('should allow Reflector.getAllAndOverride to find it by handler then class', () => {
    // This mirrors how TenantScopeGuard.reflector.getAllAndOverride works
    const { Reflector } = require('@nestjs/core');
    const reflector = new Reflector();

    @Public()
    class PublicController {
      handler() {}
    }

    const found = reflector.getAllAndOverride(IS_PUBLIC_KEY, [
      PublicController.prototype.handler,
      PublicController,
    ]);
    expect(found).toBe(true);
  });

  it('should not set metadata on undecorated classes', () => {
    class TestController {}

    const isPublic = Reflect.getMetadata(IS_PUBLIC_KEY, TestController);
    expect(isPublic).toBeUndefined();
  });
});
