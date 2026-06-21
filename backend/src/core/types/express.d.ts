import { CurrentUser } from "@core/models/current-user";

declare global {
    namespace Express {
        interface Request {
            requestId: string;
            clientRequestId: string | null;
            currentUser: CurrentUser;
            optCurrentUser: CurrentUser | null;
        }
    }
}

export {};
