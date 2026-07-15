// Types mirroring the documented Kaltura Conversational Avatar SDK surface.
// Reference: https://docs.kaltura.com/models/documentations/avatar/conversational-apis/

export type SdkMode = 'socket' | 'iframe' | 'mock';

export type LifecycleState =
  | 'uninitialized'
  | 'connecting'
  | 'connected'
  | 'ready'
  | 'in-conversation'
  | 'reconnecting'
  | 'ended'
  | 'error';

// Typed error codes from the Socket SDK reference.
export const SDK_ERROR_CODES: Record<number, { name: string; category: string; recoverable: boolean }> = {
  1001: { name: 'CONNECTION_FAILED', category: 'connection', recoverable: true },
  1002: { name: 'CONNECTION_TIMEOUT', category: 'connection', recoverable: true },
  1003: { name: 'CONNECTION_LOST', category: 'connection', recoverable: true },
  1004: { name: 'JOIN_FAILED', category: 'connection', recoverable: false },
  1005: { name: 'FLOW_CONFIG_ERROR', category: 'connection', recoverable: false },
  2001: { name: 'MIC_PERMISSION_DENIED', category: 'media', recoverable: false },
  2002: { name: 'MIC_NOT_AVAILABLE', category: 'media', recoverable: false },
  2003: { name: 'WHEP_NEGOTIATION_FAILED', category: 'media', recoverable: true },
  2004: { name: 'WEBRTC_FAILED', category: 'media', recoverable: true },
  2005: { name: 'VIDEO_PLAYBACK_FAILED', category: 'media', recoverable: true },
  3001: { name: 'INVALID_STATE', category: 'usage', recoverable: false },
  3003: { name: 'ALREADY_DESTROYED', category: 'usage', recoverable: false },
  4002: { name: 'SESSION_EXPIRED', category: 'session', recoverable: false },
  4003: { name: 'CONVERSATION_TIME_EXPIRED', category: 'session', recoverable: false },
  5001: { name: 'INVALID_CONFIG', category: 'config', recoverable: false },
  5002: { name: 'CONTAINER_NOT_FOUND', category: 'config', recoverable: false },
  5003: { name: 'INVALID_DPP_JSON', category: 'config', recoverable: false },
};

export interface SdkError {
  code: number;
  message: string;
  recoverable: boolean;
}

export interface TranscriptEntry {
  role: 'Avatar' | 'User';
  text: string;
  timestamp: number;
}

// Every documented constructor option of the Socket SDK, editable in the admin panel.
export interface SocketSdkSettings {
  debug: boolean;
  autoReconnect: boolean;
  maxReconnectAttempts: number;
  reconnectBaseDelay: number;
  connectionTimeout: number;
  transcriptEnabled: boolean;
  peerName: string;
  media: {
    video: boolean;
    audioOnly: boolean;
    autoPlay: boolean;
    micConstraints: {
      echoCancellation: boolean;
      noiseSuppression: boolean;
    };
  };
  genui: {
    enabled: boolean;
    position: 'overlay' | 'below' | 'custom';
    autoHide: boolean;
    dismissible: boolean;
    stickyTypes: string[];
  };
  endpoints: {
    socket: string;
    socketPath: string;
    whep: string;
  };
  turn: {
    urls: string[];
    username: string;
    credential: string;
    iceTransportPolicy: 'relay' | 'all';
  };
}

export interface IframeSdkSettings {
  debug: boolean;
  apiBaseUrl: string;
  meetBaseUrl: string;
  iframeClass: string;
}

export const DEFAULT_SOCKET_SETTINGS: SocketSdkSettings = {
  debug: false,
  autoReconnect: true,
  maxReconnectAttempts: 5,
  reconnectBaseDelay: 1000,
  connectionTimeout: 15000,
  transcriptEnabled: true,
  peerName: 'SDKUser',
  media: {
    video: true,
    audioOnly: false,
    autoPlay: true,
    micConstraints: { echoCancellation: true, noiseSuppression: true },
  },
  genui: {
    enabled: true,
    position: 'overlay',
    autoHide: true,
    dismissible: true,
    stickyTypes: [],
  },
  endpoints: {
    socket: 'https://conversation.avatar.us.kaltura.ai',
    socketPath: '/socket.io',
    whep: 'https://srs.avatar.us.kaltura.ai',
  },
  turn: {
    urls: ['turn:turn.avatar.us.kaltura.ai:443?transport=tcp'],
    username: '',
    credential: '',
    iceTransportPolicy: 'all',
  },
};

export const DEFAULT_IFRAME_SETTINGS: IframeSdkSettings = {
  debug: false,
  apiBaseUrl: 'https://api.avatar.us.kaltura.ai',
  meetBaseUrl: 'https://meet.avatar.us.kaltura.ai',
  iframeClass: 'avatar-iframe',
};

// A conversational avatar "flow" as published in Kaltura Studio. There is no
// public list endpoint for flows, so the admin panel maintains this registry.
export interface FlowConfig {
  id: string; // local registry id
  label: string;
  clientId: string;
  flowId: string;
  // Optional URL of the SDK script and the global it exposes; filled in once
  // known from the Kaltura Studio embed snippet.
  sdkScriptUrl: string;
  sdkGlobalName: string;
  dpp: string; // Dynamic Page Prompt JSON injected on `ready`
  socketSettings: SocketSdkSettings;
  iframeSettings: IframeSdkSettings;
}
