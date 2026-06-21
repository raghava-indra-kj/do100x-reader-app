export class AppError extends Error {
  readonly errorCode: string | null;
  readonly data: unknown;

  constructor({
    message,
    errorCode = null,
    data = null,
    cause,
  }: {
    message: string;
    errorCode?: string | null;
    data?: unknown;
    cause?: Error;
  }) {
    super(message, { cause });
    this.errorCode = errorCode;
    this.data = data;
    this.name = new.target.name;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
