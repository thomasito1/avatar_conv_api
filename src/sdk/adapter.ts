import type { SdkError, TranscriptEntry, LifecycleState } from './types';

// Normalized event names the UI consumes, mapped from both SDK variants.
export type AdapterEvent =
  | 'state-change'
  | 'ready'
  | 'error'
  | 'avatar-speech'
  | 'avatar-speaking-start'
  | 'avatar-speaking-end'
  | 'user-speech'
  | 'transcript-entry'
  | 'video-ready'
  | 'audio-fallback'
  | 'mic-granted'
  | 'mic-denied'
  | 'genui'
  | 'disconnected'
  | 'reconnecting'
  | 'reconnected'
  | 'raw'; // every underlying SDK event, for the event console

export type AdapterListener = (payload: unknown) => void;

// Common interface both the Socket and Iframe SDKs are wrapped into, so the
// demo page can render either side with the same component.
export interface AvatarAdapter {
  readonly mode: 'socket' | 'iframe' | 'mock';
  connect(container: HTMLElement): Promise<void>;
  disconnect(): void;
  destroy(): void;
  sendText(text: string): void;
  injectDPP(data: object | string): void;
  muteMic(): void;
  unmuteMic(): void;
  isMicMuted(): boolean;
  getState(): LifecycleState;
  getSessionId(): string | null;
  getTranscript(): TranscriptEntry[];
  on(event: AdapterEvent, listener: AdapterListener): () => void;
}

export class AdapterEmitter {
  private listeners = new Map<AdapterEvent, Set<AdapterListener>>();

  on(event: AdapterEvent, listener: AdapterListener): () => void {
    let set = this.listeners.get(event);
    if (!set) {
      set = new Set();
      this.listeners.set(event, set);
    }
    set.add(listener);
    return () => set!.delete(listener);
  }

  emit(event: AdapterEvent, payload?: unknown): void {
    this.listeners.get(event)?.forEach((l) => l(payload));
    if (event !== 'raw') {
      this.listeners.get('raw')?.forEach((l) => l({ event, payload }));
    }
  }

  clear(): void {
    this.listeners.clear();
  }
}

export function makeSdkError(code: number, message: string, recoverable: boolean): SdkError {
  return { code, message, recoverable };
}
