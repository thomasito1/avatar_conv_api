import { AdapterEmitter, type AvatarAdapter, type AdapterEvent, type AdapterListener } from './adapter';
import { loadSdkScript } from './loadSdk';
import type { FlowConfig, LifecycleState, TranscriptEntry } from './types';

// Wraps the real Kaltura Socket SDK (Socket.IO + WebRTC/WHEP) behind the
// AvatarAdapter interface. The SDK script URL and global name come from the
// flow config; every documented event is re-emitted for the event console.

const FORWARDED_EVENTS = [
  'connecting',
  'connected',
  'ready',
  'disconnected',
  'reconnecting',
  'reconnected',
  'destroyed',
  'state-change',
  'error',
  'avatar-speech',
  'avatar-speaking-start',
  'avatar-speaking-end',
  'user-speech',
  'video-ready',
  'audio-fallback',
  'mic-granted',
  'mic-denied',
  'genui',
  'genui:before-render',
  'genui:rendered',
  'genui:hidden',
  'genui:interaction',
  'genui:error',
  'command-matched',
  'transcript-entry',
] as const;

interface KalturaSocketSdkInstance {
  connect(): Promise<void>;
  disconnect(): void;
  destroy(): void;
  sendText(text: string): void;
  injectDPP(data: object | string): void;
  muteMic(): void;
  unmuteMic(): void;
  isMicMuted(): boolean;
  getState(): string;
  getSessionId(): string | null;
  getTranscript(): TranscriptEntry[];
  on(event: string, listener: (payload: unknown) => void): void;
}

type SdkConstructor = new (options: Record<string, unknown>) => KalturaSocketSdkInstance;

export class SocketAdapter implements AvatarAdapter {
  readonly mode = 'socket' as const;
  private emitter = new AdapterEmitter();
  private sdk: KalturaSocketSdkInstance | null = null;

  constructor(private flow: FlowConfig) {}

  async connect(container: HTMLElement): Promise<void> {
    if (!this.flow.sdkScriptUrl || !this.flow.sdkGlobalName) {
      throw new Error(
        'Socket SDK script URL / global name not configured for this flow. Set them in the admin panel (from the Kaltura Studio embed snippet), or use mock mode.'
      );
    }
    const globalValue = await loadSdkScript(this.flow.sdkScriptUrl, this.flow.sdkGlobalName);
    const Ctor = globalValue as SdkConstructor;
    const s = this.flow.socketSettings;
    this.sdk = new Ctor({
      clientId: this.flow.clientId,
      flowId: this.flow.flowId,
      container,
      debug: s.debug,
      autoReconnect: s.autoReconnect,
      maxReconnectAttempts: s.maxReconnectAttempts,
      reconnectBaseDelay: s.reconnectBaseDelay,
      connectionTimeout: s.connectionTimeout,
      transcriptEnabled: s.transcriptEnabled,
      peerName: s.peerName,
      media: {
        video: s.media.video,
        audioOnly: s.media.audioOnly,
        autoPlay: s.media.autoPlay,
        micConstraints: { ...s.media.micConstraints },
      },
      genui: { ...s.genui },
      endpoints: { ...s.endpoints },
      ...(s.turn.urls.length && s.turn.username
        ? { turn: { ...s.turn } }
        : {}),
    });

    for (const event of FORWARDED_EVENTS) {
      this.sdk.on(event, (payload) => this.emitter.emit(this.normalize(event), payload));
    }

    // Inject the Dynamic Page Prompt once the avatar is ready, per the docs.
    if (this.flow.dpp.trim()) {
      this.sdk.on('ready', () => this.sdk?.injectDPP(this.flow.dpp));
    }

    await this.sdk.connect();
  }

  disconnect(): void {
    this.sdk?.disconnect();
  }

  destroy(): void {
    this.sdk?.destroy();
    this.sdk = null;
    this.emitter.clear();
  }

  sendText(text: string): void {
    this.sdk?.sendText(text);
  }

  injectDPP(data: object | string): void {
    this.sdk?.injectDPP(data);
  }

  muteMic(): void {
    this.sdk?.muteMic();
  }

  unmuteMic(): void {
    this.sdk?.unmuteMic();
  }

  isMicMuted(): boolean {
    return this.sdk?.isMicMuted() ?? false;
  }

  getState(): LifecycleState {
    return (this.sdk?.getState() as LifecycleState) ?? 'uninitialized';
  }

  getSessionId(): string | null {
    return this.sdk?.getSessionId() ?? null;
  }

  getTranscript(): TranscriptEntry[] {
    return this.sdk?.getTranscript() ?? [];
  }

  on(event: AdapterEvent, listener: AdapterListener): () => void {
    return this.emitter.on(event, listener);
  }

  private normalize(event: string): AdapterEvent {
    // GenUI sub-events and lifecycle extras surface via the raw console;
    // known events keep their documented names.
    const known: readonly string[] = [
      'state-change', 'ready', 'error', 'avatar-speech', 'avatar-speaking-start',
      'avatar-speaking-end', 'user-speech', 'transcript-entry', 'video-ready',
      'audio-fallback', 'mic-granted', 'mic-denied', 'genui', 'disconnected',
      'reconnecting', 'reconnected',
    ];
    return (known.includes(event) ? event : 'raw') as AdapterEvent;
  }
}
