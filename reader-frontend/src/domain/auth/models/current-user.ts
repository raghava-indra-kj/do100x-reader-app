import { z } from 'zod';

export const CurrentUserSchema = z.object({
    id: z.string(),
    username: z.string(),
    password: z.string(),
    homepageId: z.string(),
});

export type CurrentUserData = z.infer<typeof CurrentUserSchema>;

export class CurrentUser {
    readonly id: string;
    readonly username: string;
    readonly password: string;
    readonly homepageId: string;

    constructor(params: {
        id: string;
        username: string;
        password: string;
        homepageId: string;
    }) {
        this.id = params.id;
        this.username = params.username;
        this.password = params.password;
        this.homepageId = params.homepageId;
    }
}
