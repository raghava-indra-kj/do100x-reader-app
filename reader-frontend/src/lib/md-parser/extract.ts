import { safeParseMarkdown } from "./parse-markdown";

export interface ExtractedPaste {
    title: string | null;
    category: string | null;
    content: string;
}

function extractCategory(fm: Record<string, unknown>): string | null {
    if (typeof fm.type === "string" && fm.type.trim()) return fm.type.trim();
    if (typeof fm.category === "string" && fm.category.trim()) return fm.category.trim();
    return null;
}

export function extractFrontmatterTitle(markdown: string): ExtractedPaste {
    const trimmed = markdown.trim();
    if (!trimmed) return { title: null, category: null, content: markdown };

    const result = safeParseMarkdown(trimmed);
    if (!result.ok) return { title: null, category: null, content: markdown };

    const fm = result.data.frontmatter;
    if (fm && typeof fm === "object") {
        const title = typeof fm.title === "string" && fm.title.trim() ? fm.title.trim() : null;
        const category = extractCategory(fm);
        return { title, category, content: markdown };
    }

    return { title: null, category: null, content: markdown };
}
