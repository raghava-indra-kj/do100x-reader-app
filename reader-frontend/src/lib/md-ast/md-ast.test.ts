import { describe, it, expect } from "vitest";
import {
    parseMarkdown,
    safeParseMarkdown,
    toMarkdown,
    safeToMarkdown,
    toJson,
    fromJson,
    safeFromJson,
    reuseIds,
    MdAstError,
} from "./index";
import type { Block } from "./index";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function seq(): () => string {
    let n = 0;
    return () => `b${n++}`;
}

function parse(src: string) {
    return parseMarkdown(src, { generateId: seq() });
}

// ---------------------------------------------------------------------------
// parseMarkdown — document shape
// ---------------------------------------------------------------------------

describe("parseMarkdown — document shape", () => {
    it("empty string → no blocks, null frontmatter", () => {
        const doc = parse("");
        expect(doc.blocks).toEqual([]);
        expect(doc.frontmatter).toBeNull();
    });

    it("whitespace-only string → no blocks", () => {
        expect(parse("   \n\n  ").blocks).toEqual([]);
    });

    it("a document with no headings produces only unknown blocks", () => {
        const doc = parse("Just content.\n\nNo headings here.");
        expect(doc.blocks.every((b) => b.type === "unknown")).toBe(true);
    });

    it("a whole document can be a single block", () => {
        const doc = parse("Only one paragraph.");
        expect(doc.blocks).toHaveLength(1);
        expect(doc.blocks[0]).toMatchObject({ type: "unknown", nodeType: "paragraph", markdown: "Only one paragraph." });
    });
});

// ---------------------------------------------------------------------------
// parseMarkdown — block types
// ---------------------------------------------------------------------------

describe("parseMarkdown — block types", () => {
    it("paragraph → unknown block with nodeType 'paragraph'", () => {
        const [block] = parse("Hello **world**.").blocks;
        expect(block).toEqual({ id: "b0", type: "unknown", nodeType: "paragraph", markdown: "Hello **world**." });
    });

    it("heading carries level and verbatim markdown", () => {
        const [block] = parse("## My **Bold** Heading").blocks;
        expect(block).toEqual({ id: "b0", type: "heading", level: 2, markdown: "## My **Bold** Heading" });
    });

    it("all heading levels parse with correct level", () => {
        const doc = parse("# A\n\n## B\n\n### C\n\n#### D\n\n##### E\n\n###### F");
        expect(doc.blocks.map((b) => b.type === "heading" ? b.level : null)).toEqual([1, 2, 3, 4, 5, 6]);
    });

    it("code fence → unknown block with nodeType 'code', raw preserved", () => {
        const [block] = parse("```js\nconst x = 1;\n```").blocks;
        expect(block).toEqual({ id: "b0", type: "unknown", nodeType: "code", markdown: "```js\nconst x = 1;\n```" });
    });

    it("list → unknown block with nodeType 'list', raw preserved", () => {
        const [block] = parse("- a\n- b").blocks;
        expect(block).toEqual({ id: "b0", type: "unknown", nodeType: "list", markdown: "- a\n- b" });
    });

    it("nested list stays one block with nesting preserved in markdown", () => {
        const doc = parse("- a\n  - b\n- c");
        expect(doc.blocks).toHaveLength(1);
        expect(doc.blocks[0]).toMatchObject({ type: "unknown", nodeType: "list", markdown: "- a\n  - b\n- c" });
    });

    it("blockquote → unknown block, raw preserved", () => {
        const [block] = parse("> quoted line").blocks;
        expect(block).toMatchObject({ type: "unknown", nodeType: "blockquote", markdown: "> quoted line" });
    });

    it("GFM table → unknown block, raw preserved", () => {
        const src = "| a | b |\n| - | - |\n| 1 | 2 |";
        const [block] = parse(src).blocks;
        expect(block).toMatchObject({ type: "unknown", nodeType: "table", markdown: src });
    });

    it("thematic break → unknown block, raw preserved", () => {
        const [block] = parse("***").blocks;
        expect(block).toMatchObject({ type: "unknown", nodeType: "thematicBreak", markdown: "***" });
    });

    it("display math → unknown block, raw preserved", () => {
        const [block] = parse("$$\nx = 1\n$$").blocks;
        expect(block).toMatchObject({ type: "unknown", nodeType: "math", markdown: "$$\nx = 1\n$$" });
    });
});

// ---------------------------------------------------------------------------
// parseMarkdown — ids
// ---------------------------------------------------------------------------

describe("parseMarkdown — ids", () => {
    it("default ids are non-empty strings", () => {
        const doc = parseMarkdown("# A\n\nbody");
        expect(doc.blocks.every((b) => typeof b.id === "string" && b.id.length > 0)).toBe(true);
    });

    it("consecutive identical blocks get distinct ids", () => {
        const doc = parseMarkdown("same\n\nsame");
        expect(doc.blocks[0].id).not.toBe(doc.blocks[1].id);
    });

    it("generateId override is used in order", () => {
        const doc = parse("# A\n\nbody\n\n## B");
        expect(doc.blocks.map((b) => b.id)).toEqual(["b0", "b1", "b2"]);
    });
});

// ---------------------------------------------------------------------------
// parseMarkdown — frontmatter
// ---------------------------------------------------------------------------

describe("parseMarkdown — frontmatter", () => {
    it("returns null when no --- block", () => {
        expect(parse("# Hello").frontmatter).toBeNull();
    });

    it("parses a frontmatter mapping and excludes it from blocks", () => {
        const doc = parse("---\ntitle: My Post\ntags: [a, b]\n---\n\n# Hello");
        expect(doc.frontmatter).toEqual({ title: "My Post", tags: ["a", "b"] });
        expect(doc.blocks.map((b) => b.type)).toEqual(["heading"]);
    });

    it("frontmatter-only document → no blocks", () => {
        const doc = parse("---\ntitle: x\n---\n");
        expect(doc.frontmatter).toEqual({ title: "x" });
        expect(doc.blocks).toEqual([]);
    });

    it("empty frontmatter block → null", () => {
        expect(parse("---\n---\n\n# Hello").frontmatter).toBeNull();
    });

    it("does not coerce dates or yes/no (JSON_SCHEMA)", () => {
        const doc = parse("---\ndate: 2024-01-15\nflag: 'yes'\n---");
        expect(doc.frontmatter).toEqual({ date: "2024-01-15", flag: "yes" });
    });

    it("throws MdAstError on invalid YAML", () => {
        expect(() => parse("---\n: bad: yaml: :\n---")).toThrow(MdAstError);
    });

    it("throws MdAstError when frontmatter is an array, not a mapping", () => {
        expect(() => parse("---\n- one\n- two\n---")).toThrow(MdAstError);
    });
});

// ---------------------------------------------------------------------------
// safeParseMarkdown
// ---------------------------------------------------------------------------

describe("safeParseMarkdown", () => {
    it("returns ok:true with data on valid input", () => {
        const result = safeParseMarkdown("# Hello");
        expect(result.ok).toBe(true);
        if (result.ok) expect(result.data.blocks[0]).toMatchObject({ type: "heading" });
    });

    it("returns ok:false with MdAstError on invalid YAML", () => {
        const result = safeParseMarkdown("---\n- not: a: mapping\n---");
        expect(result.ok).toBe(false);
        if (!result.ok) expect(result.error).toBeInstanceOf(MdAstError);
    });

    it("never throws", () => {
        expect(() => safeParseMarkdown("---\n: : :\n---")).not.toThrow();
    });
});

// ---------------------------------------------------------------------------
// toMarkdown (ast → md) + round-trip
// ---------------------------------------------------------------------------

describe("toMarkdown", () => {
    it("re-emits frontmatter and blocks", () => {
        const doc = parse("---\ntitle: My Post\n---\n\n# Hello\n\nbody");
        const out = toMarkdown(doc);
        expect(out).toContain("---\ntitle: My Post\n---");
        expect(out).toContain("# Hello");
        expect(out).toContain("body");
    });

    it("no frontmatter block when frontmatter is null", () => {
        expect(toMarkdown(parse("# Hello"))).not.toContain("---");
    });

    it("ends with a single newline", () => {
        const out = toMarkdown(parse("# Hello"));
        expect(out.endsWith("\n")).toBe(true);
        expect(out.endsWith("\n\n")).toBe(false);
    });

    it("throws MdAstError on non-serializable frontmatter (Date)", () => {
        const doc = parse("# Hello");
        doc.frontmatter = { when: new Date() };
        expect(() => toMarkdown(doc)).toThrow(MdAstError);
    });

    it("block types and markdown are stable across a round-trip", () => {
        const src = "# Title\n\npara\n\n```js\ncode\n```\n\n- a\n- b";
        const shape = (blocks: Block[]) => blocks.map((b) => [b.type, b.markdown]);
        const first = parse(src);
        const second = parse(toMarkdown(first));
        expect(shape(second.blocks)).toEqual(shape(first.blocks));
    });

    it("second round-trip is byte-identical (idempotent)", () => {
        const src = "---\ntitle: T\n---\n\n# A\n\nbody\n\n## B\n\nmore";
        const md1 = toMarkdown(parse(src));
        const md2 = toMarkdown(parse(md1));
        expect(md2).toBe(md1);
    });
});

describe("safeToMarkdown", () => {
    it("returns ok:false with MdAstError on non-serializable frontmatter", () => {
        const doc = parse("# Hello");
        doc.frontmatter = { when: new Date() };
        const result = safeToMarkdown(doc);
        expect(result.ok).toBe(false);
        if (!result.ok) expect(result.error).toBeInstanceOf(MdAstError);
    });
});

// ---------------------------------------------------------------------------
// toJson / fromJson (ast ↔ json)
// ---------------------------------------------------------------------------

describe("toJson / fromJson", () => {
    it("round-trips through JSON without data loss", () => {
        const doc = parse("---\ntitle: T\n---\n\n# A\n\nbody\n\n```js\nx\n```");
        const restored = fromJson(JSON.parse(JSON.stringify(toJson(doc))));
        expect(restored).toEqual(doc);
    });

    it("toJson returns a detached clone (no shared references)", () => {
        const doc = parse("# A");
        const json = toJson(doc);
        expect(json).toEqual(doc);
        expect(json.blocks).not.toBe(doc.blocks);
    });

    it("fromJson throws MdAstError on a malformed document", () => {
        expect(() => fromJson({ frontmatter: null, blocks: [{ type: "nope" }] })).toThrow(MdAstError);
    });

    it("safeFromJson returns ok:false on garbage", () => {
        const result = safeFromJson("not a document");
        expect(result.ok).toBe(false);
        if (!result.ok) expect(result.error).toBeInstanceOf(MdAstError);
    });

    it("safeFromJson returns ok:true on a valid document", () => {
        const doc = parse("# A\n\nbody");
        const result = safeFromJson(toJson(doc));
        expect(result.ok).toBe(true);
        if (result.ok) expect(result.data).toEqual(doc);
    });
});

// ---------------------------------------------------------------------------
// reuseIds
// ---------------------------------------------------------------------------

describe("reuseIds", () => {
    it("carries ids onto unchanged blocks", () => {
        const previous = parseMarkdown("# Title\n\nbody");
        const next = parseMarkdown("# Title\n\nbody");
        const merged = reuseIds(previous, next);
        expect(merged.blocks.map((b) => b.id)).toEqual(previous.blocks.map((b) => b.id));
    });

    it("an edited block keeps its freshly parsed id", () => {
        const previous = parseMarkdown("# Title\n\nold body");
        const next = parseMarkdown("# Title\n\nnew body");
        const merged = reuseIds(previous, next);
        expect(merged.blocks[0].id).toBe(previous.blocks[0].id);
        expect(merged.blocks[1].id).toBe(next.blocks[1].id);
    });

    it("pairs duplicate identical blocks in order", () => {
        const previous = parseMarkdown("dup\n\ndup");
        const next = parseMarkdown("dup\n\ndup");
        const merged = reuseIds(previous, next);
        expect(merged.blocks.map((b) => b.id)).toEqual(previous.blocks.map((b) => b.id));
    });

    it("does not mutate its inputs", () => {
        const previous = parseMarkdown("# Title");
        const next = parseMarkdown("# Title");
        const nextIdBefore = next.blocks[0].id;
        reuseIds(previous, next);
        expect(next.blocks[0].id).toBe(nextIdBefore);
    });
});
