/* ============================================================
 * backend/src/index.ts
 * Main Cloudflare Worker router for DevQuiz API.
 * Handles CORS, Authentication, Topics delivery, and Progress sync.
 * ============================================================ */

import { generateSalt, hashPassword, signJwt, verifyJwt, verifyPassword } from './auth.js';
import { getCatalog, getTopicById } from './topics.js';
import { getUserCloudData, saveUserCloudData, type SyncPayload } from './sync.js';

export interface Env {
  DB: D1Database;
  JWT_SECRET?: string;
}

const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Max-Age': '86400',
};

// ----------------------------------------------------
// In-memory IP Rate Limiter
// ----------------------------------------------------
interface RateLimitBucket {
  count: number;
  resetAt: number;
}
const rateLimitMap = new Map<string, RateLimitBucket>();

function checkRateLimit(ip: string, action: string, maxRequests: number, windowMs: number): boolean {
  if (!ip || ip === 'unknown' || ip === '127.0.0.1') return true;
  const key = `${action}:${ip}`;
  const now = Date.now();
  const bucket = rateLimitMap.get(key);

  if (!bucket || now > bucket.resetAt) {
    rateLimitMap.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }

  if (bucket.count >= maxRequests) {
    return false;
  }

  bucket.count++;
  return true;
}

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      ...CORS_HEADERS,
    },
  });
}

function errorResponse(message: string, status = 400): Response {
  return jsonResponse({ error: message }, status);
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const method = request.method.toUpperCase();

    // 1. Handle CORS preflight
    if (method === 'OPTIONS') {
      return new Response(null, { headers: CORS_HEADERS });
    }

    const secret = env.JWT_SECRET || 'devquiz-default-secret-change-me';

    // Helper to get authenticated user
    async function getAuthUser(): Promise<{ userId: string; email: string; name: string } | null> {
      const authHeader = request.headers.get('Authorization');
      if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
      const token = authHeader.substring(7);
      return await verifyJwt(token, secret);
    }

    try {
      // ----------------------------------------------------
      // Health check
      // ----------------------------------------------------
      if (url.pathname === '/' || url.pathname === '/api/health') {
        return jsonResponse({
          status: 'ok',
          service: 'DevQuiz Cloudflare Edge API',
          version: '1.0.0',
          timestamp: Date.now(),
        });
      }

      // ----------------------------------------------------
      // Topics & Catalog Delivery (No auth required)
      // ----------------------------------------------------
      if (method === 'GET' && url.pathname === '/api/topics/catalog') {
        const baseUrl = `${url.protocol}//${url.host}`;
        const catalog = getCatalog(baseUrl);
        return jsonResponse(catalog);
      }

      if (method === 'GET' && url.pathname.startsWith('/api/topics/')) {
        const topicId = url.pathname.replace('/api/topics/', '');
        const topic = getTopicById(topicId);
        if (!topic) {
          return errorResponse(`موضوع «${topicId}» یافت نشد.`, 404);
        }
        return jsonResponse(topic);
      }

      // ----------------------------------------------------
      // Auth: Register
      // ----------------------------------------------------
      if (method === 'POST' && url.pathname === '/api/auth/register') {
        const clientIp = request.headers.get('cf-connecting-ip') || 'unknown';
        if (!checkRateLimit(clientIp, 'register', 5, 60 * 60 * 1000)) {
          return errorResponse('تعداد تلاش‌های ثبت‌نام از این آی‌پی بیش از حد مجاز است. لطفاً ۱ ساعت دیگر امتحان کنید.', 429);
        }

        const body = (await request.json()) as {
          email?: string;
          password?: string;
          name?: string;
          website?: string;
        };

        // Honeypot check: automated spammers fill hidden fields
        if (body.website && body.website.trim().length > 0) {
          return errorResponse('درخواست نامعتبر است.', 400);
        }

        const email = body.email?.trim().toLowerCase();
        const password = body.password?.trim();
        const name = body.name?.trim() || email?.split('@')[0] || 'کاربر';

        if (!email || !email.includes('@')) {
          return errorResponse('ایمیل نامعتبر است.');
        }
        if (!password || password.length < 6) {
          return errorResponse('رمز عبور باید حداقل ۶ کاراکتر باشد.');
        }

        // Check existing user
        const existing = await env.DB
          .prepare('SELECT id FROM users WHERE email = ?')
          .bind(email)
          .first();

        if (existing) {
          return errorResponse('این ایمیل قبلاً ثبت‌نام کرده است.', 409);
        }

        const userId = crypto.randomUUID();
        const salt = generateSalt();
        const passwordHash = await hashPassword(password, salt);
        const now = Date.now();

        await env.DB
          .prepare(
            'INSERT INTO users (id, email, password_hash, salt, name, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
          )
          .bind(userId, email, passwordHash, salt, name, now, now)
          .run();

        const token = await signJwt({ userId, email, name }, secret);

        return jsonResponse({
          user: { id: userId, email, name },
          token,
        }, 201);
      }

      // ----------------------------------------------------
      // Auth: Login
      // ----------------------------------------------------
      if (method === 'POST' && url.pathname === '/api/auth/login') {
        const clientIp = request.headers.get('cf-connecting-ip') || 'unknown';
        if (!checkRateLimit(clientIp, 'login', 12, 15 * 60 * 1000)) {
          return errorResponse('تعداد تلاش‌های ورود بیش از حد مجاز است. لطفاً ۱۵ دقیقه دیگر امتحان کنید.', 429);
        }

        const body = (await request.json()) as {
          email?: string;
          password?: string;
        };

        const email = body.email?.trim().toLowerCase();
        const password = body.password?.trim();

        if (!email || !password) {
          return errorResponse('ایمیل و رمز عبور الزامی است.');
        }

        const user = await env.DB
          .prepare('SELECT id, email, password_hash, salt, name FROM users WHERE email = ?')
          .bind(email)
          .first<{ id: string; email: string; password_hash: string; salt: string; name: string }>();

        if (!user) {
          return errorResponse('ایمیل یا رمز عبور اشتباه است.', 401);
        }

        const valid = await verifyPassword(password, user.salt, user.password_hash);
        if (!valid) {
          return errorResponse('ایمیل یا رمز عبور اشتباه است.', 401);
        }

        const token = await signJwt({ userId: user.id, email: user.email, name: user.name }, secret);

        return jsonResponse({
          user: { id: user.id, email: user.email, name: user.name },
          token,
        });
      }

      // ----------------------------------------------------
      // Auth: Me (Current user profile)
      // ----------------------------------------------------
      if (method === 'GET' && url.pathname === '/api/auth/me') {
        const authUser = await getAuthUser();
        if (!authUser) return errorResponse('نیاز به ورود به سیستم است.', 401);

        const user = await env.DB
          .prepare('SELECT id, email, name, created_at FROM users WHERE id = ?')
          .bind(authUser.userId)
          .first();

        if (!user) return errorResponse('کاربر یافت نشد.', 404);
        return jsonResponse({ user });
      }

      // ----------------------------------------------------
      // User Sync: GET (Download cloud states & XP)
      // ----------------------------------------------------
      if (method === 'GET' && url.pathname === '/api/user/sync') {
        const authUser = await getAuthUser();
        if (!authUser) return errorResponse('نیاز به ورود به سیستم است.', 401);

        const data = await getUserCloudData(env.DB, authUser.userId);
        return jsonResponse(data);
      }

      // ----------------------------------------------------
      // User Sync: POST (Push local states & XP to cloud)
      // ----------------------------------------------------
      if (method === 'POST' && url.pathname === '/api/user/sync') {
        const authUser = await getAuthUser();
        if (!authUser) return errorResponse('نیاز به ورود به سیستم است.', 401);

        const body = (await request.json()) as SyncPayload;
        const result = await saveUserCloudData(env.DB, authUser.userId, body);
        return jsonResponse(result);
      }

      return errorResponse('مسیر یافت نشد.', 404);
    } catch (err) {
      console.error('API Error:', err);
      return errorResponse('خطای داخلی سرور رخ داد.', 500);
    }
  },
};
