import { z } from 'zod';
import { PAGE_ANNOTATION_KIND_LABELS, type NewPageAnnotation, type PageAnnotationKind } from '@domain/page-annotation/models/page-annotation';

export const ANNOTATION_SYSTEM_PROMPT = 'You are a learning assistant who helps people read efficiently. Study the whole passage you are given and write clear, specific reading aids grounded only in that passage.';

const KIND_GUIDANCE: Record<PageAnnotationKind, string> = {
    summary: 'a short overview of what the section says, in a few sentences',
    key_takeaway: 'an important idea the reader should remember; a section can have several, each with its own specific title',
    try_this: 'a concrete action, exercise or example the reader can try to apply the idea',
    be_aware: 'a pitfall, caveat or common mistake the reader should watch for',
    diagram: 'a visual explanation for a reader who finds the text hard to follow; the content must be one Mermaid diagram in a ```mermaid fenced code block (flowchart, sequence, class or similar, whichever fits the ideas best), optionally followed by a one-sentence caption',
};

/**
 * The output contract lives in the user prompt on purpose: custom instructions from settings replace
 * the system prompt, and the reply must stay parseable either way.
 */
export function buildAnnotationPrompt({ pageTitle, sectionTitle, source, kinds }: {
    pageTitle: string;
    sectionTitle: string | null;
    source: string;
    kinds: readonly PageAnnotationKind[];
}): string {
    const where = sectionTitle ? `the section "${sectionTitle}" of the page "${pageTitle}"` : `the page "${pageTitle}"`;
    const wanted = kinds.map((kind) => `- "${kind}": ${KIND_GUIDANCE[kind]}`).join('\n');
    return `I am reading ${where}. Write reading aids from its full content below.

Write only these kinds of items:
${wanted}

Reply with JSON only, no other text, in exactly this shape:
{"items":[{"kind":"<one of the kinds above>","title":"<short, specific title>","content":"<Markdown body>"}]}

Use every requested kind at least once. Base every item on the content only.

"""
${source}
"""`;
}

const ReplySchema = z.object({
    items: z.array(z.object({
        kind: z.string(),
        title: z.string(),
        content: z.string(),
    })),
});

/**
 * Parse the model reply. The JSON object is taken from the first `{` to the last `}`, which tolerates a
 * code fence or a sentence around it without confusing a Mermaid fence inside an item for the outer one.
 * Returns null when unusable.
 */
export function parseAnnotationReply(reply: string, kinds: readonly PageAnnotationKind[]): NewPageAnnotation[] | null {
    const start = reply.indexOf('{');
    const end = reply.lastIndexOf('}');
    if (start < 0 || end <= start) return null;
    let parsed: unknown;
    try { parsed = JSON.parse(reply.slice(start, end + 1)); } catch { return null; }
    const result = ReplySchema.safeParse(parsed);
    if (!result.success) return null;
    const allowed = new Set<string>(kinds);
    const items = result.data.items
        .filter((item) => allowed.has(item.kind) && item.title.trim() && item.content.trim())
        .filter((item) => item.kind !== 'diagram' || /```mermaid\s/i.test(item.content))
        .map((item): NewPageAnnotation => ({ kind: item.kind as PageAnnotationKind, title: item.title.trim(), content: item.content.trim() }));
    return items.length ? items : null;
}

export const annotationKindLabel = (kind: string): string => PAGE_ANNOTATION_KIND_LABELS[kind as PageAnnotationKind] ?? kind;
