import { useLayoutEffect } from "react";
import { useLocation } from "react-router-dom";

/**
 * Restores window scroll position after in-app navigation (React Router does not scroll by default).
 */
export function ScrollToTop() {
  const { pathname } = useLocation();

  useLayoutEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
}
