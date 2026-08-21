import { z } from 'zod';

export const CurrentUserSchema = z.object({
    id: z.string(),
    email: z.string().email(),
    displayName: z.string(),
    avatarUrl: z.string().nullable(),
    homepageId: z.string(),
});

export type CurrentUserData = z.infer<typeof CurrentUserSchema>;

export class CurrentUser {
    readonly id: string;
    readonly email: string;
    readonly displayName: string;
    readonly avatarUrl: string | null;
    readonly homepageId: string;

    constructor(params: {
        id: string;
        email: string;
        displayName: string;
        avatarUrl: string | null;
        homepageId: string;
    }) {
        this.id = params.id;
        this.email = params.email;
        this.displayName = params.displayName;
        this.avatarUrl = params.avatarUrl;
        this.homepageId = params.homepageId;
    }
}
