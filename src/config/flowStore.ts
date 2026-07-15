import {
  DEFAULT_IFRAME_SETTINGS,
  DEFAULT_SOCKET_SETTINGS,
  type FlowConfig,
} from '../sdk/types';

// Conversational avatar flows are published in Kaltura Studio and have no
// public list endpoint, so the admin panel maintains this local registry.

const STORAGE_KEY = 'avatar-demo/flows';
const ACTIVE_KEY = 'avatar-demo/active-flow';

const SAMPLE_DPP = JSON.stringify(
  {
    v: '2',
    role: 'Product Demo Guide',
    inst: ['Greet the visitor and offer a short tour of the demo.'],
    user: { first_name: 'Guest' },
    max_minutes: 10,
  },
  null,
  2
);

export function makeDefaultFlow(partial?: Partial<FlowConfig>): FlowConfig {
  return {
    id: `flow-${Math.random().toString(36).slice(2, 9)}`,
    label: 'My avatar flow',
    clientId: '',
    flowId: '',
    sdkScriptUrl: '',
    sdkGlobalName: '',
    dpp: SAMPLE_DPP,
    socketSettings: structuredClone(DEFAULT_SOCKET_SETTINGS),
    iframeSettings: structuredClone(DEFAULT_IFRAME_SETTINGS),
    ...partial,
  };
}

export function loadFlows(): FlowConfig[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const flows = JSON.parse(raw) as FlowConfig[];
      if (Array.isArray(flows) && flows.length) return flows;
    }
  } catch {
    // fall through to default
  }
  const initial = [makeDefaultFlow({ label: 'Demo flow (fill in credentials)' })];
  saveFlows(initial);
  return initial;
}

export function saveFlows(flows: FlowConfig[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(flows));
}

export function getActiveFlowId(): string | null {
  return localStorage.getItem(ACTIVE_KEY);
}

export function setActiveFlowId(id: string): void {
  localStorage.setItem(ACTIVE_KEY, id);
}
