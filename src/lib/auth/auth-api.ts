import { apiFetch } from "./api-client";
import type {
  LoginSuccessBody,
  MeUserJson,
  MessageBody,
  RefreshBody,
  RequestOtpBody,
  VerifyOtpBody,
} from "./types";

export async function requestOtp(email: string, inviteToken: string): Promise<RequestOtpBody> {
  return apiFetch<RequestOtpBody>("/auth/request-otp", {
    method: "POST",
    body: JSON.stringify({ email, inviteToken }),
  });
}

export async function verifyOtp(email: string, otp: string): Promise<VerifyOtpBody> {
  return apiFetch<VerifyOtpBody>("/auth/verify-otp", {
    method: "POST",
    body: JSON.stringify({ email, otp }),
  });
}

export async function completeSignup(
  registrationToken: string,
  password: string,
): Promise<LoginSuccessBody> {
  return apiFetch<LoginSuccessBody>("/auth/complete-signup", {
    method: "POST",
    body: JSON.stringify({ registrationToken, password }),
  });
}

export async function login(email: string, password: string): Promise<LoginSuccessBody> {
  return apiFetch<LoginSuccessBody>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export async function requestPasswordReset(email: string): Promise<MessageBody> {
  return apiFetch<MessageBody>("/auth/request-password-reset", {
    method: "POST",
    body: JSON.stringify({ email }),
  });
}

export async function resetPassword(token: string, password: string): Promise<MessageBody> {
  return apiFetch<MessageBody>("/auth/reset-password", {
    method: "POST",
    body: JSON.stringify({ token, password }),
  });
}

export async function refreshSession(refreshToken: string): Promise<RefreshBody> {
  return apiFetch<RefreshBody>("/auth/refresh", {
    method: "POST",
    body: JSON.stringify({ refreshToken }),
  });
}

export async function logoutUserSession(accessToken: string): Promise<MessageBody> {
  try {
    return await apiFetch<MessageBody>("/auth/logout", {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}` },
    });
  } catch {
    return { message: "Sessão encerrada com sucesso." };
  }
}

export async function getMe(accessToken: string): Promise<MeUserJson> {
  return apiFetch<MeUserJson>("/api/me", {
    method: "GET",
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}

export interface CompleteFirstAccessPayload {
  name?: string;
  displayName?: string;
  acceptedPrivacyPolicyAt: string;
}

export async function completeFirstAccess(payload: CompleteFirstAccessPayload): Promise<MeUserJson> {
  return apiFetch<MeUserJson>("/api/me/complete-first-access", {
    method: "POST",
    auth: true,
    body: JSON.stringify(payload),
  });
}

export interface BackofficeLoginBody {
  accessToken: string;
  expiresIn: number;
}

export async function backofficeLogin(username: string, password: string): Promise<BackofficeLoginBody> {
  return apiFetch<BackofficeLoginBody>("/admin/backoffice/login", {
    method: "POST",
    body: JSON.stringify({ username, password }),
  });
}

export async function backofficeSessionPing(): Promise<{ ok: true }> {
  return apiFetch<{ ok: true }>("/admin/backoffice/session", {
    method: "GET",
    auth: true,
  });
}
