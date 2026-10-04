import { z } from 'zod';

export const CurrentUserSchema = z.object({
    id: z.string().uuid(),
    displayName: z.string().nullable(),
    email: z.string().email(),
    avatarUrl: z.string().url().nullable(),
}).strict();
export type CurrentUserData = z.infer<typeof CurrentUserSchema>;

export class CurrentUser {
    readonly id: string;
    readonly displayName: string | null;
    readonly email: string;
    readonly avatarUrl: string | null;

    constructor(data: CurrentUserData) {
        this.id = data.id;
        this.displayName = data.displayName;
        this.email = data.email;
        this.avatarUrl = data.avatarUrl;
    }

    get label(): string { return this.displayName || this.email; }
}
