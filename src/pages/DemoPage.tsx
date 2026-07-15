import { useState } from 'react';
import AvatarPanel from '../components/AvatarPanel';
import LiveAvatarPanel from '../components/LiveAvatarPanel';
import type { FlowConfig } from '../sdk/types';

type DemoTab = 'live' | 'embed';

// Primary demo: the Conversational Avatar API (catalog + backend-created
// session, KS server-side). The embed-SDK comparison (Socket vs Iframe
// against a Studio-published flow) stays available as a secondary tab.
export default function DemoPage({ flow }: { flow: FlowConfig }) {
  const [tab, setTab] = useState<DemoTab>('live');
  const embedConfigured = flow.clientId && flow.flowId;
  return (
    <main className="demo">
      <nav className="admin-tabs">
        <button className={tab === 'live' ? 'active' : ''} onClick={() => setTab('live')}>
          Conversational API
        </button>
        <button className={tab === 'embed' ? 'active' : ''} onClick={() => setTab('embed')}>
          Embed SDK (Socket / Iframe)
        </button>
      </nav>
      {tab === 'live' ? (
        <LiveAvatarPanel />
      ) : (
        <>
          {!embedConfigured && (
            <div className="notice">
              The embed SDK needs a Studio-published flow's <strong>Client ID / Flow ID</strong>, so
              both panels run in <strong>mock mode</strong> — same adapters, events and logging
              pipeline, simulated avatar. The Conversational API tab is fully live without them.
            </div>
          )}
          <div className="panels">
            <AvatarPanel flow={flow} panelMode="socket" />
            <AvatarPanel flow={flow} panelMode="iframe" />
          </div>
        </>
      )}
    </main>
  );
}
