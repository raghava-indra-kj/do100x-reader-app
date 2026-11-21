export class PageListItem {
    readonly id: string;
    readonly parentPageId: string | null;
    readonly childrenCount: number;
    readonly title: string;
    readonly category: string | null;
    readonly sortOrder: number;
    readonly isPublic: boolean;
    readonly createdAt: Date;
    readonly updatedAt: Date;

    constructor(params: {
        id: string;
        parentPageId: string | null;
        childrenCount?: number;
        title: string;
        category: string | null;
        sortOrder: number;
        isPublic?: boolean;
        createdAt: Date;
        updatedAt: Date;
    }
    ) {
        this.id = params.id;
        this.parentPageId = params.parentPageId;
        this.childrenCount = params.childrenCount ?? 0;
        this.title = params.title;
        this.category = params.category;
        this.sortOrder = params.sortOrder;
        this.isPublic = params.isPublic ?? false;
        this.createdAt = params.createdAt;
        this.updatedAt = params.updatedAt;
    }
}
