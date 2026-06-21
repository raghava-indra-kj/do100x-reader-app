export type ErrorResponse = {
  errorCode: string | null;
  message: string;
  data: unknown | null;
  debugMessage?: string;
  stack?: string;
};
