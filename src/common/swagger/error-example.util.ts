import { ErrorResponse } from '@/common/dto/api-response.dto';

export function errorExample(code: string, message: string): ErrorResponse {
  return { success: false, code, message };
}

export function errorExamples(
  entries: Record<string, string>,
): Record<string, { summary: string; value: ErrorResponse }> {
  return Object.fromEntries(
    Object.entries(entries).map(([code, message]) => [
      code,
      { summary: code, value: errorExample(code, message) },
    ]),
  );
}
