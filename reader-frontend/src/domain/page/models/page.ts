import type { Section } from './section';

export { Section } from './section';

export class Page {
    readonly id: string;
    readonly userId: string;
    readonly parentPageId: string | null;
    readonly title: string;
    readonly content: string;
    readonly category: string | null;
    readonly createdAt: Date;
    readonly updatedAt: Date;
    readonly sections: Section[];
    readonly childrenCount: number;
    readonly isPublic: boolean;
    readonly isOwner: boolean;
    readonly meaningSystemPrompt: string | null;
    readonly explanationSystemPrompt: string | null;
    readonly doubtSystemPrompt: string | null;

    constructor(params: {
        id: string;
        userId?: string;
        parentPageId: string | null;
        title: string;
        content: string;
        category: string | null;
        createdAt: Date;
        updatedAt: Date;
        sections: Section[];
        childrenCount: number;
        isPublic?: boolean;
        isOwner?: boolean;
        meaningSystemPrompt?: string | null;
        explanationSystemPrompt?: string | null;
        doubtSystemPrompt?: string | null;
    }) {
        this.id = params.id;
        this.userId = params.userId ?? '';
        this.parentPageId = params.parentPageId;
        this.title = params.title;
        this.content = params.content;
        this.category = params.category;
        this.createdAt = params.createdAt;
        this.updatedAt = params.updatedAt;
        this.sections = params.sections;
        this.childrenCount = params.childrenCount;
        this.isPublic = params.isPublic ?? false;
        this.isOwner = params.isOwner ?? true;
        this.meaningSystemPrompt = params.meaningSystemPrompt ?? null;
        this.explanationSystemPrompt = params.explanationSystemPrompt ?? null;
        this.doubtSystemPrompt = params.doubtSystemPrompt ?? null;
    }

    get isRootPage(): boolean {
        return this.parentPageId === null;
    }

    get isEmpty(): boolean {
        return !this.content || !this.content.trim();
    }

    get hasChildren(): boolean {
        return this.childrenCount > 0;
    }
}
