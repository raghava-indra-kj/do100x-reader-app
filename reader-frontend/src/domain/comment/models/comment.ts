import type { AnnotationAnchor } from '@reader/md-ast';
export type CommentTargetInput = { anchor?: AnnotationAnchor; contentVersion?: number };
export class Comment {
    readonly id: string;
    readonly pageId: string;
    readonly pageTitle: string;
    readonly sectionTitle: string | null;
    readonly selectedText: string;
    readonly body: string;
    readonly anchor: AnnotationAnchor | null;
    readonly anchorRevision: number | null;
    readonly resolvedAt: Date | null;
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
        anchor?: AnnotationAnchor | null;
        anchorRevision?: number | null;
        resolvedAt?: Date | null;
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
        this.anchor = params.anchor ?? null;
        this.anchorRevision = params.anchorRevision ?? null;
        this.resolvedAt = params.resolvedAt ?? null;
        this.linkedPageId = params.linkedPageId;
        this.isExplanation = params.isExplanation;
        this.createdAt = params.createdAt;
        this.updatedAt = params.updatedAt;
    }
}
