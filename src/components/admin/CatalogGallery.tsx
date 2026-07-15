import { useEffect, useState } from 'react';
import { listCatalog, type CatalogItem } from '../../api/catalog';
import { getCatalogSelection, setCatalogSelection } from '../LiveAvatarPanel';

// Live catalog of the Conversational Avatar API: every visual with its full
// attribute set, and every voice with a playable sample.
export default function CatalogGallery() {
  const [visuals, setVisuals] = useState<CatalogItem[]>([]);
  const [voices, setVoices] = useState<CatalogItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [selection, setSelection] = useState(getCatalogSelection());

  useEffect(() => {
    Promise.all([listCatalog('Visual'), listCatalog('Voice')])
      .then(([vis, voi]) => {
        setVisuals(vis);
        setVoices(voi);
      })
      .catch((e) => setError(e instanceof Error ? e.message : String(e)));
  }, []);

  const pick = (patch: { visualId?: string; voiceId?: string }) => {
    setCatalogSelection(patch);
    setSelection(getCatalogSelection());
  };

  if (error) {
    return (
      <div className="notice error">
        Catalog unavailable: {error}. The API server needs Kaltura credentials in <code>.env</code>.
      </div>
    );
  }

  return (
    <section className="catalog">
      <h3>Visuals ({visuals.length})</h3>
      <div className="catalog-grid">
        {visuals.map((v) => {
          const a = v.attributes.visual;
          const chips = [
            a?.genderPresentation,
            a?.ageGroup,
            a?.skinTone && `skin: ${a.skinTone}`,
            a?.hairColor && `${a.hairColor}${a.hairStyle?.length ? ' ' + a.hairStyle.join('/') : ''} hair`,
            a?.clothing?.length ? a.clothing.join(' ').trim() : undefined,
            a?.glasses ? 'glasses' : undefined,
            a?.background && `bg: ${a.background}`,
          ].filter(Boolean) as string[];
          const selected = selection.visualId === v.itemId;
          return (
            <div key={v.itemId} className={`catalog-card ${selected ? 'selected' : ''}`}>
              {v.imageUrl ? (
                <img src={v.imageUrl} alt={a?.name} loading="lazy" />
              ) : (
                <div className="catalog-noimg">{a?.name?.charAt(0)}</div>
              )}
              <strong>{a?.name}</strong>
              <div className="chips">
                {chips.map((c) => (
                  <span key={c} className="chip">{c}</span>
                ))}
              </div>
              <code title={v.itemId}>{v.itemId.slice(0, 13)}…</code>
              <button onClick={() => pick({ visualId: v.itemId })} disabled={selected}>
                {selected ? 'Selected for demo' : 'Use in demo'}
              </button>
            </div>
          );
        })}
      </div>

      <h3>Voices ({voices.length})</h3>
      <div className="voice-list">
        {voices.map((v) => {
          const a = v.attributes.voice;
          const selected = selection.voiceId === v.itemId;
          return (
            <div key={v.itemId} className={`voice-card ${selected ? 'selected' : ''}`}>
              <div className="voice-meta">
                <strong>{a?.name}</strong>
                <span>{a?.description}</span>
                <span className="chip">{a?.language}</span>
              </div>
              {v.voiceSampleUrl && <audio controls preload="none" src={v.voiceSampleUrl} />}
              <button onClick={() => pick({ voiceId: v.itemId })} disabled={selected}>
                {selected ? 'Selected for demo' : 'Use in demo'}
              </button>
            </div>
          );
        })}
      </div>
    </section>
  );
}
