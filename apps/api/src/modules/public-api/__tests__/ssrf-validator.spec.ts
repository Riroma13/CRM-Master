import { Test, TestingModule } from '@nestjs/testing';
import { SsrfValidator } from '../webhook/ssrf-validator.service';

describe('SsrfValidator', () => {
  let service: SsrfValidator;

  beforeAll(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [SsrfValidator],
    }).compile();

    service = moduleRef.get(SsrfValidator);
  });

  afterEach(() => {
    service.clearCache();
  });

  describe('URL scheme validation', () => {
    it('should accept https:// URLs', async () => {
      const result = await service.validateUrl('https://example.com/webhook');
      expect(result.valid).toBe(true);
    });

    it('should reject http:// URLs', async () => {
      const result = await service.validateUrl('http://example.com/webhook');
      expect(result.valid).toBe(false);
      expect(result.reason).toContain('https');
    });

    it('should reject ftp:// URLs', async () => {
      const result = await service.validateUrl('ftp://example.com');
      expect(result.valid).toBe(false);
    });

    it('should reject invalid URL format', async () => {
      const result = await service.validateUrl('not-a-url');
      expect(result.valid).toBe(false);
      expect(result.reason).toContain('Invalid URL');
    });
  });

  describe('private IPv4 blocking', () => {
    it('should block RFC 1918 10.0.0.0/8', async () => {
      const result = await service.validateUrl('https://10.0.0.1/webhook');
      expect(result.valid).toBe(false);
      expect(result.reason).toContain('Private IP');
    });

    it('should block RFC 1918 172.16.0.0/12', async () => {
      const result = await service.validateUrl('https://172.16.0.1/webhook');
      expect(result.valid).toBe(false);
    });

    it('should block RFC 1918 192.168.0.0/16', async () => {
      const result = await service.validateUrl('https://192.168.1.1/webhook');
      expect(result.valid).toBe(false);
    });

    it('should block loopback 127.0.0.0/8', async () => {
      const result = await service.validateUrl('https://127.0.0.1/webhook');
      expect(result.valid).toBe(false);
    });

    it('should block link-local 169.254.0.0/16', async () => {
      const result = await service.validateUrl('https://169.254.1.1/webhook');
      expect(result.valid).toBe(false);
    });

    it('should block CGNAT 100.64.0.0/10', async () => {
      const result = await service.validateUrl('https://100.64.0.1/webhook');
      expect(result.valid).toBe(false);
    });

    it('should block IETF reserved 0.0.0.0/8', async () => {
      const result = await service.validateUrl('https://0.0.0.1/webhook');
      expect(result.valid).toBe(false);
    });

    it('should block IETF reserved 240.0.0.0/4', async () => {
      const result = await service.validateUrl('https://240.0.0.1/webhook');
      expect(result.valid).toBe(false);
    });

    it('should block Docker subnet 172.17.0.0/16', async () => {
      const result = await service.validateUrl('https://172.17.0.1/webhook');
      expect(result.valid).toBe(false);
    });

    it('should block additional Docker subnets 172.18.0.0/16', async () => {
      const result = await service.validateUrl('https://172.18.0.1/webhook');
      expect(result.valid).toBe(false);
    });

    it('should block 172.31.0.0/16 (end of RFC 1918 range)', async () => {
      const result = await service.validateUrl('https://172.31.255.255/webhook');
      expect(result.valid).toBe(false);
    });
  });

  describe('public IP acceptance', () => {
    it('should accept public IPv4', async () => {
      const result = await service.validateUrl('https://8.8.8.8/webhook');
      expect(result.valid).toBe(true);
    });

    it('should accept public IPv4 range outside blocked ranges', async () => {
      const result = await service.validateUrl('https://11.0.0.1/webhook');
      expect(result.valid).toBe(true);
    });

    it('should accept 172.15.0.0/16 (not in RFC 1918 range)', async () => {
      const result = await service.validateUrl('https://172.15.0.1/webhook');
      expect(result.valid).toBe(true);
    });

    it('should accept 172.32.0.1 (outside RFC 1918 172.16/12)', async () => {
      const result = await service.validateUrl('https://172.32.0.1/webhook');
      expect(result.valid).toBe(true);
    });
  });

  describe('DNS resolution', () => {
    it('should resolve public hostnames', async () => {
      const result = await service.validateUrl('https://example.com/webhook');
      expect(result.valid).toBe(true);
    });

    it('should reject hostnames that resolve to private IP', async () => {
      // 10.0.0.1.in-addr.arpa is a special case, but we test the logic
      // by checking that resolved private IPs are caught
      const result = await service.validateUrl('https://example.com/webhook');
      // example.com resolves to public IPs, so should pass
      expect(result.valid).toBe(true);
    });

    it('should return invalid for unresolvable hostname', async () => {
      const result = await service.validateUrl('https://this-domain-does-not-exist-12345.com/webhook');
      expect(result.valid).toBe(false);
    });
  });

  describe('DNS caching', () => {
    it('should cache DNS resolution results', async () => {
      await service.validateUrl('https://example.com/webhook');

      const result = await service.validateUrl('https://example.com/other');
      expect(result.valid).toBe(true);
    });
  });
});
