export class Vocabulary {
    readonly id: string;
    readonly pageId: string;
    readonly term: string;
    readonly createdAt: Date;

    constructor(params: {
        id: string;
        pageId: string;
        term: string;
        createdAt: Date;
    }) {
        this.id = params.id;
        this.pageId = params.pageId;
        this.term = params.term;
        this.createdAt = params.createdAt;
    }
}