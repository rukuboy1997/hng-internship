// API client for https://whisperbox.koyeb.app/
// Handles auth, token refresh, and all API calls

const BASE_URL = "https://whisperbox.koyeb.app";

// ─── Token storage (sessionStorage — cleared on tab close) ───────────────────

export function getAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  return sessionStorage.getItem("wb_access_token");
}

export function getRefreshToken(): string | null {
  if (typeof window === "undefined") return null;
  return sessionStorage.getItem("wb_refresh_token");
}

export function storeTokens(accessToken: string, refreshToken: string) {
  sessionStorage.setItem("wb_access_token", accessToken);
  sessionStorage.setItem("wb_refresh_token", refreshToken);
}

export function clearTokens() {
  sessionStorage.removeItem("wb_access_token");
  sessionStorage.removeItem("wb_refresh_token");
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface UserProfile {
  id: string;
  username: string;
  display_name: string;
  public_key: string;
  wrapped_private_key: string;
  pbkdf2_salt: string;
  created_at: string;
}

export interface AuthResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
  user: UserProfile;
}

export interface UserPublicInfo {
  id: string;
  username: string;
  display_name: string;
}

export interface ConversationSummary {
  user_id: string;
  display_name: string;
  username: string;
  last_message_at: string | null;
}

export interface EncryptedPayload {
  ciphertext: string;
  iv: string;
  encryptedKey: string;
  encryptedKeyForSelf: string;
}

export interface MessageResponse {
  id: string;
  from_user_id: string;
  to_user_id: string;
  payload: EncryptedPayload;
  delivered: boolean;
  created_at: string;
}

// ─── Core fetch wrapper ───────────────────────────────────────────────────────

let isRefreshing = false;
let refreshPromise: Promise<string | null> | null = null;

async function doRefresh(): Promise<string | null> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return null;
  try {
    const res = await fetch(`${BASE_URL}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const current = getRefreshToken()!;
    storeTokens(data.access_token, current);
    return data.access_token;
  } catch {
    return null;
  }
}

async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
  retry = true
): Promise<T> {
  const token = getAccessToken();
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers ?? {}),
  };

  const res = await fetch(`${BASE_URL}${path}`, { ...options, headers });

  if (res.status === 401 && retry) {
    // Try to refresh
    if (!isRefreshing) {
      isRefreshing = true;
      refreshPromise = doRefresh().finally(() => {
        isRefreshing = false;
        refreshPromise = null;
      });
    }
    const newToken = await refreshPromise;
    if (!newToken) {
      clearTokens();
      throw new ApiError(401, "Session expired. Please log in again.");
    }
    return apiFetch<T>(path, options, false);
  }

  if (!res.ok) {
    let message = `HTTP ${res.status}`;
    try {
      const body = await res.json();
      message = body.detail ?? body.message ?? message;
    } catch {
      // ignore
    }
    throw new ApiError(res.status, message);
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = "ApiError";
  }
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

export interface RegisterPayload {
  username: string;
  display_name: string;
  password: string;
  public_key: string;
  wrapped_private_key: string;
  pbkdf2_salt: string;
}

export async function register(payload: RegisterPayload): Promise<AuthResponse> {
  return apiFetch<AuthResponse>("/auth/register", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function login(
  username: string,
  password: string
): Promise<AuthResponse> {
  return apiFetch<AuthResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ username, password }),
  });
}

export async function getMe(): Promise<UserProfile> {
  return apiFetch<UserProfile>("/auth/me");
}

export async function logout(refreshToken: string): Promise<void> {
  await apiFetch<void>("/auth/logout", {
    method: "POST",
    body: JSON.stringify({ refresh_token: refreshToken }),
  });
}

// ─── Users ────────────────────────────────────────────────────────────────────

export async function searchUsers(q: string): Promise<UserPublicInfo[]> {
  return apiFetch<UserPublicInfo[]>(
    `/users/search?q=${encodeURIComponent(q)}`
  );
}

export async function getUserPublicKey(userId: string): Promise<string> {
  const res = await apiFetch<{ public_key: string }>(
    `/users/${userId}/public-key`
  );
  return res.public_key;
}

// ─── Conversations ────────────────────────────────────────────────────────────

export async function getConversations(): Promise<ConversationSummary[]> {
  return apiFetch<ConversationSummary[]>("/conversations");
}

export async function getMessages(
  userId: string,
  limit = 50,
  before?: string
): Promise<MessageResponse[]> {
  const params = new URLSearchParams({ limit: String(limit) });
  if (before) params.set("before", before);
  return apiFetch<MessageResponse[]>(
    `/conversations/${userId}/messages?${params}`
  );
}

// ─── Messages ─────────────────────────────────────────────────────────────────

export async function sendMessage(
  to: string,
  payload: EncryptedPayload
): Promise<MessageResponse> {
  return apiFetch<MessageResponse>("/messages", {
    method: "POST",
    body: JSON.stringify({ to, payload }),
  });
}

// ─── WebSocket URL ────────────────────────────────────────────────────────────

export function getWebSocketUrl(): string {
  const token = getAccessToken();
  return `wss://whisperbox.koyeb.app/ws${token ? `?token=${token}` : ""}`;
}
