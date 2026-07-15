import { useEffect, useState } from 'react';
import { avatarPreviewUrl, listAvatarTemplates, upsertAvatar, type AvatarTemplate, type VodAvatar } from '../../api/vod';

// Gallery of the VOD Avatar Studio presenter templates (avatarTemplate/list),
// with background configuration + preview (avatar/upsert + avatar/preview).
export default function AvatarGallery() {
  const [templates, setTemplates] = useState<AvatarTemplate[]>([]);
  const [live, setLive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [bgType, setBgType] = useState<'color' | 'library' | 'entry'>('color');
  const [bgValue, setBgValue] = useState('#CEEEDB');
  const [result, setResult] = useState<VodAvatar | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    listAvatarTemplates()
      .then((r) => {
        setTemplates(r.objects);
        setLive(r.live);
      })
      .catch((e) => setError(e.message));
  }, []);

  const create = async () => {
    if (!selected) return;
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const background =
        bgType === 'color'
          ? ({ type: 'color', color: bgValue } as const)
          : bgType === 'library'
            ? ({ type: 'library', id: bgValue } as const)
            : ({ type: 'entry', entryId: bgValue } as const);
      setResult(await upsertAvatar(selected, background));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="gallery">
      {!live && (
        <div className="notice">
          Showing the documented template list (server has no live KS yet, or the upstream call
          failed) — previews and avatar creation need <code>KALTURA_KS</code> or partner
          credentials in <code>.env</code>.
        </div>
      )}
      {error && <div className="notice error">{error}</div>}

      <div className="template-grid">
        {templates.map((t) => (
          <button
            key={t.id}
            className={`template-card ${selected === t.id ? 'selected' : ''}`}
            onClick={() => setSelected(t.id)}
          >
            <div className="template-avatar">{t.name.charAt(0)}</div>
            <span>{t.name}</span>
            <code>{t.id}</code>
          </button>
        ))}
      </div>

      {selected && (
        <div className="bg-config">
          <h3>Configure “{selected}”</h3>
          <label>
            Background type
            <select value={bgType} onChange={(e) => {
              const t = e.target.value as typeof bgType;
              setBgType(t);
              setBgValue(t === 'color' ? '#CEEEDB' : t === 'library' ? 'office-1' : '');
            }}>
              <option value="color">color (hex)</option>
              <option value="library">library image id</option>
              <option value="entry">Kaltura media entry id</option>
            </select>
          </label>
          <label>
            {bgType === 'color' ? 'Hex color' : bgType === 'library' ? 'Library id' : 'Entry id'}
            {bgType === 'color' ? (
              <input type="color" value={bgValue} onChange={(e) => setBgValue(e.target.value)} />
            ) : (
              <input value={bgValue} onChange={(e) => setBgValue(e.target.value)} />
            )}
          </label>
          <button className="primary" onClick={create} disabled={busy || !live}>
            {busy ? 'Creating…' : 'Create avatar (avatar/upsert)'}
          </button>
          {!live && <p className="hint">Disabled until the server has Kaltura credentials.</p>}
          {result && (
            <div className="upsert-result">
              <p>
                Avatar <code>{result.id}</code> ready (template <code>{result.templateId}</code>).
              </p>
              <img src={avatarPreviewUrl(result.id)} alt={`Preview of ${result.templateId}`} />
            </div>
          )}
        </div>
      )}
    </section>
  );
}
