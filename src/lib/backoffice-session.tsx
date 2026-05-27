import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { getMeAuthed, logoutUserSession } from "@/lib/auth/auth-api";
import { ensureAccessToken } from "@/lib/auth/api-client";
import {
  readAccessToken,
  readPersistedAuth,
  writePersistedAuth,
  replacePersistedMe,
  type PersistedAuth,
} from "@/lib/auth/session-storage";

export type BackofficeSessionStatus = "loading" | "ready" | "unavailable";

interface BackofficeSessionValue {
  auth: PersistedAuth | null;
  sessionStatus: BackofficeSessionStatus;
  signOut: () => void;
  refreshMe: () => Promise<void>;
  retrySessionRestore: () => Promise<void>;
}

const BackofficeSessionContext = createContext<BackofficeSessionValue | null>(null);

function needsSessionRestore(): boolean {
  return readPersistedAuth() !== null && readAccessToken() === null;
}

export function BackofficeSessionProvider({ children }: { children: ReactNode }) {
  const [auth, setAuth] = useState<PersistedAuth | null>(() => readPersistedAuth());
  const [sessionStatus, setSessionStatus] = useState<BackofficeSessionStatus>(() =>
    needsSessionRestore() ? "loading" : "ready",
  );

  const restoreAccessToken = useCallback(async () => {
    if (!needsSessionRestore()) {
      setSessionStatus("ready");
      return;
    }
    setSessionStatus("loading");
    const result = await ensureAccessToken();
    setSessionStatus(result === "unavailable" ? "unavailable" : "ready");
    if (result === "auth_failed") {
      setAuth(null);
    }
  }, []);

  useEffect(() => {
    void restoreAccessToken();
  }, [restoreAccessToken]);

  useEffect(() => {
    const onChange = () => setAuth(readPersistedAuth());
    window.addEventListener("bloom-backoffice-auth-changed", onChange);
    return () => window.removeEventListener("bloom-backoffice-auth-changed", onChange);
  }, []);

  const signOut = useCallback(() => {
    void (async () => {
      try {
        await logoutUserSession();
      } catch {
        /* ignore */
      }
      writePersistedAuth(null);
    })();
  }, []);

  const refreshMe = useCallback(async () => {
    try {
      const me = await getMeAuthed();
      replacePersistedMe(me);
      setAuth(readPersistedAuth());
    } catch {
      writePersistedAuth(null);
      setAuth(null);
    }
  }, []);

  const value = useMemo(
    () => ({
      auth,
      sessionStatus,
      signOut,
      refreshMe,
      retrySessionRestore: restoreAccessToken,
    }),
    [auth, sessionStatus, signOut, refreshMe, restoreAccessToken],
  );

  return <BackofficeSessionContext.Provider value={value}>{children}</BackofficeSessionContext.Provider>;
}

export function useBackofficeSession(): BackofficeSessionValue {
  const ctx = useContext(BackofficeSessionContext);
  if (!ctx) throw new Error("useBackofficeSession must be used within BackofficeSessionProvider");
  return ctx;
}
