const DEFAULT_TIMEOUT_MS = 12_000;

function getBaseUrl() {
  const value = process.env.EXPO_PUBLIC_API_BASE_URL?.trim().replace(/\/$/, "");
  if (!value) throw new Error("EXPO_PUBLIC_API_BASE_URL غير مضبوط في إعدادات التطبيق.");
  if (!/^https?:\/\//i.test(value)) throw new Error("رابط Backend في EXPO_PUBLIC_API_BASE_URL غير صحيح.");
  return value;
}

export class ApiError extends Error {
  constructor(message: string, readonly status?: number) {
    super(message);
    this.name = "ApiError";
  }
}

export async function apiJson<T>(path: string, init?: RequestInit): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

  try {
    const response = await fetch(`${getBaseUrl()}${path.startsWith("/") ? path : `/${path}`}`, {
      ...init,
      signal: controller.signal,
      headers: { "Content-Type": "application/json", Accept: "application/json", ...(init?.headers || {}) },
    });

    const text = await response.text();
    let body: Record<string, unknown> = {};
    if (text) {
      try { body = JSON.parse(text) as Record<string, unknown>; }
      catch { throw new ApiError(`الخادم أعاد استجابة غير صالحة (HTTP ${response.status}).`, response.status); }
    }

    if (!response.ok) {
      throw new ApiError(typeof body.error === "string" ? body.error : "تعذر إكمال الطلب.", response.status);
    }

    return body as T;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    if (error instanceof Error && error.name === "AbortError") throw new ApiError("انتهت مهلة الاتصال. حاول مجددًا.");
    throw new ApiError(error instanceof Error ? error.message : "تعذر الاتصال بالخادم.");
  } finally {
    clearTimeout(timeout);
  }
}
