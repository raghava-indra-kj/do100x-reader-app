import { z } from 'zod';

export const UserModelSchema = z.object({
    id: z.string(),
    userId: z.string(),
    name: z.string(),
    modelId: z.string(),
});

export type UserModelData = z.infer<typeof UserModelSchema>;

export class UserModel {
    readonly id: string;
    readonly userId: string;
    readonly name: string;
    readonly modelId: string;

    constructor(params: UserModelData) {
        this.id = params.id;
        this.userId = params.userId;
        this.name = params.name;
        this.modelId = params.modelId;
    }
}
