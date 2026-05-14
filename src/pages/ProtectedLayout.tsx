import { useLayoutEffect } from "react";
import { Navigate } from "react-router-dom";
import { BackofficeLayout } from "@/components/backoffice/BackofficeLayout";
import { useBackofficeSession } from "@/lib/backoffice-session";
import { isBloomBackofficeOperator } from "@/lib/auth/backoffice-access";
import { writePersistedAuth } from "@/lib/auth/session-storage";

export function ProtectedLayout() {
  const { auth } = useBackofficeSession();

  useLayoutEffect(() => {
    if (auth?.kind === "backoffice" && !isBloomBackofficeOperator(auth.me)) {
      writePersistedAuth(null);
    }
  }, [auth]);

  if (!auth || auth.kind !== "backoffice") {
    return <Navigate to="/login" replace />;
  }
  if (!isBloomBackofficeOperator(auth.me)) {
    return <Navigate to="/login" replace />;
  }

  return <BackofficeLayout />;
}
