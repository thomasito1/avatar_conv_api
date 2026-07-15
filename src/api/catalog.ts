import { logger } from '../logging/logger';

// Client for the Conversational Avatar API via the local server proxy:
// catalog browsing and backend session creation (the KS stays server-side).

export interface CatalogVisualAttributes {
  name: string;
  background?: string;
  genderPresentation?: string;
  skinTone?: string;
  ageGroup?: string;
  hairColor?: string;
  hairStyle?: string[];
  clothing?: string[];
  glasses?: boolean;
}

export interface CatalogVoiceAttributes {
  name: string;
  description?: string;
  language?: string;
}

export interface CatalogItem {
  itemId: string;
  type: 'Visual' | 'Voice';
  attributes: { visual?: CatalogVisualAttributes; voice?: CatalogVoiceAttributes };
  imageUrl?: string;
  loadingVideo?: string;
  voiceSampleUrl?: string;
  createdBy?: string;
  createdAt?: string;
}

export interface AvatarSessionCredentials {
  sessionId: string;
  token: string;
}

export async function listCatalog(type: 'Visual' | 'Voice'): Promise<CatalogItem[]> {
  const res = await fetch('/api/catalog/list', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type }),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    logger.log({
      level: 'error',
      source: 'avatar-api',
      event: 'catalog-list-failed',
      message: `catalog-item/list (${type}) returned ${res.status}`,
      data: { status: res.status, detail: detail.slice(0, 300) },
    });
    throw new Error(`Catalog ${type} list failed (${res.status})`);
  }
  const data = await res.json();
  return data.objects ?? [];
}

export async function createAvatarSession(
  visualId: string,
  voiceId?: string,
  language?: string
): Promise<AvatarSessionCredentials> {
  const res = await fetch('/api/avatar-session/create', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ visualId, voiceId, language }),
  });
  const text = await res.text();
  let data: Record<string, unknown> = {};
  try {
    data = JSON.parse(text);
  } catch {
    // non-JSON error body; keep raw text for the log below
  }
  if (!res.ok || !data.sessionId || !data.token) {
    const message =
      (data.error as string) ?? `avatar-session/create returned ${res.status}: ${text.slice(0, 200)}`;
    logger.log({
      level: 'error',
      source: 'avatar-api',
      event: 'session-create-failed',
      message,
      data: { status: res.status, visualId, voiceId },
    });
    throw new Error(message);
  }
  logger.log({
    level: 'info',
    source: 'avatar-api',
    event: 'session-created',
    message: `Avatar session created`,
    sessionId: data.sessionId as string,
    data: { visualId, voiceId },
  });
  return { sessionId: data.sessionId as string, token: data.token as string };
}

// Ends a session through the server proxy — the safety net for sessions that
// were created but whose SDK init never completed in the browser.
export async function endAvatarSessionViaProxy(creds: AvatarSessionCredentials): Promise<void> {
  try {
    await fetch('/api/avatar-session/end', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(creds),
      keepalive: true,
    });
    logger.log({
      level: 'info',
      source: 'avatar-api',
      event: 'session-ended-via-proxy',
      message: 'Orphaned session ended through the server',
      sessionId: creds.sessionId,
    });
  } catch {
    // best effort — the server also logs failures
  }
}
