export type ApiResult<T> = { success: true; data: T } | { success: false; error: string };

export function apiSuccess<T>(data: T): ApiResult<T> {
  return { success: true, data };
}

export function apiError(error: string): ApiResult<never> {
  return { success: false, error };
}
