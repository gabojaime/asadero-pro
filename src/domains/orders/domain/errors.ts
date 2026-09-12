export type OrderErrorCode =
  | "validation_failed"
  | "not_authenticated"
  | "forbidden"
  | "forbidden_mark_ready"
  | "not_found"
  | "order_not_active"
  | "unknown";

export class OrderError extends Error {
  readonly code: OrderErrorCode;
  readonly fieldErrors?: Record<string, string>;

  constructor(
    code: OrderErrorCode,
    message: string,
    fieldErrors?: Record<string, string>,
  ) {
    super(message);
    this.name = "OrderError";
    this.code = code;
    this.fieldErrors = fieldErrors;
  }
}
