import AvatarPanel from '../components/AvatarPanel';
import type { FlowConfig } from '../sdk/types';

// Side-by-side comparison of the two Conversational Avatar integration modes
// against the same published flow.
export default function DemoPage({ flow }: { flow: FlowConfig }) {
  const configured = flow.clientId && flow.flowId && flow.sdkScriptUrl;
  return (
    <main className="demo">
      {!configured && (
        <div className="notice">
          This flow is missing its Client ID / Flow ID / SDK script URL, so both panels run in{' '}
          <strong>mock mode</strong> — same adapters, events and logging pipeline, simulated avatar.
          Fill in the credentials in the Admin panel to go live.
        </div>
      )}
      <div className="panels">
        <AvatarPanel flow={flow} panelMode="socket" />
        <AvatarPanel flow={flow} panelMode="iframe" />
      </div>
    </main>
  );
}
