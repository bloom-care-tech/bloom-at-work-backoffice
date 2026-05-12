import { useEffect } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import { BackofficeLayout } from "@/components/backoffice/BackofficeLayout";
import { useBackofficeSession } from "@/lib/backoffice-session";

export function ProtectedLayout() {
  const { auth } = useBackofficeSession();
  const navigate = useNavigate();

  useEffect(() => {
    if (!auth || auth.kind !== "backoffice") navigate("/login", { replace: true });
  }, [auth, navigate]);

  if (!auth || auth.kind !== "backoffice") return null;

  return <BackofficeLayout />;
}
