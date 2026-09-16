export type MenuItemErrorCode =
  | "validation_failed"
  | "not_authenticated"
  | "forbidden"
  | "not_found"
  | "duplicate_name"
  | "kind_immutable"
  | "unknown";

export class MenuItemError extends Error {
  readonly code: MenuItemErrorCode;
  readonly fieldErrors?: Record<string, string>;

  constructor(
    code: MenuItemErrorCode,
    message: string,
    fieldErrors?: Record<string, string>,
  ) {
    super(message);
    this.name = "MenuItemError";
    this.code = code;
    this.fieldErrors = fieldErrors;
  }
}
