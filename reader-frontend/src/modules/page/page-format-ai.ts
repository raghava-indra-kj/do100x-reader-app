import { z } from 'zod';
import { locateSections } from '@reader/md-ast';
import { FORMAT_LLM_MD_CONTENT } from '@modules/core/constants/format-llm-guide';

export type PageFormatMode = 'extract' | 'format' | 'both';

export const FORMAT_SYSTEM_PROMPT = 'You are an editor who prepares reading material for a Markdown reader. You restructure and label content without adding, removing or changing its meaning.';

const PRESERVE = 'Keep every fact, example, code block, link and number from the original. Only change structure and presentation: do not summarize, shorten, translate or add new information.';

const HEADING_RULES = 'Heading levels: one H1 that matches the title, then H2 for its main parts, H3 inside an H2 and so on. Never skip a level (no H2 straight to H4) and never use a second H1.';

/**
 * The output contract lives in the user prompt on purpose: custom instructions from settings replace
 * the system prompt, and the reply must stay parseable either way.
 */
export function buildPageFormatPrompt({ mode, title, category, content, categories }: {
    mode: PageFormatMode;
    title: string;
    category: string | null;
    content: string;
    categories: readonly string[];
}): string {
    const known = categories.length ? `Categories already in use (reuse one when it fits, otherwise a short new one): ${categories.map((item) => `"${item}"`).join(', ')}.` : 'Pick a short category such as "Recall" or "Note".';
    const details = `Work out a clear page title${title.trim() ? ` (the user typed "${title.trim()}"; keep it unless it is clearly wrong)` : ''} and a category${category?.trim() ? ` (the user typed "${category.trim()}"; keep it)` : ''}. ${known}`;
    if (mode === 'extract') {
        return `Read the content below and find its title and category. Do not rewrite it.

${details}

Reply with JSON only, no other text, in exactly this shape:
{"title":"<title>","category":"<category>"}

"""
${content}
"""`;
    }
    return `Rewrite the content below so it follows the Markdown format guide.

${PRESERVE}

${details}

Start "content" with a frontmatter block holding the title (and category) in double quotes. ${HEADING_RULES} Turn lines that run together into proper paragraphs or lists.

Reply with JSON only, no other text, in exactly this shape:
{"title":"<title>","category":"<category>","content":"<the full Markdown document>"}

Format guide:
${FORMAT_LLM_MD_CONTENT}

Content to format:
"""
${content}
"""`;
}

export function buildSectionFormatPrompt({ pageTitle, sectionTitle, level, body }: {
    pageTitle: string;
    sectionTitle: string;
    level: number;
    body: string;
}): string {
    const first = Math.min(level + 1, 6);
    return `Rewrite the body of the section "${sectionTitle}" of the page "${pageTitle}" so it follows the Markdown format guide.

${PRESERVE}

Return only the body. Do not repeat the section heading and do not add frontmatter. The section itself is heading level ${level}, so any sub-headings you use must start at level ${first} and never skip a level. Turn lines that run together into proper paragraphs or lists.

Reply with JSON only, no other text, in exactly this shape:
{"content":"<the section body in Markdown>"}

Format guide:
${FORMAT_LLM_MD_CONTENT}

Body to format:
"""
${body}
"""`;
}

const ReplySchema = z.object({
    title: z.string().optional(),
    category: z.string().optional(),
    content: z.string().optional(),
});

export interface FormatReply {
    title: string | null;
    category: string | null;
    content: string | null;
}

/**
 * Parse the model reply. The JSON object is taken from the first `{` to the last `}`, which tolerates a
 * code fence or a sentence around it. Returns null when unusable.
 */
export function parseFormatReply(reply: string): FormatReply | null {
    const start = reply.indexOf('{');
    const end = reply.lastIndexOf('}');
    if (start < 0 || end <= start) return null;
    let parsed: unknown;
    try { parsed = JSON.parse(reply.slice(start, end + 1)); } catch { return null; }
    const result = ReplySchema.safeParse(parsed);
    if (!result.success) return null;
    const clean = (value: string | undefined) => value?.trim() || null;
    const content = result.data.content?.trim() ? result.data.content.replace(/^\n+|\n+$/g, '') : null;
    return { title: clean(result.data.title), category: clean(result.data.category), content };
}

/**
 * Heading-level problems in `markdown`. A page has one H1 and no skipped levels; a section body
 * (`sectionLevel` given) only uses levels deeper than its own heading, starting one level below it.
 */
export function headingLevelIssues(markdown: string, options: { sectionLevel?: number } = {}): string[] {
    const levels = locateSections(markdown).filter((range) => range.kind === 'heading').map((range) => range.level);
    const issues: string[] = [];
    const { sectionLevel } = options;
    if (sectionLevel === undefined) {
        if (levels.filter((level) => level === 1).length > 1) issues.push('More than one top-level (H1) heading.');
    } else {
        if (levels.some((level) => level <= sectionLevel)) issues.push(`Sub-headings must be deeper than the section’s own level (H${sectionLevel}).`);
        if (levels.length && levels[0] !== sectionLevel + 1) issues.push(`The first sub-heading should be H${sectionLevel + 1}.`);
    }
    let previous = sectionLevel ?? 0;
    for (const level of levels) {
        if (level > previous + 1 && !(sectionLevel === undefined && previous === 0)) { issues.push('A heading level is skipped.'); break; }
        previous = level;
    }
    return issues;
}

/** Problems worth showing before the user keeps a formatted result. */
export function formatWarnings(original: string, formatted: string, options: { sectionLevel?: number } = {}): string[] {
    const warnings = headingLevelIssues(formatted, options);
    if (original.trim().length > 200 && formatted.trim().length < original.trim().length * 0.6) {
        warnings.unshift('The formatted text is much shorter than the original. Check that nothing was lost.');
    }
    return warnings;
}
