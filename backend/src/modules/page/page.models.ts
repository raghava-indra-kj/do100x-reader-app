export type PageBody = Record<string, unknown>;

export type Page = {
    id: string;
    userId: string;
    parentId: string | null;
    title: string;
    content: PageBody | null;
    isPublic: boolean;
    category: string | null;
    sortOrder: number;
    childrenCount: number;
    createdAt: Date;
    updatedAt: Date;
    deletedAt: Date | null;
};
