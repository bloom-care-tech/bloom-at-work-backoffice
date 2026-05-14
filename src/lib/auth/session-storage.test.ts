import { AUTH_STORAGE_KEY, readPersistedAuth, writePersistedAuth, type PersistedAuth } from "./session-storage";

const validAuth: PersistedAuth = {
  kind: "backoffice",
  accessToken: "tok",
  refreshToken: "ref",
  me: {
    id: "u1",
    email: "a@b.co",
    name: "N",
    displayName: "N",
    role: "admin",
    status: "ativo",
    company: { id: "c1", name: "Co", logoUrl: null },
    firstAccessCompleted: true,
  },
  createdAt: "2026-01-01T00:00:00.000Z",
};

describe("session-storage", () => {
  it("readPersistedAuth returns null when key is missing", () => {
    expect(readPersistedAuth()).toBeNull();
  });

  it("readPersistedAuth returns parsed value and writePersistedAuth persists JSON", () => {
    writePersistedAuth(validAuth);
    expect(readPersistedAuth()).toEqual(validAuth);
    const raw = localStorage.getItem(AUTH_STORAGE_KEY);
    expect(raw).toBeTruthy();
    expect(JSON.parse(raw!)).toEqual(validAuth);
  });

  it("readPersistedAuth clears storage when shape is invalid", () => {
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify({ kind: "wrong", accessToken: "x", createdAt: "y" }));
    expect(readPersistedAuth()).toBeNull();
    expect(localStorage.getItem(AUTH_STORAGE_KEY)).toBeNull();
  });

  it("readPersistedAuth returns null on invalid JSON without throwing", () => {
    localStorage.setItem(AUTH_STORAGE_KEY, "{not-json");
    expect(readPersistedAuth()).toBeNull();
  });

  it("writePersistedAuth(null) removes the key", () => {
    writePersistedAuth(validAuth);
    writePersistedAuth(null);
    expect(localStorage.getItem(AUTH_STORAGE_KEY)).toBeNull();
  });
});
