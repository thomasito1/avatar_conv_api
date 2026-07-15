import { AdapterEmitter, type AvatarAdapter, type AdapterEvent, type AdapterListener } from './adapter';
import { loadSdkScript } from './loadSdk';
import type { FlowConfig, LifecycleState, TranscriptEntry } from './types';

// Wraps the Iframe SDK (postMessage-based). Coarser events than the Socket
// SDK: load-agent-error / permissions-denied / error{message} only.

const IFRAME_EVENTS = [
  'showing-join-meeting',
  'join-meeting-clicked',
  'showing-agent',
  'agent-talked',
  'user-transcription',
  'pronunciation-score',
  'permissions-denied',
  'conversation-ended',
  'load-agent-error',
  'stateChange',
  'ready',
  'started',
  'ended',
  'error',
] as const;

interface KalturaIframeSdkInstance {
  start(options?: object): Promise<HTMLIFrameElement>;
  end(): void;
  destroy(): void;
  setContainer(el: HTMLElement | string): unknown;
  injectPrompt(text: string): boolean;
  getState(): string;
  getTranscript(): TranscriptEntry[];
  on(event: string, listener: (payload: unknown) => void): void;
}

type SdkConstructor = new (options: Record<string, unknown>) => KalturaIframeSdkInstance;

export class IframeAdapter implements AvatarAdapter {
  readonly mode = 'iframe' as const;
  private emitter = new AdapterEmitter();
  private sdk: KalturaIframeSdkInstance | null = null;

  constructor(private flow: FlowConfig) {}

  async connect(container: HTMLElement): Promise<void> {
    if (!this.flow.sdkScriptUrl || !this.flow.sdkGlobalName) {
      throw new Error(
        'Iframe SDK script URL / global name not configured for this flow. Set them in the admin panel, or use mock mode.'
      );
    }
    const globalValue = await loadSdkScript(this.flow.sdkScriptUrl, this.flow.sdkGlobalName);
    const Ctor = globalValue as SdkConstructor;
    const s = this.flow.iframeSettings;
    this.sdk = new Ctor({
      clientId: this.flow.clientId,
      flowId: this.flow.flowId,
      container,
      config: {
        debug: s.debug,
        apiBaseUrl: s.apiBaseUrl,
        meetBaseUrl: s.meetBaseUrl,
        iframeClass: s.iframeClass,
      },
    });

    for (const event of IFRAME_EVENTS) {
      this.sdk.on(event, (payload) => this.emitter.emit(this.normalize(event), payload));
    }

    // DPP injection window opens on `showing-agent`; docs recommend ~500ms delay.
    if (this.flow.dpp.trim()) {
      this.sdk.on('showing-agent', () => {
        setTimeout(() => this.sdk?.injectPrompt(this.flow.dpp), 500);
      });
    }

    await this.sdk.start();
  }

  disconnect(): void {
    this.sdk?.end();
  }

  destroy(): void {
    this.sdk?.destroy();
    this.sdk = null;
    this.emitter.clear();
  }

  sendText(): void {
    // The Iframe SDK has no text input channel; postMessage only.
  }

  injectDPP(data: object | string): void {
    this.sdk?.injectPrompt(typeof data === 'string' ? data : JSON.stringify(data));
  }

  muteMic(): void {}
  unmuteMic(): void {}
  isMicMuted(): boolean {
    return false;
  }

  getState(): LifecycleState {
    return (this.sdk?.getState() as LifecycleState) ?? 'uninitialized';
  }

  getSessionId(): string | null {
    return null;
  }

  getTranscript(): TranscriptEntry[] {
    return this.sdk?.getTranscript() ?? [];
  }

  on(event: AdapterEvent, listener: AdapterListener): () => void {
    return this.emitter.on(event, listener);
  }

  private normalize(event: string): AdapterEvent {
    switch (event) {
      case 'agent-talked':
        return 'avatar-speech';
      case 'user-transcription':
        return 'user-speech';
      case 'permissions-denied':
        return 'mic-denied';
      case 'load-agent-error':
      case 'error':
        return 'error';
      case 'stateChange':
        return 'state-change';
      case 'ready':
        return 'ready';
      case 'conversation-ended':
      case 'ended':
        return 'disconnected';
      default:
        return 'raw';
    }
  }
}
