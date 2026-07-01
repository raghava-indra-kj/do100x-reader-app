import type { Section } from './section';

export { Section } from './section';

export class Page {
    readonly id: string;
    readonly parentPageId: string | null;
    readonly title: string;
    readonly content: string;
    readonly category: string | null;
    readonly createdAt: Date;
    readonly updatedAt: Date;
    readonly sections: Section[];
    readonly childrenCount: number;
    readonly meaningSystemPrompt: string | null;
    readonly explanationSystemPrompt: string | null;
    readonly doubtSystemPrompt: string | null;

    constructor(params: {
        id: string;
        parentPageId: string | null;
        title: string;
        content: string;
        category: string | null;
        createdAt: Date;
        updatedAt: Date;
        sections: Section[];
        childrenCount: number;
        meaningSystemPrompt?: string | null;
        explanationSystemPrompt?: string | null;
        doubtSystemPrompt?: string | null;
    }) {
        this.id = params.id;
        this.parentPageId = params.parentPageId;
        this.title = params.title;
        this.content = params.content;
        this.category = params.category;
        this.createdAt = params.createdAt;
        this.updatedAt = params.updatedAt;
        this.sections = params.sections;
        this.childrenCount = params.childrenCount;
        this.meaningSystemPrompt = params.meaningSystemPrompt ?? null;
        this.explanationSystemPrompt = params.explanationSystemPrompt ?? null;
        this.doubtSystemPrompt = params.doubtSystemPrompt ?? null;
    }

    get isRootPage(): boolean {
        return this.parentPageId === null;
    }

    get isEmpty(): boolean {
        return this.content == null;
    }

    get hasChildren(): boolean {
        return this.childrenCount > 0;
    }
}
