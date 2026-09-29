import { toString } from "mdast-util-to-string";
import type { Heading, Root, RootContent } from "mdast";
import { processor } from "./internal/processor";
import { MdAstError } from "./types";
import { parseFragment, type DefaultTreeAdapterMap } from "parse5";
import type { Node } from "unist";

export interface MarkdownSectionRange {
    kind: "heading" | "preamble";
    headingStart: number | null;
    headingEnd: number | null;
    bodyStart: number;
    bodyEnd: number;
    level: number;
    title: string | null;
    rawHeading: string | null;
}

export interface SectionBodyTarget {
    kind: MarkdownSectionRange["kind"];
    headingStart: number | null;
    bodyStart: number;
    expectedHeading: string | null;
    expectedBody: string;
}

function offsets(node: RootContent): { start: number; end: number } {
    const start = node.position?.start.offset;
    const end = node.position?.end.offset;
    if (start === undefined || end === undefined) {
        throw new MdAstError({ message: "Markdown node has no source position" });
    }
    return { start, end };
}

/** Locate semantic headings using the same Markdown grammar as the renderer. All offsets are UTF-16 source offsets. */
export function parseSourceTree(source: string): Root { return processor.parse(source); }

export function locateSections(source: string, tree: Root = parseSourceTree(source)): MarkdownSectionRange[] {
    const firstNode = tree.children[0];
    const frontmatterEnd = firstNode?.type === "yaml" ? offsets(firstNode).end : 0;
    const headings = tree.children.filter((node): node is Heading => node.type === "heading");
    const result: MarkdownSectionRange[] = [];
    const firstHeadingStart = headings.length ? offsets(headings[0]).start : source.length;

    if (source.slice(frontmatterEnd, firstHeadingStart).trim().length > 0 || (headings.length === 0 && source.length === 0)) {
        result.push({
            kind: "preamble",
            headingStart: null,
            headingEnd: null,
            bodyStart: frontmatterEnd,
            bodyEnd: firstHeadingStart,
            level: 0,
            title: null,
            rawHeading: null,
        });
    }

    for (let index = 0; index < headings.length; index++) {
        const heading = headings[index];
        const { start, end } = offsets(heading);
        result.push({
            kind: "heading",
            headingStart: start,
            headingEnd: end,
            bodyStart: end,
            bodyEnd: index + 1 < headings.length ? offsets(headings[index + 1]).start : source.length,
            level: heading.depth,
            title: toString(heading),
            rawHeading: source.slice(start, end),
        });
    }

    return result;
}

/** Remove only boundary line breaks used to separate the body from its heading and neighbors. */
export function editableSectionBody(source: string, range: MarkdownSectionRange): string {
    return source.slice(range.bodyStart, range.bodyEnd)
        .replace(/^(?:\r\n|\r|\n)+/, "")
        .replace(/(?:\r\n|\r|\n)+$/, "");
}

export function sectionBodyTarget(source: string, range: MarkdownSectionRange): SectionBodyTarget {
    return {
        kind: range.kind,
        headingStart: range.headingStart,
        bodyStart: range.bodyStart,
        expectedHeading: range.rawHeading,
        expectedBody: source.slice(range.bodyStart, range.bodyEnd),
    };
}

function descendants(tree: Node): Node[] {
    return [tree, ...('children' in tree ? (tree.children as Node[]).flatMap(descendants) : [])];
}

function assertContainedHtml(body: string): void {
    const html = descendants(parseSourceTree(body)).filter((node) => node.type === 'html')
        .map((node) => (node as Node & { value: string }).value).join('\n');
    if (!html) return;
    const fragment = parseFragment(html, { sourceCodeLocationInfo: true });
    const voidTags = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param', 'source', 'track', 'wbr']);
    const walk = (node: DefaultTreeAdapterMap['node']) => {
        if ('tagName' in node && node.sourceCodeLocation?.startTag && !node.sourceCodeLocation.endTag && !voidTags.has(node.tagName)) {
            throw new MdAstError({ message: `Unclosed HTML <${node.tagName}> could affect other sections. Close it inside this section or use full-page editing.` });
        }
        if ('childNodes' in node) node.childNodes.forEach(walk);
    };
    walk(fragment);
}

/** Replace one body without serializing the rest of the page. Reject edits that change its heading structure. */
export function replaceSectionBody({ source, target, newBody }: {
    source: string;
    target: SectionBodyTarget;
    newBody: string;
}): string {
    const before = locateSections(source);
    const range = before.find((section) =>
        section.kind === target.kind &&
        section.headingStart === target.headingStart &&
        section.bodyStart === target.bodyStart
    );
    if (!range || range.rawHeading !== target.expectedHeading || source.slice(range.bodyStart, range.bodyEnd) !== target.expectedBody) {
        throw new MdAstError({ message: "Section changed before this edit could be applied" });
    }
    if (newBody === editableSectionBody(source, range)) return source;
    assertContainedHtml(newBody);

    const eol = source.includes("\r\n") ? "\r\n" : "\n";
    const body = newBody
        .replace(/^(?:\r\n|\r|\n)+/, "")
        .replace(/(?:\r\n|\r|\n)+$/, "")
        .replace(/\r\n|\r|\n/g, eol);
    const hasNextHeading = range.bodyEnd < source.length;
    const oldBody = source.slice(range.bodyStart, range.bodyEnd);
    const lead = range.kind === "heading" || range.bodyStart > 0 ? eol + eol : "";
    const tail = hasNextHeading ? eol + eol : /(?:\r\n|\r|\n)$/.test(oldBody) ? eol : "";
    const replacement = body.length > 0 ? lead + body + tail : hasNextHeading ? lead : tail;
    const updated = source.slice(0, range.bodyStart) + replacement + source.slice(range.bodyEnd);

    const after = locateSections(updated);
    const originalHeadings = before.filter((section) => section.kind === "heading");
    const updatedHeadings = after.filter((section) => section.kind === "heading");
    const delta = updated.length - source.length;
    if (originalHeadings.length !== updatedHeadings.length || originalHeadings.some((heading, index) =>
        heading.level !== updatedHeadings[index].level || heading.rawHeading !== updatedHeadings[index].rawHeading ||
        updatedHeadings[index].headingStart !== heading.headingStart! + (heading.headingStart! >= range.bodyEnd ? delta : 0)
    )) {
        throw new MdAstError({ message: "This edit changes the page's heading structure; use full-page editing for structural changes" });
    }

    // Reference/footnote definitions have document-wide effects. Body-only editing
    // must not change the meaning of a reference rendered in another section.
    const definitions = (value: string) => descendants(parseSourceTree(value))
        .filter((node) => node.type === "definition" || node.type === "footnoteDefinition" || node.type === "yaml")
        .map((node) => { const span = offsets(node as RootContent); return value.slice(span.start, span.end); });
    if (JSON.stringify(definitions(source)) !== JSON.stringify(definitions(updated))) {
        throw new MdAstError({ message: "Frontmatter, reference and footnote definitions affect other sections; use full-page editing to change them" });
    }

    return updated;
}
