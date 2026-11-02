export interface ApiErrorDetail {
  field: string;
  issue: string;
  message: string;
}

export interface ApiError {
  code: string;
  message: string;
  details: ApiErrorDetail[] | null;
  requestId: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T | null;
  error: ApiError | null;
  meta: Record<string, unknown> | null;
}

export const ApiResponse = {
  success<T>(data: T): ApiResponse<T> {
    return { success: true, data, error: null, meta: null };
  },

  failure(error: ApiError): ApiResponse<never> {
    return { success: false, data: null, error, meta: null };
  },
};
