let oauthConfigPromise: Promise<void> | null = null;

function loadOAuthConfigScript(): Promise<void> {
  if (window.__FINANCY_OAUTH_CLIENT_ID__) {
    return Promise.resolve();
  }

  if (!oauthConfigPromise) {
    oauthConfigPromise = new Promise((resolve) => {
      const script = document.createElement("script");
      script.src = "/oauth-config.js";
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => resolve();
      document.head.appendChild(script);
    });
  }

  return oauthConfigPromise;
}

export async function resolveOAuthClientId(): Promise<string | undefined> {
  const fromEnv = import.meta.env.VITE_OAUTH_CLIENT_ID as string | undefined;
  if (fromEnv) {
    return fromEnv;
  }

  if (window.__FINANCY_OAUTH_CLIENT_ID__) {
    return window.__FINANCY_OAUTH_CLIENT_ID__;
  }

  await loadOAuthConfigScript();
  return window.__FINANCY_OAUTH_CLIENT_ID__;
}
