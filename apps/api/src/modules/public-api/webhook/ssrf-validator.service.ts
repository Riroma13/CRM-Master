import { Injectable, Logger } from '@nestjs/common';
import * as dns from 'dns';
import * as net from 'net';
import { promisify } from 'util';

const resolve4Async = promisify(dns.resolve4);
const resolve6Async = promisify(dns.resolve6);

export interface SsrfValidationResult {
  valid: boolean;
  reason?: string;
}

interface DnsCacheEntry {
  ips: string[];
  expiresAt: number;
}

@Injectable()
export class SsrfValidator {
  private readonly logger = new Logger(SsrfValidator.name);
  private readonly dnsCache = new Map<string, DnsCacheEntry>();
  private readonly DNS_CACHE_TTL_MS = 5 * 60 * 1000;

  async validateUrl(url: string): Promise<SsrfValidationResult> {
    let parsed: URL;
    try {
      parsed = new URL(url);
    } catch {
      return { valid: false, reason: 'Invalid URL format' };
    }

    if (parsed.protocol !== 'https:') {
      return { valid: false, reason: 'Only https:// URLs are allowed' };
    }

    const hostname = parsed.hostname;

    if (net.isIP(hostname)) {
      if (this.isPrivateIP(hostname)) {
        return { valid: false, reason: `Private IP address blocked: ${hostname}` };
      }
      return { valid: true };
    }

    const ips = await this.resolveHostname(hostname);
    if (ips.length === 0) {
      return { valid: false, reason: `Could not resolve hostname: ${hostname}` };
    }

    for (const ip of ips) {
      if (this.isPrivateIP(ip)) {
        return { valid: false, reason: `Resolved to private IP: ${ip}` };
      }
    }

    return { valid: true };
  }

  private async resolveHostname(hostname: string): Promise<string[]> {
    const cached = this.dnsCache.get(hostname);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.ips;
    }

    let ips: string[] = [];

    try {
      ips = await resolve4Async(hostname);
    } catch {
      try {
        const v6 = await resolve6Async(hostname);
        ips = v6;
      } catch {
        return [];
      }
    }

    this.dnsCache.set(hostname, {
      ips,
      expiresAt: Date.now() + this.DNS_CACHE_TTL_MS,
    });

    return ips;
  }

  private isPrivateIP(ip: string): boolean {
    if (ip === '::1') return true;

    const parts = ip.split('.').map(Number);
    if (parts.length !== 4) return false;

    if (parts[0] === 10) return true;
    if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true;
    if (parts[0] === 192 && parts[1] === 168) return true;
    if (parts[0] === 127) return true;
    if (parts[0] === 169 && parts[1] === 254) return true;
    if (parts[0] === 100 && parts[1] >= 64 && parts[1] <= 127) return true;
    if (parts[0] === 0) return true;
    if (parts[0] >= 240 && parts[0] <= 255) return true;
    if (parts[0] === 172 && parts[1] === 17) return true;

    return false;
  }

  clearCache(): void {
    this.dnsCache.clear();
  }
}
