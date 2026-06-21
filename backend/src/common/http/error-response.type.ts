export type ErrorResponse = {
  errorCode: string | null;
  message: string;
  data: unknown | null;
  debugMessage?: string; // actual thrown message, only in debug mode
  stack?: string;        // only in debug mode
};
