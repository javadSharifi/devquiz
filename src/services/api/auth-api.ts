/* ============================================================
 * DevQuiz — services/api/auth-api.ts
 * Cloudflare Edge API Client for Authentication and Cloud Sync.
 * ============================================================ */

import { getLocal, setLocal, removeLocal } from '../storage/chrome-storage.js';
import type { AuthUser, Gamification, UserQuestionState } from '../../types.js';

export const AUTH_TOKEN_KEY = 'auth_token';
export const AUTH_USER_KEY = 'auth_user';
export const API_BASE_URL_KEY = 'api_base_url';
export const LAST_SYNCED_KEY = 'last_synced_at';

export const DEFAULT_DEV_API_URL = 'http://127.0.0.1:8787';
export const DEFAULT_PROD_API_URL = 'https://devquiz-api.mohammadjavadsharifi98.workers.dev';

export function getDefaultApiBaseUrl(): string {
  return DEFAULT_PROD_API_URL;
}


export async function getApiBaseUrl(): Promise<string> {
  const custom = await getLocal<string | null>(API_BASE_URL_KEY, null);
  if (custom && custom.trim().length > 0) {
    return custom.trim().replace(/\/+$/, '');
  }
  return getDefaultApiBaseUrl();
}

export async function setApiBaseUrl(url: string): Promise<void> {
  const clean = url.trim().replace(/\/+$/, '');
  if (!clean || clean === getDefaultApiBaseUrl()) {
    await removeLocal(API_BASE_URL_KEY);
  } else {
    await setLocal(API_BASE_URL_KEY, clean);
  }
}

export async function getStoredToken(): Promise<string | null> {
  return getLocal<string | null>(AUTH_TOKEN_KEY, null);
}

export async function getStoredUser(): Promise<AuthUser | null> {
  return getLocal<AuthUser | null>(AUTH_USER_KEY, null);
}

export async function getStoredLastSynced(): Promise<number | null> {
  return getLocal<number | null>(LAST_SYNCED_KEY, null);
}

export async function saveAuthSession(user: AuthUser, token: string): Promise<void> {
  await Promise.all([
    setLocal(AUTH_USER_KEY, user),
    setLocal(AUTH_TOKEN_KEY, token),
  ]);
}

export async function clearAuthSession(): Promise<void> {
  await Promise.all([
    removeLocal(AUTH_USER_KEY),
    removeLocal(AUTH_TOKEN_KEY),
    removeLocal(LAST_SYNCED_KEY),
  ]);
}

export async function saveLastSyncedAt(timestamp: number): Promise<void> {
  await setLocal(LAST_SYNCED_KEY, timestamp);
}

interface RequestOptions {
  method?: string;
  body?: unknown;
  token?: string | null;
  timeoutMs?: number;
}

async function apiRequest<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const baseUrl = await getApiBaseUrl();
  const url = `${baseUrl}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), options.timeoutMs ?? 10_000);

  const headers: Record<string, string> = {
    'Content-Type': 'application/json; charset=utf-8',
  };
  if (options.token) {
    headers['Authorization'] = `Bearer ${options.token}`;
  }

  try {
    const res = await fetch(url, {
      method: options.method || 'GET',
      headers,
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
      signal: controller.signal,
      keepalive: options.method === 'POST',
    });

    let data: unknown;
    try {
      data = await res.json();
    } catch {
      throw new Error(`خطای سرور (${res.status})`);
    }

    if (!res.ok) {
      const errObj = data as { error?: string };
      throw new Error(errObj?.error || `خطای سرور (${res.status})`);
    }

    return data as T;
  } catch (e) {
    if (e instanceof DOMException && e.name === 'AbortError') {
      throw new Error('اتصال به سرور بیش از حد طول کشید (Timeout).');
    }
    if (e instanceof TypeError && e.message.includes('fetch')) {
      throw new Error('ارتباط با سرور Cloudflare برقرار نشد. وضعیت اینترنت یا آدرس سرور را بررسی کنید.');
    }
    throw e instanceof Error ? e : new Error('خطای ناشناخته در ارتباط با سرور.');
  } finally {
    clearTimeout(timer);
  }
}

export async function registerApi(
  email: string,
  password: string,
  name?: string,
  extra?: { website?: string },
): Promise<{ user: AuthUser; token: string }> {
  return apiRequest<{ user: AuthUser; token: string }>('/api/auth/register', {
    method: 'POST',
    body: { email, password, name, ...extra },
  });
}

export async function loginApi(
  email: string,
  password: string,
): Promise<{ user: AuthUser; token: string }> {
  return apiRequest<{ user: AuthUser; token: string }>('/api/auth/login', {
    method: 'POST',
    body: { email, password },
  });
}

export async function getMeApi(token: string): Promise<AuthUser> {
  const res = await apiRequest<{ user: AuthUser }>('/api/auth/me', {
    method: 'GET',
    token,
  });
  return res.user;
}

export interface CloudSyncData {
  userStates: Record<string, { state: string; updatedAt: number }>;
  gamification: { streak: number; xp: number; lastActiveDate: string };
  downloadedTopics?: string[];
}

export async function pullCloudData(token: string): Promise<CloudSyncData> {
  return apiRequest<CloudSyncData>('/api/user/sync', {
    method: 'GET',
    token,
  });
}

export async function pushCloudData(
  token: string,
  payload: {
    userStates?: Record<string, { state: string; updatedAt: number }>;
    gamification?: Gamification;
    downloadedTopics?: string[];
  },
): Promise<{ success: boolean; syncedCount: number }> {
  return apiRequest<{ success: boolean; syncedCount: number }>('/api/user/sync', {
    method: 'POST',
    token,
    body: payload,
  });
}

