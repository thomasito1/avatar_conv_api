import type { FlowConfig, SocketSdkSettings } from '../../sdk/types';

interface Props {
  flow: FlowConfig;
  onChange: (next: FlowConfig) => void;
}

// Exposes every documented constructor option of both SDKs plus the DPP
// editor, per flow.
export default function SdkSettingsForm({ flow, onChange }: Props) {
  const s = flow.socketSettings;

  const setSocket = (patch: Partial<SocketSdkSettings>) =>
    onChange({ ...flow, socketSettings: { ...s, ...patch } });

  const dppInvalid = (() => {
    if (!flow.dpp.trim()) return false;
    try {
      JSON.parse(flow.dpp);
      return false;
    } catch {
      return true;
    }
  })();

  return (
    <section className="settings">
      <fieldset>
        <legend>Socket SDK — connection & behavior</legend>
        <label className="check">
          <input type="checkbox" checked={s.debug} onChange={(e) => setSocket({ debug: e.target.checked })} />
          debug
        </label>
        <label className="check">
          <input type="checkbox" checked={s.autoReconnect} onChange={(e) => setSocket({ autoReconnect: e.target.checked })} />
          autoReconnect
        </label>
        <label className="check">
          <input type="checkbox" checked={s.transcriptEnabled} onChange={(e) => setSocket({ transcriptEnabled: e.target.checked })} />
          transcriptEnabled
        </label>
        <label>
          maxReconnectAttempts
          <input type="number" min={0} value={s.maxReconnectAttempts}
            onChange={(e) => setSocket({ maxReconnectAttempts: Number(e.target.value) })} />
        </label>
        <label>
          reconnectBaseDelay (ms)
          <input type="number" min={0} step={100} value={s.reconnectBaseDelay}
            onChange={(e) => setSocket({ reconnectBaseDelay: Number(e.target.value) })} />
        </label>
        <label>
          connectionTimeout (ms)
          <input type="number" min={1000} step={1000} value={s.connectionTimeout}
            onChange={(e) => setSocket({ connectionTimeout: Number(e.target.value) })} />
        </label>
        <label>
          peerName
          <input value={s.peerName} onChange={(e) => setSocket({ peerName: e.target.value })} />
        </label>
      </fieldset>

      <fieldset>
        <legend>Socket SDK — media</legend>
        <label className="check">
          <input type="checkbox" checked={s.media.video}
            onChange={(e) => setSocket({ media: { ...s.media, video: e.target.checked } })} />
          video
        </label>
        <label className="check">
          <input type="checkbox" checked={s.media.audioOnly}
            onChange={(e) => setSocket({ media: { ...s.media, audioOnly: e.target.checked } })} />
          audioOnly
        </label>
        <label className="check">
          <input type="checkbox" checked={s.media.autoPlay}
            onChange={(e) => setSocket({ media: { ...s.media, autoPlay: e.target.checked } })} />
          autoPlay
        </label>
        <label className="check">
          <input type="checkbox" checked={s.media.micConstraints.echoCancellation}
            onChange={(e) => setSocket({ media: { ...s.media, micConstraints: { ...s.media.micConstraints, echoCancellation: e.target.checked } } })} />
          echoCancellation
        </label>
        <label className="check">
          <input type="checkbox" checked={s.media.micConstraints.noiseSuppression}
            onChange={(e) => setSocket({ media: { ...s.media, micConstraints: { ...s.media.micConstraints, noiseSuppression: e.target.checked } } })} />
          noiseSuppression
        </label>
      </fieldset>

      <fieldset>
        <legend>Socket SDK — GenUI</legend>
        <label className="check">
          <input type="checkbox" checked={s.genui.enabled}
            onChange={(e) => setSocket({ genui: { ...s.genui, enabled: e.target.checked } })} />
          enabled
        </label>
        <label>
          position
          <select value={s.genui.position}
            onChange={(e) => setSocket({ genui: { ...s.genui, position: e.target.value as 'overlay' | 'below' | 'custom' } })}>
            <option value="overlay">overlay</option>
            <option value="below">below</option>
            <option value="custom">custom</option>
          </select>
        </label>
        <label className="check">
          <input type="checkbox" checked={s.genui.autoHide}
            onChange={(e) => setSocket({ genui: { ...s.genui, autoHide: e.target.checked } })} />
          autoHide
        </label>
        <label className="check">
          <input type="checkbox" checked={s.genui.dismissible}
            onChange={(e) => setSocket({ genui: { ...s.genui, dismissible: e.target.checked } })} />
          dismissible
        </label>
        <label>
          stickyTypes (comma-separated)
          <input value={s.genui.stickyTypes.join(', ')}
            onChange={(e) => setSocket({ genui: { ...s.genui, stickyTypes: e.target.value.split(',').map((t) => t.trim()).filter(Boolean) } })} />
        </label>
      </fieldset>

      <fieldset>
        <legend>Socket SDK — endpoints & TURN</legend>
        <label>
          socket endpoint
          <input value={s.endpoints.socket}
            onChange={(e) => setSocket({ endpoints: { ...s.endpoints, socket: e.target.value } })} />
        </label>
        <label>
          socket path
          <input value={s.endpoints.socketPath}
            onChange={(e) => setSocket({ endpoints: { ...s.endpoints, socketPath: e.target.value } })} />
        </label>
        <label>
          WHEP endpoint
          <input value={s.endpoints.whep}
            onChange={(e) => setSocket({ endpoints: { ...s.endpoints, whep: e.target.value } })} />
        </label>
        <label>
          TURN urls (comma-separated)
          <input value={s.turn.urls.join(', ')}
            onChange={(e) => setSocket({ turn: { ...s.turn, urls: e.target.value.split(',').map((t) => t.trim()).filter(Boolean) } })} />
        </label>
        <label>
          TURN username
          <input value={s.turn.username}
            onChange={(e) => setSocket({ turn: { ...s.turn, username: e.target.value } })} />
        </label>
        <label>
          TURN credential
          <input type="password" value={s.turn.credential}
            onChange={(e) => setSocket({ turn: { ...s.turn, credential: e.target.value } })} />
        </label>
        <label>
          iceTransportPolicy
          <select value={s.turn.iceTransportPolicy}
            onChange={(e) => setSocket({ turn: { ...s.turn, iceTransportPolicy: e.target.value as 'relay' | 'all' } })}>
            <option value="all">all</option>
            <option value="relay">relay</option>
          </select>
        </label>
      </fieldset>

      <fieldset>
        <legend>Iframe SDK</legend>
        <label className="check">
          <input type="checkbox" checked={flow.iframeSettings.debug}
            onChange={(e) => onChange({ ...flow, iframeSettings: { ...flow.iframeSettings, debug: e.target.checked } })} />
          debug
        </label>
        <label>
          apiBaseUrl
          <input value={flow.iframeSettings.apiBaseUrl}
            onChange={(e) => onChange({ ...flow, iframeSettings: { ...flow.iframeSettings, apiBaseUrl: e.target.value } })} />
        </label>
        <label>
          meetBaseUrl
          <input value={flow.iframeSettings.meetBaseUrl}
            onChange={(e) => onChange({ ...flow, iframeSettings: { ...flow.iframeSettings, meetBaseUrl: e.target.value } })} />
        </label>
        <label>
          iframeClass
          <input value={flow.iframeSettings.iframeClass}
            onChange={(e) => onChange({ ...flow, iframeSettings: { ...flow.iframeSettings, iframeClass: e.target.value } })} />
        </label>
      </fieldset>

      <fieldset className="dpp">
        <legend>Dynamic Page Prompt (injected on ready / showing-agent)</legend>
        <textarea
          rows={12}
          value={flow.dpp}
          onChange={(e) => onChange({ ...flow, dpp: e.target.value })}
          spellCheck={false}
        />
        {dppInvalid && <p className="error-text">Invalid JSON — the SDK would raise error 5003 INVALID_DPP_JSON.</p>}
      </fieldset>
    </section>
  );
}
