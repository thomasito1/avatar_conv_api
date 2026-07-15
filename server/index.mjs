// Local API proxy:
//  - fronts the Kaltura VOD Avatar Studio API so the KS token never reaches
//    the browser (avatarTemplate/list, avatar/upsert, avatar/preview)
//  - collects client-side streaming logs shipped by the browser logger.

import express from 'express';
import { mkdirSync, appendFileSync } from 'node:fs';
import path from 'node:path';

const PORT = Number(process.env.PORT || 8787);
const REGION = process.env.KALTURA_REGION || 'nvp1';
const STATIC_KS = process.env.KALTURA_KS || '';
const PARTNER_ID = process.env.KALTURA_PARTNER_ID || '';
const ADMIN_SECRET = process.env.KALTURA_ADMIN_SECRET || '';
const VOD_BASE = `https://video-avatar.${REGION}.ovp.kaltura.com/api/v1`;
const SESSION_API = 'https://www.kaltura.com/api_v3/service/session/action/start';
const KS_TTL_SECONDS = 86400;

const LOG_DIR = path.resolve('logs');
mkdirSync(LOG_DIR, { recursive: true });
const CLIENT_LOG = path.join(LOG_DIR, 'client-streaming.log');

const app = express();
app.use(express.json({ limit: '1mb' }));
// sendBeacon may post without an explicit JSON content type.
app.use(express.text({ type: () => true, limit: '1mb' }));

// The documented 36 presenter templates, used as a fallback gallery when no
// KS is configured so the admin panel still demos end-to-end.
const FALLBACK_TEMPLATES = [
  'adam', 'amir', 'ben', 'cristina', 'david', 'derek', 'dylan', 'elizabeth',
  'gloria', 'harper', 'harry', 'henry', 'james', 'jane', 'jason', 'jennifer',
  'julia', 'kevin', 'larry', 'lisa', 'maria', 'maya', 'mia', 'miguel', 'ming',
  'rita', 'sam', 'sara', 'sharon', 'sophia', 'taylor', 'theodore', 'tim',
  'victoria', 'william', 'yasmin',
].map((id) => ({ id, name: id.charAt(0).toUpperCase() + id.slice(1) }));

// A static KS from .env wins; otherwise mint an admin KS from the partner
// id + admin secret via session.start and cache it until close to expiry.
let mintedKs = '';
let mintedKsExpiresAt = 0;

function hasCredentials() {
  return Boolean(STATIC_KS || (PARTNER_ID && ADMIN_SECRET));
}

async function mintKs() {
  const res = await fetch(SESSION_API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      secret: ADMIN_SECRET,
      userId: 'avatar-demo-admin',
      type: 2, // admin session
      partnerId: Number(PARTNER_ID),
      expiry: KS_TTL_SECONDS,
      format: 1, // JSON
    }),
  });
  const data = await res.json();
  if (typeof data !== 'string') {
    throw new Error(`session.start failed: ${JSON.stringify(data)}`);
  }
  mintedKs = data;
  // Refresh an hour before the KS actually expires.
  mintedKsExpiresAt = Date.now() + (KS_TTL_SECONDS - 3600) * 1000;
  console.log('[auth] minted admin KS via session.start');
  return mintedKs;
}

async function getKs(forceRefresh = false) {
  if (STATIC_KS) return STATIC_KS;
  if (!PARTNER_ID || !ADMIN_SECRET) return '';
  if (!forceRefresh && mintedKs && Date.now() < mintedKsExpiresAt) return mintedKs;
  return mintKs();
}

async function kaltura(pathname, body) {
  const ks = await getKs();
  const call = (token) =>
    fetch(`${VOD_BASE}/${pathname}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body ?? {}),
    });
  let res = await call(ks);
  // A minted KS may have been invalidated upstream — re-mint once and retry.
  if ((res.status === 401 || res.status === 403) && !STATIC_KS && PARTNER_ID && ADMIN_SECRET) {
    res = await call(await getKs(true));
  }
  return res;
}

app.post('/api/avatars/templates', async (_req, res) => {
  if (!hasCredentials()) {
    res.json({ objects: FALLBACK_TEMPLATES, totalCount: FALLBACK_TEMPLATES.length, live: false });
    return;
  }
  try {
    const upstream = await kaltura('avatarTemplate/list', {});
    if (!upstream.ok) {
      const detail = await upstream.text();
      console.error(`[vod] avatarTemplate/list -> ${upstream.status}: ${detail}`);
      res.status(upstream.status).send(detail);
      return;
    }
    const data = await upstream.json();
    res.json({ ...data, live: true });
  } catch (err) {
    console.error('[vod] avatarTemplate/list failed:', err);
    res.status(502).json({ error: 'Upstream request failed' });
  }
});

app.post('/api/avatars/upsert', async (req, res) => {
  if (!hasCredentials()) {
    res.status(501).json({ error: 'Kaltura credentials not configured — set KALTURA_KS or KALTURA_PARTNER_ID + KALTURA_ADMIN_SECRET in .env.' });
    return;
  }
  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const upstream = await kaltura('avatar/upsert', body);
    const text = await upstream.text();
    res.status(upstream.status).type('application/json').send(text);
  } catch (err) {
    console.error('[vod] avatar/upsert failed:', err);
    res.status(502).json({ error: 'Upstream request failed' });
  }
});

app.get('/api/avatars/:id/preview', async (req, res) => {
  if (!hasCredentials()) {
    res.status(501).json({ error: 'Kaltura credentials not configured' });
    return;
  }
  try {
    const upstream = await kaltura('avatar/preview', { id: req.params.id });
    if (!upstream.ok) {
      res.status(upstream.status).send(await upstream.text());
      return;
    }
    res.type('image/png');
    res.send(Buffer.from(await upstream.arrayBuffer()));
  } catch (err) {
    console.error('[vod] avatar/preview failed:', err);
    res.status(502).json({ error: 'Upstream request failed' });
  }
});

// ---- Conversational Avatar API (docs.kaltura.com/models) ----
// Catalog listing + backend session creation per the recommended production
// pattern: the KS never reaches the browser; the client gets only the
// short-lived { sessionId, token } pair.

const AVATAR_API_BASE = process.env.KALTURA_AVATAR_API || 'https://api.avatar.us.kaltura.ai';

async function avatarApi(pathname, body, authHeader) {
  const headers = { 'Content-Type': 'application/json' };
  if (authHeader) {
    headers.Authorization = authHeader;
  } else {
    headers.Authorization = `ks ${await getKs()}`;
  }
  return fetch(`${AVATAR_API_BASE}${pathname}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body ?? {}),
  });
}

app.post('/api/catalog/list', async (req, res) => {
  if (!hasCredentials()) {
    res.status(501).json({ error: 'Kaltura credentials not configured in .env' });
    return;
  }
  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const type = body?.type === 'Voice' ? 'Voice' : 'Visual';
    const upstream = await avatarApi('/v1/catalog-item/list', {
      filter: { typeEqual: type },
      pager: { offset: 0, limit: 100 },
      orderBy: '-createdAt',
    });
    const text = await upstream.text();
    res.status(upstream.status).type('application/json').send(text);
  } catch (err) {
    console.error('[avatar] catalog list failed:', err);
    res.status(502).json({ error: 'Upstream request failed' });
  }
});

app.post('/api/avatar-session/create', async (req, res) => {
  if (!hasCredentials()) {
    res.status(501).json({ error: 'Kaltura credentials not configured in .env' });
    return;
  }
  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const { visualId, voiceId, language } = body ?? {};
    if (!visualId) {
      res.status(400).json({ error: 'visualId is required' });
      return;
    }
    const payload = {
      clientId: 'kaltura-avatar-sdk',
      visualConfig: { id: visualId },
      ...(voiceId ? { voiceConfig: { id: voiceId, ...(language ? { language } : {}) } } : {}),
    };
    const upstream = await avatarApi('/v1/avatar-session/create', payload);
    const text = await upstream.text();
    if (!upstream.ok) {
      console.error(`[avatar] session create -> ${upstream.status}: ${text.slice(0, 300)}`);
    }
    res.status(upstream.status).type('application/json').send(text);
  } catch (err) {
    console.error('[avatar] session create failed:', err);
    res.status(502).json({ error: 'Upstream request failed' });
  }
});

// Client streaming-log collector (batched fetch + sendBeacon on pagehide).
app.post('/api/logs', (req, res) => {
  try {
    const payload = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const entries = Array.isArray(payload?.entries) ? payload.entries : [];
    for (const entry of entries) {
      appendFileSync(CLIENT_LOG, JSON.stringify(entry) + '\n');
      if (entry.level === 'error') {
        console.error(
          `[client:${entry.source}] ${entry.event} — ${entry.message}` +
            (entry.sessionId ? ` (session ${entry.sessionId})` : '')
        );
      }
    }
    res.status(204).end();
  } catch (err) {
    console.error('[logs] failed to persist batch:', err);
    res.status(400).json({ error: 'Bad log batch' });
  }
});

app.listen(PORT, () => {
  console.log(`[api] listening on http://localhost:${PORT}`);
  const auth = STATIC_KS
    ? 'static KS configured'
    : PARTNER_ID && ADMIN_SECRET
      ? `minting admin KS for partner ${PARTNER_ID}`
      : 'NO credentials — using fallback template list';
  console.log(`[api] VOD region ${REGION} (${VOD_BASE}) — ${auth}`);
  console.log(`[api] client streaming logs -> ${CLIENT_LOG}`);
});
