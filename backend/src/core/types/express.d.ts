import { CurrentUser } from "../models/current-user";

declare global {
  namespace Express {
    interface Request {
      requestId: string;
      clientRequestId: string | null;
      currentUser: CurrentUser | null;
    }
  }
}

export { };
