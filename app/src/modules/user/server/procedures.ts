import axios, { type AxiosError } from "axios";
import { cookies } from "next/headers";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { baseProcedure, createTRPCRouter, getUserProcedure } from "@/trpc/init";
import type {
  ApiKey,
  AuthMessage,
  AuthUser,
  CreatedApiKey,
  OAuthStartResponse,
  RegisterResponse,
  TokenResponse,
} from "@/modules/user/types";

const apiRoot = () => {
  const base = (process.env.BASE_API || "http://localhost:8000/api").replace(/\/$/, "");
  return base.endsWith("/api") ? base : `${base}/api`;
};

const authApi = () => `${apiRoot()}/v1/auth`;

type BackendError = {
  detail?: string | Array<{ msg?: string; message?: string }>;
  message?: string;
};

const getBackendMessage = (data: BackendError | undefined, fallback: string) => {
  if (typeof data?.detail === "string") return data.detail;
  if (Array.isArray(data?.detail)) return data.detail.map((item) => item.msg || item.message).filter(Boolean).join(", ") || fallback;
  return data?.message || fallback;
};

const authError = (error: unknown, fallback: string): never => {
  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError<BackendError>;
    if (!axiosError.response) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Authentication service is unavailable. Check BASE_API and make sure the API server is running.",
      });
    }
    const status = axiosError.response?.status;
    const code: TRPCError["code"] =
      status === 401 ? "UNAUTHORIZED" : status === 403 ? "FORBIDDEN" : status === 404 ? "NOT_FOUND" : status === 409 ? "CONFLICT" : "BAD_REQUEST";

    throw new TRPCError({
      code,
      message: getBackendMessage(axiosError.response?.data, fallback),
      cause: { status, requestId: axiosError.response?.headers?.["x-request-id"] },
    });
  }

  throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: fallback });
};

const getAccessToken = async () => (await cookies()).get("access_token")?.value;
const getRefreshToken = async () => (await cookies()).get("refresh_token")?.value;

const setAuthCookies = async (tokens: TokenResponse) => {
  const cookieStore = await cookies();
  const options = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
  };

  cookieStore.set("access_token", tokens.access_token, {
    ...options,
    maxAge: tokens.expires_in,
  });
  cookieStore.set("refresh_token", tokens.refresh_token, {
    ...options,
    maxAge: 60 * 60 * 24 * 30,
  });
};

const clearAuthCookies = async () => {
  const cookieStore = await cookies();
  cookieStore.delete("access_token");
  cookieStore.delete("refresh_token");
  cookieStore.delete("workspace_id");
};

const authHeaders = async () => ({
  Authorization: `Bearer ${await getAccessToken()}`,
});

export const userRouter = createTRPCRouter({
  register: baseProcedure
    .input(z.object({
      email: z.string().email(),
      password: z.string().min(6).max(256),
      display_name: z.string().trim().min(2).max(160).optional(),
    }))
    .mutation(async ({ input }): Promise<RegisterResponse> => {
      try {

        const response = await axios.post<RegisterResponse>(`${authApi()}/register`, input);
        return response.data;
      } catch (error) {

        return authError(error, "Registration failed");
      }
    }),

  login: baseProcedure
    .input(z.object({ email: z.string().email(), password: z.string().min(1) }))
    .mutation(async ({ input }): Promise<TokenResponse> => {
      try {
        const response = await axios.post<TokenResponse>(`${authApi()}/login`, input);
        await setAuthCookies(response.data);
        return response.data;
      } catch (error) {
        return authError(error, "Login failed");
      }
    }),

  verifyEmail: baseProcedure
    .input(z.object({ email: z.string().email(), token: z.string().min(1) }))
    .mutation(async ({ input }): Promise<AuthUser> => {
      try {
        const response = await axios.post<AuthUser>(`${authApi()}/verify-email`, input);
        return response.data;
      } catch (error) {
        return authError(error, "Email verification failed");
      }
    }),

  resendVerification: baseProcedure
    .input(z.object({ email: z.string().email() }))
    .mutation(async ({ input }): Promise<AuthMessage> => {
      try {
        const response = await axios.post<AuthMessage>(`${authApi()}/resend-verification`, input);
        return response.data;
      } catch (error) {
        return authError(error, "Could not resend verification email");
      }
    }),

  forgotPassword: baseProcedure
    .input(z.object({ email: z.string().email() }))
    .mutation(async ({ input }): Promise<AuthMessage> => {
      try {
        const response = await axios.post<AuthMessage>(`${authApi()}/forgot-password`, input);
        return response.data;
      } catch (error) {
        return authError(error, "Could not start password recovery");
      }
    }),

  resetPassword: baseProcedure
    .input(z.object({ token: z.string().min(1), password: z.string().min(12).max(256) }))
    .mutation(async ({ input }) => {
      try {
        await axios.post(`${authApi()}/reset-password`, input);
        return { success: true };
      } catch (error) {
        return authError(error, "Could not reset password");
      }
    }),

  refresh: baseProcedure.mutation(async (): Promise<TokenResponse> => {
    const refreshToken = await getRefreshToken();
    if (!refreshToken) throw new TRPCError({ code: "UNAUTHORIZED", message: "Session expired" });

    try {
      const response = await axios.post<TokenResponse>(`${authApi()}/refresh`, { refresh_token: refreshToken });
      await setAuthCookies(response.data);
      return response.data;
    } catch (error) {
      await clearAuthCookies();
      return authError(error, "Session expired");
    }
  }),

  logout: baseProcedure.mutation(async () => {
    const refreshToken = await getRefreshToken();
    try {
      if (refreshToken) await axios.post(`${authApi()}/logout`, { refresh_token: refreshToken });
    } catch {
      // Always clear local session cookies, even when the remote session is already invalid.
    }
    await clearAuthCookies();
    return { success: true };
  }),

  me: baseProcedure.query(async (): Promise<AuthUser> => {
    try {
      const response = await axios.get<AuthUser>(`${authApi()}/me`, { headers: await authHeaders() });
      return response.data;
    } catch (error) {
      return authError(error, "Could not load your account");
    }
  }),

  updateProfile: getUserProcedure.input(z.object({ display_name: z.string().trim().min(2).max(160).nullable() })).mutation(async ({ input }): Promise<AuthUser> => {
    try {
      const response = await axios.patch<AuthUser>(`${authApi()}/me`, input, { headers: await authHeaders() });
      return response.data;
    } catch (error) {
      return authError(error, "Could not update your profile");
    }
  }),

  logoutAll: getUserProcedure.mutation(async () => {
    try {
      await axios.post(`${authApi()}/logout-all`, {}, { headers: await authHeaders() });
      await clearAuthCookies();
      return { success: true };
    } catch (error) {
      return authError(error, "Could not end active sessions");
    }
  }),

  profile: getUserProcedure.query(({ ctx }) => ctx.user as AuthUser),

  googleSignIn: baseProcedure.mutation((): OAuthStartResponse => ({
    provider: "google",
    url: `${authApi()}/google`,
  })),

  githubSignIn: baseProcedure.mutation((): OAuthStartResponse => ({
    provider: "github",
    url: `${authApi()}/github`,
  })),

  createApiKey: baseProcedure
    .input(z.object({ name: z.string().trim().min(1).max(120) }))
    .mutation(async ({ input }): Promise<CreatedApiKey> => {
      try {
        const response = await axios.post<CreatedApiKey>(`${authApi()}/api-keys`, input, { headers: await authHeaders() });
        return response.data;
      } catch (error) {
        return authError(error, "Could not create API key");
      }
    }),

  listApiKeys: baseProcedure.query(async (): Promise<ApiKey[]> => {
    try {
      const response = await axios.get<ApiKey[]>(`${authApi()}/api-keys`, { headers: await authHeaders() });
      return response.data;
    } catch (error) {
      return authError(error, "Could not load API keys");
    }
  }),

  revokeApiKey: baseProcedure
    .input(z.object({ keyId: z.string().min(1) }))
    .mutation(async ({ input }) => {
      try {
        await axios.delete(`${authApi()}/api-keys/${encodeURIComponent(input.keyId)}`, { headers: await authHeaders() });
        return { success: true };
      } catch (error) {
        return authError(error, "Could not revoke API key");
      }
    }),

});
