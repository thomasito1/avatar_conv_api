import { useMemo, useState } from 'react';
import DemoPage from './pages/DemoPage';
import AdminPage from './pages/AdminPage';
import { loadFlows, getActiveFlowId, setActiveFlowId, saveFlows } from './config/flowStore';
import type { FlowConfig } from './sdk/types';

type Page = 'demo' | 'admin';

export default function App() {
  const [page, setPage] = useState<Page>('demo');
  const [flows, setFlowsState] = useState<FlowConfig[]>(() => loadFlows());
  const [activeId, setActiveIdState] = useState<string>(() => getActiveFlowId() ?? loadFlows()[0].id);

  const activeFlow = useMemo(
    () => flows.find((f) => f.id === activeId) ?? flows[0],
    [flows, activeId]
  );

  const setFlows = (next: FlowConfig[]) => {
    setFlowsState(next);
    saveFlows(next);
  };

  const setActive = (id: string) => {
    setActiveIdState(id);
    setActiveFlowId(id);
  };

  return (
    <div className="app">
      <header className="topbar">
        <h1>Kaltura Conversational Avatar</h1>
        <nav>
          <button className={page === 'demo' ? 'active' : ''} onClick={() => setPage('demo')}>
            Demo
          </button>
          <button className={page === 'admin' ? 'active' : ''} onClick={() => setPage('admin')}>
            Admin panel
          </button>
        </nav>
        <div className="flow-picker">
          <label>Flow:</label>
          <select value={activeFlow.id} onChange={(e) => setActive(e.target.value)}>
            {flows.map((f) => (
              <option key={f.id} value={f.id}>
                {f.label}
              </option>
            ))}
          </select>
        </div>
      </header>
      {page === 'demo' ? (
        <DemoPage flow={activeFlow} />
      ) : (
        <AdminPage flows={flows} setFlows={setFlows} activeId={activeFlow.id} setActive={setActive} />
      )}
    </div>
  );
}
