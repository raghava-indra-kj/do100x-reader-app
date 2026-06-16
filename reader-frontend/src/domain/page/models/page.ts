import type { Section } from './section';

export { Section } from './section';

export class Page {
    readonly id: string;
    readonly parentPageId: string | null;
    readonly title: string;
    readonly content: string;
    readonly createdAt: Date;
    readonly updatedAt: Date;
    readonly sections: Section[];

    constructor(params: {
        id: string;
        parentPageId: string | null;
        title: string;
        content: string;
        createdAt: Date;
        updatedAt: Date;
        sections: Section[];
    }) {
        this.id = params.id;
        this.parentPageId = params.parentPageId;
        this.title = params.title;
        this.content = params.content;
        this.createdAt = params.createdAt;
        this.updatedAt = params.updatedAt;
        this.sections = params.sections;
    }

}
