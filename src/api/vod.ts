import { logger } from '../logging/logger';

// Client for the local server proxy in front of the Kaltura VOD Avatar Studio
// API (KS token stays server-side). Endpoints per the VOD Avatar Studio docs.

export interface AvatarTemplate {
  id: string;
  name: string;
}

export interface VodAvatar {
  id: string;
  templateId: string;
  background:
    | { type: 'color'; color: string }
    | { type: 'library'; id: string }
    | { type: 'entry'; entryId: string };
  createdAt?: string;
  updatedAt?: string;
}

export interface TemplatesResult {
  objects: AvatarTemplate[];
  totalCount: number;
  live: boolean; // false when served from the built-in fallback (no KS configured)
}

export async function listAvatarTemplates(): Promise<TemplatesResult> {
  const res = await fetch('/api/avatars/templates', { method: 'POST' });
  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    logger.log({
      level: 'error',
      source: 'vod-api',
      event: 'templates-list-failed',
      message: `avatarTemplate/list proxy returned ${res.status}`,
      data: { status: res.status, detail },
    });
    throw new Error(`Template list failed (${res.status})`);
  }
  return res.json();
}

export async function upsertAvatar(templateId: string, background: VodAvatar['background']): Promise<VodAvatar> {
  const res = await fetch('/api/avatars/upsert', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ templateId, background }),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    logger.log({
      level: 'error',
      source: 'vod-api',
      event: 'avatar-upsert-failed',
      message: `avatar/upsert proxy returned ${res.status}`,
      data: { status: res.status, templateId, detail },
    });
    throw new Error(`Avatar upsert failed (${res.status})`);
  }
  return res.json();
}

export function avatarPreviewUrl(avatarId: string): string {
  return `/api/avatars/${encodeURIComponent(avatarId)}/preview`;
}
