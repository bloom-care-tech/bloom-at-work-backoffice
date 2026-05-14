import type { MeUserJson } from "./types";

/** Bloom platform operators (`UserRole.admin` in API / profiles). */
export function isBloomBackofficeOperator(me: Pick<MeUserJson, "role">): boolean {
  return me.role === "admin";
}
