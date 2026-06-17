import { safeParseMarkdown } from "./parse-markdown";

export interface ExtractedPaste {
    title: string | null;
    content: string;
}

export function extractFrontmatterTitle(markdown: string): ExtractedPaste {
    const trimmed = markdown.trim();
    if (!trimmed) return { title: null, content: markdown };

    const result = safeParseMarkdown(trimmed);
    if (!result.ok) return { title: null, content: markdown };

    const fm = result.data.frontmatter;
    if (fm && typeof fm.title === "string" && fm.title.trim()) {
        return { title: fm.title.trim(), content: markdown };
    }

    return { title: null, content: markdown };
}
