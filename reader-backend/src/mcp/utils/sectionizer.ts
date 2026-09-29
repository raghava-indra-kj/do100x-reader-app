import { editableSectionBody, locateSections, replaceSectionBody, sectionBodyTarget, type MarkdownSectionRange } from "@reader/md-ast";

export interface ParsedSection {
  index: number;
  level: number;
  heading: string;
  startLine: number;
  endLine: number;
  content: string;
  rawBlock: string;
  range: MarkdownSectionRange;
}

const lineNumber = (source: string, offset: number) => source.slice(0, offset).split(/\r\n|\r|\n/).length;

/** Sections share the UI parser: fenced code, Setext headings, and frontmatter are handled correctly. */
export function parseMarkdownSections(markdown: string): ParsedSection[] {
  return locateSections(markdown).map((range, index) => ({
    index, level: range.level, heading: range.title ?? "(Preamble / Body)",
    startLine: lineNumber(markdown, range.headingStart ?? range.bodyStart),
    endLine: Math.max(1, lineNumber(markdown, Math.max(range.bodyStart, range.bodyEnd - 1))),
    content: editableSectionBody(markdown, range),
    rawBlock: markdown.slice(range.headingStart ?? range.bodyStart, range.bodyEnd),
    range,
  }));
}

export function updateSectionByIndex(markdown: string, sectionIndex: number, newContent: string, preserveHeading = true) {
  const section = parseMarkdownSections(markdown)[sectionIndex];
  if (!section) throw new Error(`Invalid sectionIndex ${sectionIndex}`);
  const updatedMarkdown = preserveHeading
    ? replaceSectionBody({ source: markdown, target: sectionBodyTarget(markdown, section.range), newBody: newContent })
    : markdown.slice(0, section.range.headingStart ?? section.range.bodyStart) + newContent + (section.range.bodyEnd < markdown.length ? "\n\n" : "") + markdown.slice(section.range.bodyEnd);
  return { updatedMarkdown, section };
}

/** Replace exact source lines, preserving every character outside the selected range. */
export function replaceLines(markdown: string, startLine: number, endLine: number, replacementContent: string, expectedContent?: string): string {
  const starts = [0];
  for (const match of markdown.matchAll(/\r\n|\r|\n/g)) starts.push(match.index! + match[0].length);
  if (startLine < 1 || endLine < startLine || endLine > starts.length) throw new Error("Invalid line range");
  const start = starts[startLine - 1];
  const end = endLine < starts.length ? starts[endLine] : markdown.length;
  const existing = markdown.slice(start, end).replace(/(?:\r\n|\r|\n)$/, "");
  if (expectedContent !== undefined && existing !== expectedContent) throw new Error("Line content changed before this edit could be applied");
  const eol = markdown.includes("\r\n") ? "\r\n" : "\n";
  return markdown.slice(0, start) + replacementContent.replace(/\r\n|\r|\n/g, eol) + (end < markdown.length ? eol : "") + markdown.slice(end);
}

export function insertSectionAfterIndex(markdown: string, afterSectionIndex: number | undefined, heading: string, content: string): string {
  const sections = parseMarkdownSections(markdown);
  const eol = markdown.includes("\r\n") ? "\r\n" : "\n";
  const insertion = `${eol}${eol}${heading}${eol}${eol}${content}${eol}${eol}`;
  if (afterSectionIndex === undefined) return markdown + insertion;
  if (afterSectionIndex < -1 || afterSectionIndex >= sections.length) throw new Error("Invalid section index");
  const target = afterSectionIndex === -1 ? sections[0]?.range.headingStart ?? sections[0]?.range.bodyStart ?? markdown.length : sections[afterSectionIndex]?.range.bodyEnd;
  if (target === undefined) throw new Error("Invalid section index");
  return markdown.slice(0, target) + insertion + markdown.slice(target);
}
