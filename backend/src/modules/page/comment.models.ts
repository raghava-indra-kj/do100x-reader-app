export type Comment = {
    id: string;
    pageId: string;
    userId: string;
    selectionText: string | null;
    comment: string;
    createdAt: Date;
    updatedAt: Date;
};

export type CommentListResult = {
    comments: Comment[];
};
