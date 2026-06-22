export type PageBody = Record<string, unknown>;

export type Page = {
    id: string;
    userId: string;
    parentId: string | null;
    title: string;
    content: PageBody | null;
    category: string | null;
    sortOrder: number;
    childrenCount: number;
    createdAt: Date;
    updatedAt: Date;
    deletedAt: Date | null;
};

export type PageListItem = {
    id: string;
    userId: string;
    parentId: string | null;
    title: string;
    category: string | null;
    sortOrder: number;
    childrenCount: number;
    createdAt: Date;
    updatedAt: Date;
    deletedAt: Date | null;
};

export type PageListResult = {
    pages: PageListItem[];
};
