import { Injectable } from '@nestjs/common';
import { randomBytes } from 'crypto';

export interface SessionData {
  userId: string;
  email: string;
  name: string | null;
  tenantId: string;
  role: string;
  expiresAt: Date;
}

export interface CreateSessionInput {
  userId: string;
  email: string;
  name: string | null;
  tenantId: string;
  role: string;
}

const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

@Injectable()
export class SessionService {
  private readonly sessions = new Map<string, SessionData>();

  createSession(input: CreateSessionInput): string {
    const token = `sess_${randomBytes(32).toString('hex')}`;
    const expiresAt = new Date(Date.now() + SESSION_TTL_MS);

    this.sessions.set(token, {
      userId: input.userId,
      email: input.email,
      name: input.name,
      tenantId: input.tenantId,
      role: input.role,
      expiresAt,
    });

    return token;
  }

  validateSession(token: string): SessionData | null {
    const session = this.sessions.get(token);
    if (!session) return null;

    if (Date.now() > session.expiresAt.getTime()) {
      this.sessions.delete(token);
      return null;
    }

    return session;
  }

  destroySession(token: string): void {
    this.sessions.delete(token);
  }
}
