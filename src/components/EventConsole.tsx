import { useEffect, useRef, useState } from 'react';

export interface ConsoleEntry {
  ts: number;
  name: string;
  payload: unknown;
}

// Raw SDK event stream — doubles as the visible proof of the logging layer.
export default function EventConsole({ entries }: { entries: ConsoleEntry[] }) {
  const endRef = useRef<HTMLDivElement>(null);
  const [expanded, setExpanded] = useState<number | null>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'nearest' });
  }, [entries.length]);

  return (
    <div className="event-console">
      <h3>Event console</h3>
      <div className="console-scroll">
        {entries.length === 0 && <p className="empty">SDK events appear here.</p>}
        {entries.map((e, i) => (
          <div
            key={i}
            className={`console-line ${e.name === 'error' || e.name === 'connect-failed' ? 'error' : ''}`}
            onClick={() => setExpanded(expanded === i ? null : i)}
          >
            <span className="time">{new Date(e.ts).toLocaleTimeString()}</span>
            <span className="name">{e.name}</span>
            {expanded === i && e.payload !== undefined && (
              <pre>{JSON.stringify(e.payload, null, 2)}</pre>
            )}
          </div>
        ))}
        <div ref={endRef} />
      </div>
    </div>
  );
}
