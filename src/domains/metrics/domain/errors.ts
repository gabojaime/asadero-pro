export type MetricsErrorCode =
  | "validation_failed"
  | "forbidden"
  | "not_found";

export class MetricsError extends Error {
  readonly code: MetricsErrorCode;
  readonly fieldErrors?: Record<string, string>;

  constructor(
    code: MetricsErrorCode,
    message: string,
    fieldErrors?: Record<string, string>,
  ) {
    super(message);
    this.name = "MetricsError";
    this.code = code;
    this.fieldErrors = fieldErrors;
  }
}
