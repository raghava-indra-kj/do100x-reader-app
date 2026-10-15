/* Types export */
export { MdAstError } from "./types";
export type {
    Block,
    BlockType,
    HeadingBlock, HeadingLevel, MdAstDocument, MdAstFrontmatter, ParseErr, ParseOk, ParseOptions,
    ParseResult, SerializeOk, SerializeResult, UnknownBlock
} from "./types";

/* Parse markdown to MdAstDocument */
export { parseMarkdown, safeParseMarkdown } from "./parse-markdown";

/* Convert MdAstDocument to markdown */
export { safeToMarkdown, toMarkdown } from "./to-markdown";

/* Convert MdAstDocument to and from JSON */
export { fromJson, safeFromJson, toJson } from "./json";
export { reuseIds } from "./reuse-ids";

/* Exact source ranges for safe, section-scoped editing. */
export { editableSectionBody, locateSections, parseSourceTree, replaceSectionBody, sectionBodyTarget } from "./section-edit";
export type { MarkdownSectionRange, SectionBodyTarget } from "./section-edit";

export { createDocument, serializeDocument, hydrateDocument, reconcileDocument, applySourceEdits, replaceBlock, createBlockAnchor, resolveBlockAnchor } from './document';
export type { MarkdownDocument, MarkdownBlock, SourceRange, SourceEdit, BlockAnchor, AnchorResolution } from './document';
export { createTextAnchor, createBlocksAnchor, sourceSegments, validateAnchor, editAnnotatedDocument, reconcileAnchor } from './annotations';
export type { AnnotationAnchor, AnnotationSegment, AttachmentStatus } from './annotations';
export { documentMetadata, documentFromMetadata } from './document';
export type { DocumentMetadata } from './document';
export { sourceReplacementEdits, replaceAnnotatedSource } from './source-replacement';
export { moveAnnotatedBlocks, copyAnnotatedBlocks } from './block-operations';
export { createAnnotationChange, restoreAnnotationChange } from './annotation-history';
export type { IdentifiedAnnotation, AnnotationState, AnnotationChange, AnnotationRestoration } from './annotation-history';

