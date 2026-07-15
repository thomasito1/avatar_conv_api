// Loads the Kaltura Avatar SDK script at runtime and returns the global it
// exposes. The script URL and global name come from the flow config (taken
// from the embed snippet in Kaltura Studio), since the SDK is not published
// under a known npm package name.

const loaded = new Map<string, Promise<unknown>>();

export function loadSdkScript(scriptUrl: string, globalName: string): Promise<unknown> {
  const key = `${scriptUrl}::${globalName}`;
  const existing = loaded.get(key);
  if (existing) return existing;

  const promise = new Promise<unknown>((resolve, reject) => {
    const w = window as unknown as Record<string, unknown>;
    if (w[globalName]) {
      resolve(w[globalName]);
      return;
    }
    const script = document.createElement('script');
    script.src = scriptUrl;
    script.async = true;
    script.onload = () => {
      const g = (window as unknown as Record<string, unknown>)[globalName];
      if (g) resolve(g);
      else reject(new Error(`SDK script loaded but window.${globalName} is not defined`));
    };
    script.onerror = () => reject(new Error(`Failed to load SDK script: ${scriptUrl}`));
    document.head.appendChild(script);
  });

  loaded.set(key, promise);
  promise.catch(() => loaded.delete(key));
  return promise;
}
