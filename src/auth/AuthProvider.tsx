import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type PropsWithChildren,
} from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { ApiError, api } from "../api/client";
import type { Session } from "../api/types";
import { resolveOAuthClientId } from "../lib/oauthClientId";

interface AuthContextValue {
  session: Session | null;
  signIn: (credential: string) => Promise<void>;
  signInLocal: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: PropsWithChildren) {
  const queryClient = useQueryClient();
  const sessionQuery = useQuery({
    queryKey: ["session"],
    queryFn: api.getSession,
    retry: false,
  });

  const signIn = async (credential: string) => {
    const session = await api.exchangeGoogleCredential(credential);
    queryClient.setQueryData(["session"], session);
  };

  const signInLocal = async () => {
    const session = await api.exchangeDevSession();
    queryClient.setQueryData(["session"], session);
  };

  const signOut = async () => {
    await api.logout();
    queryClient.setQueryData(["session"], null);
    await queryClient.invalidateQueries();
  };

  const value: AuthContextValue = {
    session: sessionQuery.data ?? null,
    signIn,
    signInLocal,
    signOut,
  };

  return (
    <AuthContext.Provider value={value}>
      <AuthGate query={sessionQuery}>{children}</AuthGate>
    </AuthContext.Provider>
  );
}

function AuthGate({
  query,
  children,
}: PropsWithChildren<{
  query: ReturnType<typeof useQuery<Session>>;
}>) {
  if (query.isPending) {
    return (
      <main className="auth-screen">
        <div className="loading-orb" />
        <p>Checking your session…</p>
      </main>
    );
  }

  if (query.data) {
    return children;
  }

  const error = query.error;
  if (error && !(error instanceof ApiError && error.status === 401)) {
    return (
      <main className="auth-screen">
        <div className="auth-card">
          <span className="eyebrow">Financy</span>
          <h1>We could not reach your ledger.</h1>
          <p className="muted">
            Refresh the page after checking that the API is running.
          </p>
          <button className="button button-primary" onClick={() => query.refetch()}>
            Try again
          </button>
        </div>
      </main>
    );
  }

  return <LoginScreen />;
}

function LoginScreen() {
  const { signIn, signInLocal } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [localPending, setLocalPending] = useState(false);
  const buttonRef = useRef<HTMLDivElement>(null);
  // Vite dev server sets DEV; containerized local builds set VITE_DEV_LOGIN=1.
  const localDev =
    import.meta.env.DEV || import.meta.env.VITE_DEV_LOGIN === "1";

  useEffect(() => {
    if (localDev) {
      return;
    }

    let cancelled = false;

    const load = async () => {
      const clientId = await resolveOAuthClientId();
      if (!clientId) {
        setError(
          "Google Sign-In is not configured. Provide oauth-config.js or OAUTH_CLIENT_ID at runtime.",
        );
        return;
      }
      try {
        await loadGoogleIdentityServices();
        if (cancelled || !buttonRef.current || !window.google?.accounts?.id) {
          return;
        }
        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: async ({ credential }) => {
            try {
              setError(null);
              await signIn(credential);
            } catch (signInError) {
              setError(
                signInError instanceof Error
                  ? signInError.message
                  : "Sign-in failed.",
              );
            }
          },
        });
        buttonRef.current.replaceChildren();
        window.google.accounts.id.renderButton(buttonRef.current, {
          type: "standard",
          theme: "outline",
          size: "large",
          text: "signin_with",
          shape: "pill",
        });
      } catch (loadError) {
        if (!cancelled) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Google Sign-In failed to load.",
          );
        }
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [signIn, localDev]);

  const continueLocally = async () => {
    setLocalPending(true);
    try {
      setError(null);
      await signInLocal();
    } catch (signInError) {
      setError(
        signInError instanceof Error
          ? signInError.message
          : "Local sign-in failed.",
      );
    } finally {
      setLocalPending(false);
    }
  };

  return (
    <main className="auth-screen">
      <section className="auth-card auth-card-wide">
        <div className="brand-mark">F</div>
        <span className="eyebrow">Your financial clarity</span>
        <h1>A calmer way to read your ledger.</h1>
        <p className="auth-copy">
          See the shape of your money across accounts, transactions, months,
          and years—without losing the detail underneath.
        </p>
        <div className="auth-highlights">
          <span>Private by design</span>
          <span>Double-entry aware</span>
          <span>Built for your data</span>
        </div>
        {localDev ? (
          <button
            className="button button-primary local-login"
            disabled={localPending}
            onClick={() => void continueLocally()}
            type="button"
          >
            Continue locally
          </button>
        ) : (
          <div ref={buttonRef} className="google-button" />
        )}
        {error && <p className="error-text">{error}</p>}
      </section>
    </main>
  );
}

function loadGoogleIdentityServices(): Promise<void> {
  if (window.google?.accounts?.id) {
    return Promise.resolve();
  }
  return new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      "script[data-google-identity]",
    );
    if (existing) {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener(
        "error",
        () => reject(new Error("Failed to load Google Sign-In.")),
        { once: true },
      );
      return;
    }
    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.dataset.googleIdentity = "true";
    script.addEventListener("load", () => resolve(), { once: true });
    script.addEventListener(
      "error",
      () => reject(new Error("Failed to load Google Sign-In.")),
      { once: true },
    );
    document.head.appendChild(script);
  });
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}

