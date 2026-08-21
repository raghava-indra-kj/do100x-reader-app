export class PageListItem {
    readonly id: string;
    readonly parentPageId: string | null;
    readonly title: string;
    readonly category: string | null;
    readonly sortOrder: number;
    readonly createdAt: Date;
    readonly updatedAt: Date;

    constructor(params: {
        id: string;
        parentPageId: string | null;
        title: string;
        category: string | null;
        sortOrder: number;
        createdAt: Date;
        updatedAt: Date;
    }
    ) {
        this.id = params.id;
        this.parentPageId = params.parentPageId;
        this.title = params.title;
        this.category = params.category;
        this.sortOrder = params.sortOrder;
        this.createdAt = params.createdAt;
        this.updatedAt = params.updatedAt;
    }
}
