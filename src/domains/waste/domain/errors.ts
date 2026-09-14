export type WasteErrorCode =
  | "validation_failed"
  | "forbidden"
  | "not_found"
  | "unknown";

export class WasteError extends Error {
  readonly code: WasteErrorCode;
  readonly fieldErrors?: Record<string, string>;

  constructor(
    code: WasteErrorCode,
    message: string,
    fieldErrors?: Record<string, string>,
  ) {
    super(message);
    this.name = "WasteError";
    this.code = code;
    this.fieldErrors = fieldErrors;
  }
}
