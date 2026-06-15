export class ApiError extends Error {
  constructor(
    readonly statusCode: number,
    readonly code: string,
    readonly messageKey: string,
    readonly details?: Record<string, unknown>,
  ) {
    super(messageKey);
  }
}
