export class AppError extends Error {
  readonly errorCode: string | null;
  readonly data: unknown | null;
  readonly cause?: Error;

  constructor({
    message,
    errorCode = null,
    data = null,
    cause,
  }: {
    message: string;
    errorCode?: string | null;
    data?: unknown | null;
    cause?: Error;
  }) {
    super(message);
    this.errorCode = errorCode;
    this.data = data;
    this.cause = cause;
    this.name = new.target.name;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
