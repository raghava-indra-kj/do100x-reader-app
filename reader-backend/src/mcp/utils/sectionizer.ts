export interface ParsedSection {
  index: number;
  level: number;
  heading: string;
  startLine: number; // 1-indexed
  endLine: number;   // 1-indexed, inclusive
  content: string;   // body content excluding heading
  rawBlock: string;  // full text including heading line
}

/**
 * Parses markdown into structured sections based on headings (# ...).
 * Accurately tracks line ranges and handles frontmatter and leading content.
 */
export function parseMarkdownSections(markdown: string): ParsedSection[] {
  const lines = markdown.split(/\r?\n/);
  const sections: ParsedSection[] = [];

  let inFrontmatter = false;
  let frontmatterEndLine = -1;

  // Check for YAML frontmatter
  if (lines.length > 0 && lines[0].trim() === "---") {
    inFrontmatter = true;
    for (let i = 1; i < lines.length; i++) {
      if (lines[i].trim() === "---") {
        inFrontmatter = false;
        frontmatterEndLine = i + 1; // 1-indexed
        break;
      }
    }
  }

  interface HeadingMarker {
    lineIndex: number; // 0-indexed
    level: number;
    headingText: string;
    rawLine: string;
  }

  const markers: HeadingMarker[] = [];
  const startScan = frontmatterEndLine > 0 ? frontmatterEndLine : 0;

  for (let i = startScan; i < lines.length; i++) {
    const line = lines[i];
    const match = line.match(/^(#{1,6})\s+(.*)$/);
    if (match) {
      markers.push({
        lineIndex: i,
        level: match[1].length,
        headingText: match[2].trim(),
        rawLine: line,
      });
    }
  }

  // If there is content before the first heading, treat it as Section 0 (Preamble / Overview)
  if (markers.length > 0 && markers[0].lineIndex > startScan) {
    const preambleLines = lines.slice(startScan, markers[0].lineIndex);
    const content = preambleLines.join("\n").trim();
    if (content.length > 0) {
      sections.push({
        index: 0,
        level: 0,
        heading: "(Preamble / Header Content)",
        startLine: startScan + 1,
        endLine: markers[0].lineIndex,
        content: preambleLines.join("\n"),
        rawBlock: preambleLines.join("\n"),
      });
    }
  }

  for (let m = 0; m < markers.length; m++) {
    const current = markers[m];
    const nextLineIndex = m + 1 < markers.length ? markers[m + 1].lineIndex : lines.length;

    const blockLines = lines.slice(current.lineIndex, nextLineIndex);
    const bodyLines = lines.slice(current.lineIndex + 1, nextLineIndex);

    sections.push({
      index: sections.length,
      level: current.level,
      heading: current.headingText,
      startLine: current.lineIndex + 1,
      endLine: nextLineIndex,
      content: bodyLines.join("\n").trim(),
      rawBlock: blockLines.join("\n"),
    });
  }

  // If document had no headings at all, treat entire document as Section 0
  if (sections.length === 0) {
    sections.push({
      index: 0,
      level: 0,
      heading: "(Full Page Body)",
      startLine: 1,
      endLine: lines.length,
      content: markdown,
      rawBlock: markdown,
    });
  }

  return sections;
}

/**
 * Updates a section by its 0-based index.
 */
export function updateSectionByIndex(
  markdown: string,
  sectionIndex: number,
  newContent: string,
  preserveHeading = true
): { updatedMarkdown: string; section: ParsedSection } {
  const sections = parseMarkdownSections(markdown);

  if (sectionIndex < 0 || sectionIndex >= sections.length) {
    throw new Error(
      `Invalid sectionIndex ${sectionIndex}. Available section indices are 0 to ${sections.length - 1}.`
    );
  }

  const target = sections[sectionIndex];
  const lines = markdown.split(/\r?\n/);

  let replacementLines: string[];
  let replaceStart: number;
  let replaceEnd: number;

  if (preserveHeading && target.level > 0) {
    // Keep heading line, replace lines below it
    const headingLine = lines[target.startLine - 1];
    replaceStart = target.startLine; // line after heading
    replaceEnd = target.endLine;     // up to endLine
    replacementLines = newContent.trim() ? ["", ...newContent.split(/\r?\n/)] : [];
  } else {
    // Replace full block including heading
    replaceStart = target.startLine - 1;
    replaceEnd = target.endLine;
    replacementLines = newContent.split(/\r?\n/);
  }

  const before = lines.slice(0, replaceStart);
  const after = lines.slice(replaceEnd);

  const updatedLines = [...before, ...replacementLines, ...after];
  return {
    updatedMarkdown: updatedLines.join("\n"),
    section: target,
  };
}

/**
 * Replaces a 1-indexed line range [startLine, endLine] with new content.
 */
export function replaceLines(
  markdown: string,
  startLine: number,
  endLine: number,
  replacementContent: string,
  expectedContent?: string
): string {
  const lines = markdown.split(/\r?\n/);

  if (startLine < 1 || startLine > lines.length) {
    throw new Error(`startLine ${startLine} is out of bounds (1-${lines.length})`);
  }
  if (endLine < startLine || endLine > lines.length) {
    throw new Error(`endLine ${endLine} is invalid (must be between startLine ${startLine} and ${lines.length})`);
  }

  if (expectedContent !== undefined) {
    const existingSnippet = lines.slice(startLine - 1, endLine).join("\n");
    if (existingSnippet.trim() !== expectedContent.trim()) {
      throw new Error(
        `Safety check failed: Content at lines ${startLine}-${endLine} did not match expectedContent.\nExisting:\n"""\n${existingSnippet}\n"""\nExpected:\n"""\n${expectedContent}\n"""`
      );
    }
  }

  const before = lines.slice(0, startLine - 1);
  const after = lines.slice(endLine);
  const replacementLines = replacementContent.split(/\r?\n/);

  return [...before, ...replacementLines, ...after].join("\n");
}

/**
 * Inserts a new section after a given section index.
 */
export function insertSectionAfterIndex(
  markdown: string,
  afterSectionIndex: number | undefined,
  heading: string,
  content: string
): string {
  const sections = parseMarkdownSections(markdown);
  const lines = markdown.split(/\r?\n/);

  const formattedNewSection = `\n\n${heading}\n${content.trim()}\n`;

  if (afterSectionIndex === undefined || afterSectionIndex >= sections.length - 1) {
    // Append to bottom
    return markdown.trimEnd() + formattedNewSection;
  }

  if (afterSectionIndex < 0) {
    // Prepend to top (after frontmatter if any)
    const firstSection = sections[0];
    const insertLine = firstSection.startLine - 1;
    const before = lines.slice(0, insertLine);
    const after = lines.slice(insertLine);
    return [...before, `${heading}\n${content.trim()}\n`, ...after].join("\n");
  }

  const target = sections[afterSectionIndex];
  const insertLine = target.endLine;
  const before = lines.slice(0, insertLine);
  const after = lines.slice(insertLine);

  return [...before, formattedNewSection, ...after].join("\n");
}
