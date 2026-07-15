import { useEffect, useRef, useState } from 'react';
import type { AvatarAdapter } from '../sdk/adapter';
import { SocketAdapter } from '../sdk/socketAdapter';
import { IframeAdapter } from '../sdk/iframeAdapter';
import { MockAdapter } from '../sdk/mockAdapter';
import { logger } from '../logging/logger';
import { SDK_ERROR_CODES, type FlowConfig, type SdkError, type TranscriptEntry } from '../sdk/types';
import Transcript from './Transcript';
import EventConsole, { type ConsoleEntry } from './EventConsole';

type PanelMode = 'socket' | 'iframe';

interface Props {
  flow: FlowConfig;
  panelMode: PanelMode;
}

// One side of the side-by-side demo: video container, lifecycle controls,
// transcript, event console, error simulation. Falls back to the mock
// adapter when the real SDK script isn't configured yet.
export default function AvatarPanel({ flow, panelMode }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const adapterRef = useRef<AvatarAdapter | null>(null);
  const [state, setState] = useState('uninitialized');
  const [speaking, setSpeaking] = useState(false);
  const [muted, setMuted] = useState(false);
  const [usingMock, setUsingMock] = useState(false);
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);
  const [events, setEvents] = useState<ConsoleEntry[]>([]);
  const [text, setText] = useState('');

  const source = usingMock ? 'mock' : panelMode;

  const pushEvent = (name: string, payload: unknown) => {
    setEvents((prev) => [...prev.slice(-199), { ts: Date.now(), name, payload }]);
  };

  const wire = (adapter: AvatarAdapter) => {
    // The 'raw' listener sees every event (the emitter mirrors named events
    // into it), so it is the single writer to the event console.
    adapter.on('raw', (p) => {
      const { event, payload } = p as { event: string; payload: unknown };
      pushEvent(event, payload);
    });
    adapter.on('state-change', (p) => {
      const { from, to } = p as { from: string; to: string };
      setState(to);
      logger.log({
        level: 'debug', source, event: 'state-change',
        message: `${from} -> ${to}`,
        sessionId: adapter.getSessionId(), flowId: flow.flowId,
      });
    });
    adapter.on('ready', () => {
      logger.log({
        level: 'info', source, event: 'ready', message: 'Avatar ready',
        sessionId: adapter.getSessionId(), flowId: flow.flowId,
      });
    });
    adapter.on('avatar-speaking-start', () => setSpeaking(true));
    adapter.on('avatar-speaking-end', () => setSpeaking(false));
    adapter.on('transcript-entry', (p) => {
      setTranscript((prev) => [...prev, p as TranscriptEntry]);
    });
    adapter.on('audio-fallback', () => {
      logger.log({
        level: 'warn', source, event: 'audio-fallback',
        message: 'Video negotiation failed; degraded to audio-only',
        sessionId: adapter.getSessionId(), flowId: flow.flowId,
      });
    });
    adapter.on('mic-denied', () => {
      logger.log({
        level: 'warn', source, event: 'mic-denied',
        message: 'Microphone permission denied; text-only mode available',
        sessionId: adapter.getSessionId(), flowId: flow.flowId,
      });
    });
    adapter.on('disconnected', (p) => {
      setState('ended');
      logger.log({
        level: 'info', source, event: 'disconnected',
        message: `Disconnected: ${JSON.stringify(p ?? {})}`,
        sessionId: adapter.getSessionId(), flowId: flow.flowId,
      });
    });
    adapter.on('reconnecting', (p) => {
      logger.log({
        level: 'warn', source, event: 'reconnecting', message: 'Auto-reconnect attempt',
        sessionId: adapter.getSessionId(), flowId: flow.flowId, data: p,
      });
    });
    adapter.on('reconnected', () => {
      logger.log({
        level: 'info', source, event: 'reconnected', message: 'Connection re-established',
        sessionId: adapter.getSessionId(), flowId: flow.flowId,
      });
    });
    adapter.on('error', (p) => {
      const err = p as SdkError;
      const spec = SDK_ERROR_CODES[err.code];
      // recoverable -> warn (auto-reconnect will handle it); fatal -> error.
      logger.log({
        level: err.recoverable ? 'warn' : 'error',
        source,
        event: spec?.name ?? `SDK_ERROR_${err.code ?? 'UNKNOWN'}`,
        message: err.message ?? String(p),
        sessionId: adapter.getSessionId(),
        flowId: flow.flowId,
        data: err,
      });
    });
  };

  const connect = async () => {
    if (!containerRef.current || adapterRef.current) return;
    let adapter: AvatarAdapter;
    // SDK script URLs default to the official jsDelivr builds, so live mode
    // only needs the flow's credentials.
    const hasCredentials = flow.clientId && flow.flowId;
    if (hasCredentials) {
      adapter = panelMode === 'socket' ? new SocketAdapter(flow) : new IframeAdapter(flow);
      setUsingMock(false);
    } else {
      adapter = new MockAdapter();
      setUsingMock(true);
      logger.log({
        level: 'info', source: 'app', event: 'mock-fallback',
        message: `${panelMode} panel using mock adapter (Client ID / Flow ID missing)`,
        flowId: flow.flowId,
      });
    }
    adapterRef.current = adapter;
    wire(adapter);
    try {
      await adapter.connect(containerRef.current);
    } catch (err) {
      logger.log({
        level: 'error', source, event: 'connect-failed',
        message: err instanceof Error ? err.message : String(err),
        flowId: flow.flowId,
      });
      pushEvent('connect-failed', { message: String(err) });
      adapterRef.current = null;
    }
  };

  const disconnect = () => {
    adapterRef.current?.destroy();
    adapterRef.current = null;
    setState('ended');
    setSpeaking(false);
  };

  useEffect(() => () => adapterRef.current?.destroy(), []);
  // Reset panel when the selected flow changes.
  useEffect(() => {
    disconnect();
    setTranscript([]);
    setEvents([]);
    setState('uninitialized');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flow.id]);

  const send = () => {
    if (!text.trim()) return;
    adapterRef.current?.sendText(text.trim());
    setText('');
  };

  const toggleMute = () => {
    const a = adapterRef.current;
    if (!a) return;
    if (a.isMicMuted()) a.unmuteMic();
    else a.muteMic();
    setMuted(a.isMicMuted());
  };

  const simulate = (code: number) => {
    const a = adapterRef.current;
    if (a instanceof MockAdapter) a.simulateError(code);
  };

  const connected = adapterRef.current !== null && state !== 'ended';

  return (
    <section className="panel">
      <header className="panel-head">
        <h2>
          {panelMode === 'socket' ? 'Socket SDK' : 'Iframe SDK'}
          {usingMock && <span className="badge mock">mock</span>}
          {speaking && <span className="badge speaking">speaking</span>}
        </h2>
        <span className={`state state-${state}`}>{state}</span>
      </header>

      <div className="video-container" ref={containerRef}>
        {!connected && <div className="video-placeholder">Not connected</div>}
      </div>

      <div className="controls">
        {!connected ? (
          <button className="primary" onClick={connect}>Connect</button>
        ) : (
          <button onClick={disconnect}>End session</button>
        )}
        <button onClick={toggleMute} disabled={!connected}>
          {muted ? 'Unmute mic' : 'Mute mic'}
        </button>
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && send()}
          placeholder={panelMode === 'iframe' ? 'sendText: Socket SDK only' : 'Type to the avatar…'}
          disabled={!connected || panelMode === 'iframe'}
        />
        <button onClick={send} disabled={!connected || panelMode === 'iframe'}>Send</button>
      </div>

      {usingMock && connected && (
        <div className="simulate">
          <span>Simulate error:</span>
          <button onClick={() => simulate(1003)}>1003 connection lost</button>
          <button onClick={() => simulate(2004)}>2004 WebRTC failed</button>
          <button onClick={() => simulate(4002)}>4002 session expired</button>
          <button onClick={() => simulate(5003)}>5003 bad DPP</button>
        </div>
      )}

      <div className="panel-body">
        <Transcript entries={transcript} />
        <EventConsole entries={events} />
      </div>
    </section>
  );
}
