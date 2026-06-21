declare global {
  namespace Express {
    interface Request {
      requestId: string;
      clientRequestId: string | null;
    }
  }
}

export {};
