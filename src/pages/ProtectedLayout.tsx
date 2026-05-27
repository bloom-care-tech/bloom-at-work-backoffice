import { useLayoutEffect } from "react";
import { Navigate } from "react-router-dom";
import { BackofficeLayout } from "@/components/backoffice/BackofficeLayout";
import { useBackofficeSession } from "@/lib/backoffice-session";
import { isBloomBackofficeOperator } from "@/lib/auth/backoffice-access";
import { writePersistedAuth } from "@/lib/auth/session-storage";

export function ProtectedLayout() {
  const { auth, sessionStatus, retrySessionRestore } = useBackofficeSession();

  useLayoutEffect(() => {
    if (auth?.kind === "backoffice" && !isBloomBackofficeOperator(auth.me)) {
      writePersistedAuth(null);
    }
  }, [auth]);

  if (sessionStatus === "loading") {
    return (
      <div className="min-h-screen bg-bloom-cream flex items-center justify-center font-ui text-sm text-bloom-aubergine/70">
        Restaurando sessão…
      </div>
    );
  }

  if (sessionStatus === "unavailable") {
    return (
      <div className="min-h-screen bg-bloom-cream flex flex-col items-center justify-center gap-4 px-4 text-center">
        <p className="font-ui text-sm text-bloom-aubergine/80 max-w-md">
          Não foi possível contactar a API. Se você reiniciou o backend, aguarde alguns segundos e tente novamente.
        </p>
        <button
          type="button"
          className="font-ui text-sm text-bloom-garnet underline underline-offset-2"
          onClick={() => void retrySessionRestore()}
        >
          Tentar novamente
        </button>
      </div>
    );
  }

  if (!auth || auth.kind !== "backoffice") {
    return <Navigate to="/login" replace />;
  }
  if (!isBloomBackofficeOperator(auth.me)) {
    return <Navigate to="/login" replace />;
  }

  return <BackofficeLayout />;
}
