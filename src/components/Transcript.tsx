import { useEffect, useRef } from 'react';
import type { TranscriptEntry } from '../sdk/types';

export default function Transcript({ entries }: { entries: TranscriptEntry[] }) {
  const endRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [entries.length]);

  return (
    <div className="transcript">
      <h3>Transcript</h3>
      <div className="transcript-scroll">
        {entries.length === 0 && <p className="empty">No transcript yet.</p>}
        {entries.map((e, i) => (
          <div key={i} className={`line ${e.role.toLowerCase()}`}>
            <span className="role">{e.role}</span>
            <span className="text">{e.text}</span>
            <span className="time">{new Date(e.timestamp).toLocaleTimeString()}</span>
          </div>
        ))}
        <div ref={endRef} />
      </div>
    </div>
  );
}
