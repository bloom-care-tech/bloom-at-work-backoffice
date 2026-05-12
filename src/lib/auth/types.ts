/** Mirrors backend AuthUserJson / MeUserJson (SPEC-001). */

export interface AuthCompanyJson {
  id: string;
  name: string;
  logoUrl: string | null;
}

export interface AuthUserJson {
  id: string;
  name: string | null;
  displayName: string | null;
  role: string;
  status: string;
  isAdmin: boolean;
  company: AuthCompanyJson;
  firstAccessCompleted: boolean;
}

export interface MeUserJson extends AuthUserJson {
  email: string;
}

export interface LoginSuccessBody {
  accessToken: string;
  refreshToken: string;
  user: AuthUserJson;
}

export interface RefreshBody {
  accessToken: string;
  refreshToken: string;
}

export interface RequestOtpBody {
  message: string;
}

export interface VerifyOtpBody {
  message: string;
  registrationToken: string;
}

export interface MessageBody {
  message: string;
}
