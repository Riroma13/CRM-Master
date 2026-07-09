import { Injectable } from '@nestjs/common';

export interface Announcement {
  id: string;
  message: string;
  createdAt: string;
  expiresAt?: string;
}

@Injectable()
export class AnnouncementsService {
  private announcements: Announcement[] = [];
  private nextId = 1;

  create(message: string, expiresInDays?: number) {
    const entry: Announcement = {
      id: `ann-${this.nextId++}`,
      message,
      createdAt: new Date().toISOString(),
      expiresAt: expiresInDays
        ? new Date(Date.now() + expiresInDays * 86400000).toISOString()
        : undefined,
    };
    this.announcements.push(entry);
    return entry;
  }

  getActive(): Announcement[] {
    const now = new Date();
    return this.announcements.filter((a) => !a.expiresAt || new Date(a.expiresAt) > now);
  }
}
