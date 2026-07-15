import { makeDefaultFlow } from '../../config/flowStore';
import type { FlowConfig } from '../../sdk/types';

interface Props {
  flows: FlowConfig[];
  setFlows: (flows: FlowConfig[]) => void;
  activeId: string;
  setActive: (id: string) => void;
}

// Conversational avatar flows have no public list endpoint — they are
// published in Kaltura Studio — so this registry is the panel's "avatar list"
// for the conversational side.
export default function FlowRegistry({ flows, setFlows, activeId, setActive }: Props) {
  const update = (id: string, patch: Partial<FlowConfig>) => {
    setFlows(flows.map((f) => (f.id === id ? { ...f, ...patch } : f)));
  };

  const remove = (id: string) => {
    const next = flows.filter((f) => f.id !== id);
    setFlows(next.length ? next : [makeDefaultFlow()]);
  };

  return (
    <section className="registry">
      <p className="hint">
        Register each avatar flow published in Kaltura Studio: its Client ID + Flow ID, and the SDK
        script URL / global name from the Studio embed snippet. The selected flow drives both demo panels.
      </p>
      {flows.map((f) => (
        <div key={f.id} className={`flow-card ${f.id === activeId ? 'selected' : ''}`}>
          <div className="flow-row">
            <label>
              Label
              <input value={f.label} onChange={(e) => update(f.id, { label: e.target.value })} />
            </label>
            <label>
              Client ID
              <input value={f.clientId} onChange={(e) => update(f.id, { clientId: e.target.value })} />
            </label>
            <label>
              Flow ID
              <input value={f.flowId} onChange={(e) => update(f.id, { flowId: e.target.value })} />
            </label>
          </div>
          <div className="flow-row">
            <label>
              SDK script URL
              <input
                value={f.sdkScriptUrl}
                placeholder="https://…/avatar-sdk.js (from the Studio embed snippet)"
                onChange={(e) => update(f.id, { sdkScriptUrl: e.target.value })}
              />
            </label>
            <label>
              SDK global name
              <input
                value={f.sdkGlobalName}
                placeholder="e.g. KalturaAvatarSDK"
                onChange={(e) => update(f.id, { sdkGlobalName: e.target.value })}
              />
            </label>
          </div>
          <div className="flow-actions">
            <button onClick={() => setActive(f.id)} disabled={f.id === activeId}>
              {f.id === activeId ? 'Active' : 'Use in demo'}
            </button>
            <button className="danger" onClick={() => remove(f.id)}>
              Remove
            </button>
          </div>
        </div>
      ))}
      <button className="primary" onClick={() => setFlows([...flows, makeDefaultFlow()])}>
        Add flow
      </button>
    </section>
  );
}
