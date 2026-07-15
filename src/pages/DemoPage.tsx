import AvatarPanel from '../components/AvatarPanel';
import type { FlowConfig } from '../sdk/types';

// Side-by-side comparison of the two Conversational Avatar integration modes
// against the same published flow.
export default function DemoPage({ flow }: { flow: FlowConfig }) {
  const configured = flow.clientId && flow.flowId;
  return (
    <main className="demo">
      {!configured && (
        <div className="notice">
          This flow is missing its <strong>Client ID / Flow ID</strong>, so both panels run in{' '}
          <strong>mock mode</strong> — same adapters, events and logging pipeline, simulated avatar.
          Paste the credentials of your published flow in the Admin panel to go live.
        </div>
      )}
      <div className="panels">
        <AvatarPanel flow={flow} panelMode="socket" />
        <AvatarPanel flow={flow} panelMode="iframe" />
      </div>
    </main>
  );
}
