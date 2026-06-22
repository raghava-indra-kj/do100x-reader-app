export type PageBody = Record<string, unknown>;

export type Page = {
    id: string;
    userId: string;
    parentId: string | null;
    title: string;
    content: PageBody | null;
    category: string | null;
    sortOrder: string;
    childrenCount: number;
    createdAt: Date;
    updatedAt: Date;
};

export type PageListItem = {
    id: string;
    userId: string;
    parentId: string | null;
    title: string;
    category: string | null;
    sortOrder: string;
    childrenCount: number;
    createdAt: Date;
    updatedAt: Date;
};

export type PageListResult = {
    pages: PageListItem[];
};
