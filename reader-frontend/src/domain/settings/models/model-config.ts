import { z } from 'zod';

export const ModelConfigSchema = z.object({
    id: z.string(),
    userId: z.string(),
    baseUrl: z.string(),
    apiKey: z.string(),
    explanationModelId: z.string().nullable().optional(),
    meaningModelId: z.string().nullable().optional(),
    doubtModelId: z.string().nullable().optional(),
    meaningSystemPrompt: z.string().nullable().optional(),
    explanationSystemPrompt: z.string().nullable().optional(),
    doubtSystemPrompt: z.string().nullable().optional(),
});

export type ModelConfigData = z.infer<typeof ModelConfigSchema>;

export class ModelConfig {
    readonly id: string;
    readonly userId: string;
    readonly baseUrl: string;
    readonly apiKey: string;
    readonly explanationModelId?: string;
    readonly meaningModelId?: string;
    readonly doubtModelId?: string;
    readonly meaningSystemPrompt?: string;
    readonly explanationSystemPrompt?: string;
    readonly doubtSystemPrompt?: string;

    constructor(params: ModelConfigData) {
        this.id = params.id;
        this.userId = params.userId;
        this.baseUrl = params.baseUrl;
        this.apiKey = params.apiKey;
        this.explanationModelId = params.explanationModelId ?? undefined;
        this.meaningModelId = params.meaningModelId ?? undefined;
        this.doubtModelId = params.doubtModelId ?? undefined;
        this.meaningSystemPrompt = params.meaningSystemPrompt ?? undefined;
        this.explanationSystemPrompt = params.explanationSystemPrompt ?? undefined;
        this.doubtSystemPrompt = params.doubtSystemPrompt ?? undefined;
    }
}
