export class Section {
    readonly id: string;
    readonly pageId: string;
    readonly title: string | null;
    readonly rawTitle: string | null;
    readonly level: number;
    readonly content: string | null;
    readonly children: Section[];

    constructor(params: {
        id: string;
        pageId: string;
        title: string | null;
        rawTitle: string | null;
        level: number;
        content: string | null;
        children: Section[];
    }) {
        this.id = params.id;
        this.pageId = params.pageId;
        this.title = params.title;
        this.rawTitle = params.rawTitle;
        this.level = params.level;
        this.content = params.content;
        this.children = params.children;
    }

    /** The heading line rebuilt with ATX markers, e.g. `## Functions`. Null for a preamble (level 0). */
    get headingMarkdown(): string | null {
        if (this.rawTitle === null) return null;
        return `${'#'.repeat(this.level)} ${this.rawTitle}`;
    }

    /** This section's own heading and body, excluding any child sections. */
    get selfMarkdown(): string {
        return [this.headingMarkdown, this.content]
            .filter((part): part is string => part !== null)
            .join('\n\n');
    }

    /** This section together with its entire descendant subtree, in document order. */
    get fullMarkdown(): string {
        return [this.selfMarkdown, ...this.children.map((child) => child.fullMarkdown)]
            .filter((part) => part.length > 0)
            .join('\n\n');
    }

    /**
     * This section's slice when reading at `maxLevel`: its own heading and body, plus the
     * full subtree of descendants deeper than `maxLevel`. Descendants at or above `maxLevel`
     * are separately navigable chunks and are excluded, so a heading shallower than
     * `maxLevel` shows only the text down to its first sub-heading — e.g. at H2 an H1 shows
     * just the content between it and the first H2. At the deepest level this equals
     * `fullMarkdown` (and at H1 the H2s are deeper, so the whole page is shown).
     */
    chunkMarkdown(maxLevel: number): string {
        const parts = [this.selfMarkdown];
        for (const child of this.children) {
            if (child.level > maxLevel) {
                parts.push(child.fullMarkdown);
            }
        }
        return parts.filter((part) => part.length > 0).join('\n\n');
    }
}
