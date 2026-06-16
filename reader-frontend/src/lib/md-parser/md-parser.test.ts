import { describe, it, expect } from "vitest";
import {
    parseMarkdown,
    safeParseMarkdown,
    serializeMarkdown,
    safeSerializeMarkdown,
    MdParseError,
} from "./index";
import type { MdSection } from "./index";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Pull title/level/content from a section, ignoring id and children */
function _shape(s: MdSection) {
    return { title: s.title, rawTitle: s.rawTitle, level: s.level, content: s.content };
}

/** Walk the tree and collect all ids — used to assert uniqueness */
function allIds(sections: MdSection[]): string[] {
    return sections.flatMap((s) => [s.id, ...allIds(s.children)]);
}

// ---------------------------------------------------------------------------
// parseMarkdown — frontmatter
// ---------------------------------------------------------------------------

describe("parseMarkdown — frontmatter", () => {
    it("returns null frontmatter when no --- block", () => {
        const doc = parseMarkdown("## Hello\n\nworld");
        expect(doc.frontmatter).toBeNull();
    });

    it("parses a basic frontmatter block", () => {
        const doc = parseMarkdown("---\ntitle: My Post\ntags: [a, b]\n---\n\n## Hello");
        expect(doc.frontmatter).toEqual({ title: "My Post", tags: ["a", "b"] });
    });

    it("returns null for empty frontmatter block", () => {
        const doc = parseMarkdown("---\n---\n\n## Hello");
        expect(doc.frontmatter).toBeNull();
    });

    it("returns null for whitespace-only frontmatter", () => {
        const doc = parseMarkdown("---\n   \n---\n\n## Hello");
        expect(doc.frontmatter).toBeNull();
    });

    it("parses nested frontmatter objects", () => {
        const doc = parseMarkdown("---\nauthor:\n  name: Alice\n  age: 30\n---");
        expect(doc.frontmatter).toEqual({ author: { name: "Alice", age: 30 } });
    });

    it("throws MdParseError on invalid YAML", () => {
        expect(() => parseMarkdown("---\n: bad: yaml: :\n---")).toThrow(MdParseError);
    });

    it("throws MdParseError when frontmatter is an array, not a mapping", () => {
        expect(() => parseMarkdown("---\n- one\n- two\n---")).toThrow(MdParseError);
    });

    it("does not coerce date strings to Date objects (JSON_SCHEMA)", () => {
        const doc = parseMarkdown("---\ndate: 2024-01-15\n---");
        expect(typeof doc.frontmatter!.date).toBe("string");
        expect(doc.frontmatter!.date).toBe("2024-01-15");
    });

    it("does not coerce yes/no to booleans (JSON_SCHEMA)", () => {
        const doc = parseMarkdown("---\nflag: 'yes'\n---");
        expect(doc.frontmatter!.flag).toBe("yes");
    });
});

// ---------------------------------------------------------------------------
// parseMarkdown — sections structure
// ---------------------------------------------------------------------------

describe("parseMarkdown — sections", () => {
    it("returns empty sections for empty string", () => {
        const doc = parseMarkdown("");
        expect(doc.sections).toEqual([]);
    });

    it("returns empty sections for frontmatter-only document", () => {
        const doc = parseMarkdown("---\ntitle: x\n---\n");
        expect(doc.sections).toEqual([]);
    });

    it("creates preamble section for content before first heading", () => {
        const doc = parseMarkdown("Some intro text.\n\n## First");
        expect(doc.sections).toHaveLength(2);
        const [preamble, first] = doc.sections;
        expect(preamble.title).toBeNull();
        expect(preamble.rawTitle).toBeNull();
        expect(preamble.level).toBe(0);
        expect(preamble.content).toBe("Some intro text.");
        expect(first.title).toBe("First");
    });

    it("creates a single preamble section when there are no headings", () => {
        const doc = parseMarkdown("Just content.\n\nNo headings here.");
        expect(doc.sections).toHaveLength(1);
        expect(doc.sections[0].level).toBe(0);
        expect(doc.sections[0].title).toBeNull();
        expect(doc.sections[0].content).toContain("Just content.");
    });

    it("section content is null when heading has no body", () => {
        const doc = parseMarkdown("## Heading\n\n## Next");
        expect(doc.sections[0].content).toBeNull();
    });

    it("section content is null for empty heading", () => {
        const doc = parseMarkdown("## Heading");
        expect(doc.sections[0].content).toBeNull();
    });

    it("content never returns empty string — always null when empty", () => {
        const doc = parseMarkdown("## A\n\n## B\n\n## C");
        for (const s of doc.sections) {
            expect(s.content).not.toBe("");
        }
    });

    it("assigns content to the correct preceding heading", () => {
        const doc = parseMarkdown("## A\n\nContent A.\n\n## B\n\nContent B.");
        expect(doc.sections[0].content).toBe("Content A.");
        expect(doc.sections[1].content).toBe("Content B.");
    });

    it("trailing content after last heading belongs to that section", () => {
        const doc = parseMarkdown("## Last\n\nTrailing content.");
        expect(doc.sections[0].content).toBe("Trailing content.");
    });

    it("all section ids are unique within a document", () => {
        const doc = parseMarkdown("## A\n\n## A\n\n## A");
        const ids = allIds(doc.sections);
        expect(new Set(ids).size).toBe(ids.length);
    });

    it("section ids are non-empty strings", () => {
        const doc = parseMarkdown("## Hello\n\n### World");
        const ids = allIds(doc.sections);
        expect(ids.every((id) => typeof id === "string" && id.length > 0)).toBe(true);
    });
});

// ---------------------------------------------------------------------------
// parseMarkdown — heading types (regression: setext, ATX-closing)
// ---------------------------------------------------------------------------

describe("parseMarkdown — heading forms", () => {
    it("parses ATX h1–h6", () => {
        const doc = parseMarkdown("# H1\n\n## H2\n\n### H3\n\n#### H4\n\n##### H5\n\n###### H6");
        // All headings nest under h1, so flatten to check all levels are parsed
        function flatten(sections: MdSection[]): MdSection[] {
            return sections.flatMap((s) => [s, ...flatten(s.children)]);
        }
        const levels = flatten(doc.sections).map((s) => s.level);
        expect(levels).toEqual([1, 2, 3, 4, 5, 6]);
    });

    it("parses Setext h1 (===) — title is correct", () => {
        const doc = parseMarkdown("My Title\n========");
        expect(doc.sections[0].title).toBe("My Title");
        expect(doc.sections[0].level).toBe(1);
    });

    it("parses Setext h2 (---) — title is correct", () => {
        const doc = parseMarkdown("Sub Heading\n-----------");
        expect(doc.sections[0].title).toBe("Sub Heading");
        expect(doc.sections[0].level).toBe(2);
    });

    it("Setext rawTitle has no underline contamination (regression)", () => {
        // Sub (h2) nests under My Title (h1) — check both levels
        const doc = parseMarkdown("My Title\n========\n\nSub\n---");
        const h1 = doc.sections[0];
        const h2 = h1.children[0];
        expect(h1.rawTitle).toBe("My Title");
        expect(h2.rawTitle).toBe("Sub");
        // Must not contain the setext underline characters
        expect(h1.rawTitle).not.toContain("=");
        expect(h2.rawTitle).not.toContain("-");
    });

    it("ATX closing sequence stripped from rawTitle (regression)", () => {
        const doc = parseMarkdown("## Title ##");
        expect(doc.sections[0].rawTitle).toBe("Title");
        expect(doc.sections[0].rawTitle).not.toContain("#");
    });

    it("inline formatting preserved in rawTitle", () => {
        const doc = parseMarkdown("## My **Bold** and _Italic_ heading");
        expect(doc.sections[0].rawTitle).toBe("My **Bold** and _Italic_ heading");
    });

    it("inline code preserved in rawTitle", () => {
        const doc = parseMarkdown("## Use `npm install`");
        expect(doc.sections[0].rawTitle).toBe("Use `npm install`");
    });

    it("inline link preserved in rawTitle", () => {
        const doc = parseMarkdown("## See [docs](https://example.com)");
        expect(doc.sections[0].rawTitle).toBe("See [docs](https://example.com)");
    });

    it("title is always plain text (no markdown)", () => {
        const doc = parseMarkdown("## My **Bold** _Italic_ heading");
        expect(doc.sections[0].title).toBe("My Bold Italic heading");
    });

    it("empty ATX heading has null rawTitle fallback to empty string (not crash)", () => {
        const doc = parseMarkdown("##");
        expect(doc.sections[0].title).toBe("");
        expect(doc.sections[0].level).toBe(2);
    });
});

// ---------------------------------------------------------------------------
// parseMarkdown — nesting
// ---------------------------------------------------------------------------

describe("parseMarkdown — nesting", () => {
    it("h3 under h2 becomes a child", () => {
        const doc = parseMarkdown("## Parent\n\n### Child");
        expect(doc.sections).toHaveLength(1);
        expect(doc.sections[0].children).toHaveLength(1);
        expect(doc.sections[0].children[0].title).toBe("Child");
    });

    it("sub-heading content does not bleed into parent content", () => {
        const doc = parseMarkdown("## Parent\n\nParent body.\n\n### Child\n\nChild body.");
        expect(doc.sections[0].content).toBe("Parent body.");
        expect(doc.sections[0].children[0].content).toBe("Child body.");
    });

    it("heading that skips a level (h1 → h3) still nests under h1", () => {
        const doc = parseMarkdown("# Top\n\n### Deep");
        expect(doc.sections).toHaveLength(1);
        expect(doc.sections[0].children[0].level).toBe(3);
    });

    it("returning to a higher level creates sibling root, not child", () => {
        const doc = parseMarkdown("## A\n\n### A.1\n\n## B");
        expect(doc.sections).toHaveLength(2);
        expect(doc.sections[0].title).toBe("A");
        expect(doc.sections[1].title).toBe("B");
        expect(doc.sections[0].children[0].title).toBe("A.1");
    });

    it("deeply nested h1→h2→h3→h4→h5→h6", () => {
        const src = "# L1\n\n## L2\n\n### L3\n\n#### L4\n\n##### L5\n\n###### L6";
        const doc = parseMarkdown(src);
        expect(doc.sections).toHaveLength(1);
        const l1 = doc.sections[0];
        const l2 = l1.children[0];
        const l3 = l2.children[0];
        const l4 = l3.children[0];
        const l5 = l4.children[0];
        const l6 = l5.children[0];
        expect(l6.level).toBe(6);
        expect(l6.title).toBe("L6");
    });

    it("multiple same-level siblings at root", () => {
        const doc = parseMarkdown("## A\n\n## B\n\n## C");
        expect(doc.sections).toHaveLength(3);
        expect(doc.sections.map((s) => s.title)).toEqual(["A", "B", "C"]);
    });
});

// ---------------------------------------------------------------------------
// safeParseMarkdown
// ---------------------------------------------------------------------------

describe("safeParseMarkdown", () => {
    it("returns ok:true with data on valid input", () => {
        const result = safeParseMarkdown("## Hello");
        expect(result.ok).toBe(true);
        if (result.ok) expect(result.data.sections[0].title).toBe("Hello");
    });

    it("returns ok:false with MdParseError on invalid YAML", () => {
        const result = safeParseMarkdown("---\n- list: not: mapping\n---");
        expect(result.ok).toBe(false);
        if (!result.ok) expect(result.error).toBeInstanceOf(MdParseError);
    });

    it("never throws — even on garbage input", () => {
        expect(() => safeParseMarkdown("---\n: : :\n---")).not.toThrow();
    });
});

// ---------------------------------------------------------------------------
// serializeMarkdown
// ---------------------------------------------------------------------------

describe("serializeMarkdown", () => {
    it("serializes frontmatter as --- block", () => {
        const doc = parseMarkdown("---\ntitle: My Post\n---\n\n## Hello");
        const out = serializeMarkdown(doc);
        expect(out).toContain("---\ntitle: My Post\n---");
    });

    it("no frontmatter block when frontmatter is null", () => {
        const doc = parseMarkdown("## Hello");
        const out = serializeMarkdown(doc);
        expect(out).not.toContain("---");
    });

    it("emits correct ATX heading markers", () => {
        const doc = parseMarkdown("## H2\n\n### H3");
        const out = serializeMarkdown(doc);
        expect(out).toContain("## H2");
        expect(out).toContain("### H3");
    });

    it("preamble content appears without a heading line", () => {
        const doc = parseMarkdown("Preamble text.\n\n## Section");
        const out = serializeMarkdown(doc);
        expect(out.startsWith("Preamble text.")).toBe(true);
    });

    it("inline formatting in rawTitle is preserved in output", () => {
        const doc = parseMarkdown("## My **Bold** heading");
        const out = serializeMarkdown(doc);
        expect(out).toContain("## My **Bold** heading");
    });

    it("output ends with a single newline", () => {
        const out = serializeMarkdown(parseMarkdown("## Hello"));
        expect(out.endsWith("\n")).toBe(true);
        expect(out.endsWith("\n\n")).toBe(false);
    });

    it("throws MdParseError on non-serializable frontmatter (Date)", () => {
        const doc = parseMarkdown("## Hello");
        doc.frontmatter = { when: new Date() };
        expect(() => serializeMarkdown(doc)).toThrow(MdParseError);
    });
});

// ---------------------------------------------------------------------------
// safeSerializeMarkdown
// ---------------------------------------------------------------------------

describe("safeSerializeMarkdown", () => {
    it("returns ok:true with markdown string on valid doc", () => {
        const doc = parseMarkdown("## Hello");
        const result = safeSerializeMarkdown(doc);
        expect(result.ok).toBe(true);
        if (result.ok) expect(result.data).toContain("## Hello");
    });

    it("returns ok:false with MdParseError on non-serializable frontmatter", () => {
        const doc = parseMarkdown("## Hello");
        doc.frontmatter = { when: new Date() };
        const result = safeSerializeMarkdown(doc);
        expect(result.ok).toBe(false);
        if (!result.ok) expect(result.error).toBeInstanceOf(MdParseError);
    });

    it("never throws", () => {
        const doc = parseMarkdown("## Hello");
        doc.frontmatter = { fn: () => 1 } as never;
        expect(() => safeSerializeMarkdown(doc)).not.toThrow();
    });
});

// ---------------------------------------------------------------------------
// Round-trip: parse → serialize → parse
// ---------------------------------------------------------------------------

describe("round-trip", () => {
    function roundTrip(src: string) {
        const doc1 = parseMarkdown(src);
        const md = serializeMarkdown(doc1);
        const doc2 = parseMarkdown(md);
        return { doc1, doc2, md };
    }

    it("frontmatter values survive round-trip", () => {
        const { doc1, doc2 } = roundTrip("---\ntitle: Hello\ntags: [a, b]\n---\n\n## Section");
        expect(doc2.frontmatter).toEqual(doc1.frontmatter);
    });

    it("section count is stable after round-trip", () => {
        const { doc1, doc2 } = roundTrip("## A\n\n### B\n\n## C");
        expect(doc2.sections.length).toBe(doc1.sections.length);
    });

    it("section titles are stable after round-trip", () => {
        const src = "## Alpha\n\n### Beta\n\n## Gamma";
        const { doc1, doc2 } = roundTrip(src);
        const titles = (s: MdSection[]): string[] =>
            s.flatMap((x) => [x.title ?? "", ...titles(x.children)]);
        expect(titles(doc2.sections)).toEqual(titles(doc1.sections));
    });

    it("section content is stable after round-trip", () => {
        const src = "## A\n\nContent for A.\n\n## B\n\nContent for B.";
        const { doc1, doc2 } = roundTrip(src);
        expect(doc2.sections[0].content).toBe(doc1.sections[0].content);
        expect(doc2.sections[1].content).toBe(doc1.sections[1].content);
    });

    it("Setext headings normalize to ATX on round-trip (no stray paragraphs)", () => {
        const { doc2, md } = roundTrip("Title\n=====\n\nbody\n\nSub\n---\n\nmore");
        expect(md).toContain("# Title");
        expect(md).toContain("## Sub");
        // No extra sections from underline leaking into AST
        expect(doc2.sections[0].title).toBe("Title");
        expect(doc2.sections[0].children[0].title).toBe("Sub");
    });

    it("ATX closing sequence normalizes on round-trip", () => {
        const { md } = roundTrip("## Title ##\n\nbody");
        expect(md).toContain("## Title");
        expect(md).not.toContain("## Title ##");
    });

    it("inline formatting in headings survives round-trip", () => {
        const { doc2 } = roundTrip("## My **Bold** and _Italic_ heading\n\nbody");
        expect(doc2.sections[0].title).toBe("My Bold and Italic heading");
        expect(doc2.sections[0].rawTitle).toBe("My **Bold** and _Italic_ heading");
    });

    it("second round-trip is identical to first (idempotent)", () => {
        const src = "---\ntitle: T\n---\n\n## A\n\nbody\n\n### B\n\nmore";
        const md1 = serializeMarkdown(parseMarkdown(src));
        const md2 = serializeMarkdown(parseMarkdown(md1));
        expect(md2).toBe(md1);
    });
});
