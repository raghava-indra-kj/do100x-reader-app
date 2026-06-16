export class Section {
    readonly id: string;
    readonly pageId: string;
    readonly title: string | null;
    readonly rawTitle: string | null;
    readonly level: number;
    readonly content: string | null;
    readonly children: Section[];

    constructor(params: {
        id: string;
        pageId: string;
        title: string | null;
        rawTitle: string | null;
        level: number;
        content: string | null;
        children: Section[];
    }) {
        this.id = params.id;
        this.pageId = params.pageId;
        this.title = params.title;
        this.rawTitle = params.rawTitle;
        this.level = params.level;
        this.content = params.content;
        this.children = params.children;
    }
}
