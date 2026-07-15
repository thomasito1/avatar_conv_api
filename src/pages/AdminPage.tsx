import { useState } from 'react';
import FlowRegistry from '../components/admin/FlowRegistry';
import SdkSettingsForm from '../components/admin/SdkSettingsForm';
import AvatarGallery from '../components/admin/AvatarGallery';
import type { FlowConfig } from '../sdk/types';

interface Props {
  flows: FlowConfig[];
  setFlows: (flows: FlowConfig[]) => void;
  activeId: string;
  setActive: (id: string) => void;
}

type Tab = 'flows' | 'settings' | 'gallery';

export default function AdminPage({ flows, setFlows, activeId, setActive }: Props) {
  const [tab, setTab] = useState<Tab>('flows');
  const active = flows.find((f) => f.id === activeId) ?? flows[0];

  const updateActive = (next: FlowConfig) => {
    setFlows(flows.map((f) => (f.id === next.id ? next : f)));
  };

  return (
    <main className="admin">
      <nav className="admin-tabs">
        <button className={tab === 'flows' ? 'active' : ''} onClick={() => setTab('flows')}>
          Conversational flows
        </button>
        <button className={tab === 'settings' ? 'active' : ''} onClick={() => setTab('settings')}>
          SDK settings — {active.label}
        </button>
        <button className={tab === 'gallery' ? 'active' : ''} onClick={() => setTab('gallery')}>
          VOD avatar templates
        </button>
      </nav>
      {tab === 'flows' && (
        <FlowRegistry flows={flows} setFlows={setFlows} activeId={activeId} setActive={setActive} />
      )}
      {tab === 'settings' && <SdkSettingsForm flow={active} onChange={updateActive} />}
      {tab === 'gallery' && <AvatarGallery />}
    </main>
  );
}
