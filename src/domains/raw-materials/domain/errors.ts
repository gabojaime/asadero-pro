export type RawMaterialErrorCode =
  | "validation_failed"
  | "not_authenticated"
  | "forbidden"
  | "not_found"
  | "conflict"
  | "unknown";

export class RawMaterialError extends Error {
  readonly code: RawMaterialErrorCode;
  readonly fieldErrors?: Record<string, string>;

  constructor(
    code: RawMaterialErrorCode,
    message: string,
    fieldErrors?: Record<string, string>,
  ) {
    super(message);
    this.name = "RawMaterialError";
    this.code = code;
    this.fieldErrors = fieldErrors;
  }
}
