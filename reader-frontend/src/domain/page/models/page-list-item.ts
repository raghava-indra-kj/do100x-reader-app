export class PageListItem {
    readonly id: string;
    readonly parentPageId: string | null;
    readonly title: string;
    readonly sortOrder: number;
    readonly createdAt: Date;
    readonly updatedAt: Date;

    constructor(params: {
        id: string;
        parentPageId: string | null;
        title: string;
        sortOrder: number;
        createdAt: Date;
        updatedAt: Date;
    }
    ) {
        this.id = params.id;
        this.parentPageId = params.parentPageId;
        this.title = params.title;
        this.sortOrder = params.sortOrder;
        this.createdAt = params.createdAt;
        this.updatedAt = params.updatedAt;
    }
}
