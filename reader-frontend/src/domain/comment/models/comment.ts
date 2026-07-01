export class Comment {
    readonly id: string;
    readonly pageId: string;
    readonly pageTitle: string;
    readonly sectionTitle: string | null;
    readonly selectedText: string;
    readonly body: string;
    readonly linkedPageId: string | null;
    readonly isExplanation: boolean;
    readonly createdAt: Date;
    readonly updatedAt: Date;

    constructor(params: {
        id: string;
        pageId: string;
        pageTitle: string;
        sectionTitle: string | null;
        selectedText: string;
        body: string;
        linkedPageId: string | null;
        isExplanation: boolean;
        createdAt: Date;
        updatedAt: Date;
    }) {
        this.id = params.id;
        this.pageId = params.pageId;
        this.pageTitle = params.pageTitle;
        this.sectionTitle = params.sectionTitle;
        this.selectedText = params.selectedText;
        this.body = params.body;
        this.linkedPageId = params.linkedPageId;
        this.isExplanation = params.isExplanation;
        this.createdAt = params.createdAt;
        this.updatedAt = params.updatedAt;
    }
}