// Loads a Kaltura Avatar SDK script at runtime and returns the global it
// exposes. Both the Socket and Iframe SDKs are UMD builds that register the
// SAME global name (KalturaAvatarSDK), so loads are serialized and each
// constructor is captured immediately after its script executes — before the
// next script can overwrite the global.

const loaded = new Map<string, Promise<unknown>>();
let chain: Promise<unknown> = Promise.resolve();

export function loadSdkScript(scriptUrl: string, globalName: string): Promise<unknown> {
  const key = `${scriptUrl}::${globalName}`;
  const existing = loaded.get(key);
  if (existing) return existing;

  const promise = chain.then(
    () =>
      new Promise<unknown>((resolve, reject) => {
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
      })
  );

  loaded.set(key, promise);
  chain = promise.catch(() => undefined);
  promise.catch(() => loaded.delete(key));
  return promise;
}
