export class AppError extends Error {
  public readonly errorCode: string;
  public readonly data: unknown | null;

  constructor({
    errorCode,
    message,
    data
  }: {
    errorCode: string;
    message: string;
    data?: unknown | null;
  }) {
    super(message);
    this.errorCode = errorCode;
    this.data = data ?? null;
    this.name = new.target.name;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}