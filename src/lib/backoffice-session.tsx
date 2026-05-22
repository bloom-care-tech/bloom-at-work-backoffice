import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { getMeAuthed, logoutUserSession } from "@/lib/auth/auth-api";
import { readPersistedAuth, writePersistedAuth, replacePersistedMe, type PersistedAuth } from "@/lib/auth/session-storage";

interface BackofficeSessionValue {
  auth: PersistedAuth | null;
  signOut: () => void;
  refreshMe: () => Promise<void>;
}

const BackofficeSessionContext = createContext<BackofficeSessionValue | null>(null);

export function BackofficeSessionProvider({ children }: { children: ReactNode }) {
  const [auth, setAuth] = useState<PersistedAuth | null>(() => readPersistedAuth());

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
      signOut,
      refreshMe,
    }),
    [auth, signOut, refreshMe],
  );

  return <BackofficeSessionContext.Provider value={value}>{children}</BackofficeSessionContext.Provider>;
}

export function useBackofficeSession(): BackofficeSessionValue {
  const ctx = useContext(BackofficeSessionContext);
  if (!ctx) throw new Error("useBackofficeSession must be used within BackofficeSessionProvider");
  return ctx;
}
