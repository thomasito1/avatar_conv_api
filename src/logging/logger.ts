// Structured logger for streaming sessions:
//  - breadcrumb ring buffer of lifecycle events (context for errors)
//  - session/flow correlation ids on every entry
//  - batched shipping to the backend, flushed with sendBeacon on pagehide
//    so entries survive the tab closing mid-session.

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogEntry {
  ts: number;
  level: LogLevel;
  source: string; // 'socket' | 'iframe' | 'mock' | 'app' | 'vod-api'
  event: string;
  message: string;
  sessionId?: string | null;
  flowId?: string | null;
  data?: unknown;
  breadcrumbs?: LogEntry[]; // attached to error entries only
}

const BREADCRUMB_LIMIT = 25;
const FLUSH_INTERVAL_MS = 5000;
const ENDPOINT = '/api/logs';

type LogListener = (entry: LogEntry) => void;

class SessionLogger {
  private breadcrumbs: LogEntry[] = [];
  private queue: LogEntry[] = [];
  private listeners = new Set<LogListener>();
  private timer: number | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('pagehide', () => this.flush(true));
    }
  }

  log(entry: Omit<LogEntry, 'ts'>): void {
    const full: LogEntry = { ts: Date.now(), ...entry };

    if (full.level === 'error') {
      // Attach the trail that led here — e.g. WEBRTC_FAILED after three
      // `reconnecting` breadcrumbs reads as a network story, not config.
      full.breadcrumbs = [...this.breadcrumbs];
    } else {
      this.pushBreadcrumb(full);
    }

    this.queue.push(full);
    this.listeners.forEach((l) => l(full));
    this.scheduleFlush();

    const line = `[${full.source}] ${full.event}: ${full.message}`;
    if (full.level === 'error') console.error(line, full.data ?? '');
    else if (full.level === 'warn') console.warn(line, full.data ?? '');
  }

  subscribe(listener: LogListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  flush(useBeacon = false): void {
    if (!this.queue.length) return;
    const batch = this.queue.splice(0, this.queue.length);
    const body = JSON.stringify({ entries: batch });
    if (useBeacon && navigator.sendBeacon) {
      navigator.sendBeacon(ENDPOINT, new Blob([body], { type: 'application/json' }));
      return;
    }
    fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      keepalive: true,
    }).catch(() => {
      // Shipping is best-effort; re-queue once so a transient hiccup
      // doesn't drop the batch.
      this.queue.unshift(...batch.map((e) => ({ ...e, breadcrumbs: undefined })));
    });
  }

  private pushBreadcrumb(entry: LogEntry): void {
    this.breadcrumbs.push(entry);
    if (this.breadcrumbs.length > BREADCRUMB_LIMIT) this.breadcrumbs.shift();
  }

  private scheduleFlush(): void {
    if (this.timer !== null) return;
    this.timer = window.setTimeout(() => {
      this.timer = null;
      this.flush();
    }, FLUSH_INTERVAL_MS);
  }
}

export const logger = new SessionLogger();
