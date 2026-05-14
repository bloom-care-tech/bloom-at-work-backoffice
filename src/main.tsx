import * as Sentry from "@sentry/react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import { ClientErrorFallback, initClientSentry } from "./lib/sentry";
import "./index.css";

initClientSentry();

createRoot(document.getElementById("root")!).render(
  <Sentry.ErrorBoundary fallback={<ClientErrorFallback />} showDialog={false}>
    <App />
  </Sentry.ErrorBoundary>,
);
