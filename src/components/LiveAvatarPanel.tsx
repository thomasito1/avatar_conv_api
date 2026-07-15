import { useEffect, useRef, useState } from 'react';
import { KalturaAvatarSession } from '@unisphere/models-sdk-js';
import { createAvatarSession, listCatalog, type CatalogItem } from '../api/catalog';
import { logger } from '../logging/logger';
import EventConsole, { type ConsoleEntry } from './EventConsole';

const AVATAR_API_BASE = 'https://api.avatar.us.kaltura.ai/';
const VIDEO_CONTAINER_ID = 'live-avatar-video';
const SELECTION_KEY = 'avatar-demo/catalog-selection';

export function getCatalogSelection(): { visualId?: string; voiceId?: string } {
  try {
    return JSON.parse(localStorage.getItem(SELECTION_KEY) ?? '{}');
  } catch {
    return {};
  }
}

export function setCatalogSelection(sel: { visualId?: string; voiceId?: string }): void {
  try {
    localStorage.setItem(SELECTION_KEY, JSON.stringify({ ...getCatalogSelection(), ...sel }));
  } catch {
    // non-persistent environment; selection just won't survive reloads
  }
}

// The real Conversational Avatar API demo: catalog-driven visual/voice pick,
// backend-created session (KS stays on the server), WebRTC video via
// @unisphere/models-sdk-js, sayText / interrupt / end controls.
export default function LiveAvatarPanel() {
  const sessionRef = useRef<KalturaAvatarSession | null>(null);
  const [visuals, setVisuals] = useState<CatalogItem[]>([]);
  const [voices, setVoices] = useState<CatalogItem[]>([]);
  const [visualId, setVisualId] = useState('');
  const [voiceId, setVoiceId] = useState('');
  const [sessionState, setSessionState] = useState('IDLE');
  const [connectionState, setConnectionState] = useState('DISCONNECTED');
  const [speaking, setSpeaking] = useState(false);
  const [busy, setBusy] = useState(false);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [sessionError, setSessionError] = useState<string | null>(null);
  const [events, setEvents] = useState<ConsoleEntry[]>([]);
  const [text, setText] = useState('');

  const pushEvent = (name: string, payload?: unknown) =>
    setEvents((prev) => [...prev.slice(-199), { ts: Date.now(), name, payload }]);

  useEffect(() => {
    Promise.all([listCatalog('Visual'), listCatalog('Voice')])
      .then(([vis, voi]) => {
        setVisuals(vis);
        setVoices(voi);
        const saved = getCatalogSelection();
        setVisualId(saved.visualId && vis.some((v) => v.itemId === saved.visualId) ? saved.visualId : vis[0]?.itemId ?? '');
        setVoiceId(saved.voiceId && voi.some((v) => v.itemId === saved.voiceId) ? saved.voiceId : voi[0]?.itemId ?? '');
      })
      .catch((e) => setCatalogError(e instanceof Error ? e.message : String(e)));
    return () => {
      sessionRef.current?.endSession().catch(() => undefined);
    };
  }, []);

  const start = async () => {
    if (!visualId || busy) return;
    setBusy(true);
    setSessionError(null);
    try {
      // Backend-created session: browser never sees the KS.
      const creds = await createAvatarSession(visualId, voiceId || undefined, 'en');
      pushEvent('session-created', { sessionId: creds.sessionId });

      const session = new KalturaAvatarSession({ baseUrl: AVATAR_API_BASE });
      sessionRef.current = session;
      session.on('stateChange', (state: unknown) => {
        setSessionState(String(state));
        pushEvent('stateChange', state);
        logger.log({
          level: 'debug', source: 'avatar-api', event: 'stateChange',
          message: String(state), sessionId: creds.sessionId,
        });
      });
      session.on('connectionChange', (state: unknown) => {
        setConnectionState(String(state));
        pushEvent('connectionChange', state);
        logger.log({
          level: 'debug', source: 'avatar-api', event: 'connectionChange',
          message: String(state), sessionId: creds.sessionId,
        });
      });
      session.on('speakingStart', () => {
        setSpeaking(true);
        pushEvent('speakingStart');
      });
      session.on('speakingEnd', () => {
        setSpeaking(false);
        pushEvent('speakingEnd');
      });
      session.on('error', (err: unknown) => {
        const e = err as { code?: string; message?: string };
        pushEvent('error', e);
        setSessionError(e.message ?? String(err));
        logger.log({
          level: 'error', source: 'avatar-api', event: e.code ?? 'AVATAR_ERROR',
          message: e.message ?? String(err), sessionId: creds.sessionId, data: e,
        });
      });

      await session.initSession(creds, { videoContainerId: VIDEO_CONTAINER_ID });
      pushEvent('initSession-complete', { sessionId: creds.sessionId });
      await session.sayText('Hello! Your Kaltura avatar session is live.');
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      setSessionError(message);
      pushEvent('start-failed', { message });
      sessionRef.current = null;
    } finally {
      setBusy(false);
    }
  };

  const say = async () => {
    if (!text.trim() || !sessionRef.current) return;
    const t = text.trim();
    setText('');
    pushEvent('sayText', { text: t });
    try {
      await sessionRef.current.sayText(t);
    } catch (e) {
      pushEvent('sayText-failed', { message: String(e) });
    }
  };

  const interrupt = () => {
    sessionRef.current?.interrupt().catch(() => undefined);
    pushEvent('interrupt');
  };

  const end = async () => {
    const s = sessionRef.current;
    sessionRef.current = null;
    setSessionState('ENDED');
    setConnectionState('DISCONNECTED');
    setSpeaking(false);
    pushEvent('endSession');
    await s?.endSession().catch(() => undefined);
  };

  const active = sessionRef.current !== null;
  const selectedVisual = visuals.find((v) => v.itemId === visualId);
  const selectedVoice = voices.find((v) => v.itemId === voiceId);

  return (
    <section className="panel live-panel">
      <header className="panel-head">
        <h2>
          Conversational API — live session
          {speaking && <span className="badge speaking">speaking</span>}
        </h2>
        <span className={`state state-${connectionState.toLowerCase()}`}>
          {sessionState} · {connectionState}
        </span>
      </header>

      {catalogError && (
        <div className="notice error">
          Catalog unavailable: {catalogError}. Start the API server (<code>npm run dev</code>) with
          Kaltura credentials in <code>.env</code>.
        </div>
      )}
      {sessionError && <div className="notice error">{sessionError}</div>}

      <div className="live-config">
        <label>
          Visual ({visuals.length})
          <select value={visualId} disabled={active} onChange={(e) => { setVisualId(e.target.value); setCatalogSelection({ visualId: e.target.value }); }}>
            {visuals.map((v) => (
              <option key={v.itemId} value={v.itemId}>
                {v.attributes.visual?.name ?? v.itemId}
              </option>
            ))}
          </select>
        </label>
        <label>
          Voice ({voices.length})
          <select value={voiceId} disabled={active} onChange={(e) => { setVoiceId(e.target.value); setCatalogSelection({ voiceId: e.target.value }); }}>
            <option value="">(default)</option>
            {voices.map((v) => (
              <option key={v.itemId} value={v.itemId}>
                {v.attributes.voice?.name ?? v.itemId} — {v.attributes.voice?.description ?? ''}
              </option>
            ))}
          </select>
        </label>
        {selectedVisual?.imageUrl && (
          <img className="visual-thumb" src={selectedVisual.imageUrl} alt={selectedVisual.attributes.visual?.name} />
        )}
      </div>

      <div className="video-container" id={VIDEO_CONTAINER_ID}>
        {!active && <div className="video-placeholder">No live session</div>}
      </div>

      <div className="controls">
        {!active ? (
          <button className="primary" onClick={start} disabled={busy || !visualId}>
            {busy ? 'Creating session…' : 'Start live session'}
          </button>
        ) : (
          <>
            <button onClick={end}>End session</button>
            <button onClick={interrupt}>Interrupt</button>
          </>
        )}
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && say()}
          placeholder={selectedVoice ? `Avatar speaks with ${selectedVoice.attributes.voice?.name}'s voice…` : 'Text for the avatar to speak…'}
          disabled={!active}
        />
        <button onClick={say} disabled={!active}>Say</button>
      </div>

      <EventConsole entries={events} />
    </section>
  );
}
