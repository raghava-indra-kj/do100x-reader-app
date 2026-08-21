/**
 * AST-backed section operations for MCP. Native dynamic imports preserve the
 * ESM-only unified/remark packages while the backend itself remains CommonJS.
 */
type AstNode = { type: string; depth?: number; children?: Array<{ position?: { start?: { offset?: number }; end?: { offset?: number } } }>; position?: { start?: { offset?: number }; end?: { offset?: number } } };

export interface MarkdownSection {
  index: number;
  level: number;
  heading: string;
  startLine: number;
  endLine: number;
  content: string;
  startOffset: number;
  headingEndOffset: number;
  endOffset: number;
}

const dynamicImport = new Function("specifier", "return import(specifier)") as (specifier: string) => Promise<any>;

function lineAt(source: string, offset: number) {
  return source.slice(0, offset).split(/\r?\n/).length;
}

function headingText(node: AstNode, source: string) {
  const children = node.children ?? [];
  const start = children[0]?.position?.start?.offset;
  const end = children[children.length - 1]?.position?.end?.offset;
  return start === undefined || end === undefined ? "" : source.slice(start, end);
}

export async function parseMarkdownSectionsAst(source: string): Promise<MarkdownSection[]> {
  const [{ unified }, parseModule, frontmatterModule, gfmModule, mathModule] = await Promise.all([
    dynamicImport("unified"), dynamicImport("remark-parse"), dynamicImport("remark-frontmatter"), dynamicImport("remark-gfm"), dynamicImport("remark-math"),
  ]);
  const processor = unified().use(parseModule.default).use(frontmatterModule.default).use(gfmModule.default).use(mathModule.default);
  const tree = processor.parse(source) as { children: AstNode[] };
  const headings = tree.children.filter((node) => node.type === "heading" && node.position?.start?.offset !== undefined && node.position?.end?.offset !== undefined);
  if (headings.length === 0) {
    return [{ index: 0, level: 0, heading: "(Full Page Body)", startLine: 1, endLine: Math.max(1, lineAt(source, source.length)), content: source, startOffset: 0, headingEndOffset: 0, endOffset: source.length }];
  }
  return headings.map((node, index) => {
    const startOffset = node.position!.start!.offset!;
    const headingEndOffset = node.position!.end!.offset!;
    const endOffset = index + 1 < headings.length ? headings[index + 1].position!.start!.offset! : source.length;
    const body = source.slice(headingEndOffset, endOffset).replace(/^\r?\n/, "").trim();
    return { index, level: node.depth ?? 1, heading: headingText(node, source), startLine: lineAt(source, startOffset), endLine: Math.max(lineAt(source, startOffset), lineAt(source, endOffset)), content: body, startOffset, headingEndOffset, endOffset };
  });
}

export async function replaceSectionBody(source: string, sectionIndex: number, newContent: string, preserveHeading = true) {
  const sections = await parseMarkdownSectionsAst(source);
  const section = sections[sectionIndex];
  if (!section) throw new Error(`Invalid sectionIndex: ${sectionIndex}`);
  if (!preserveHeading || section.level === 0) {
    return { section, markdown: `${source.slice(0, section.startOffset)}${newContent}${source.slice(section.endOffset)}` };
  }
  const normalized = newContent.trim() ? `\n\n${newContent.trim()}\n` : "\n";
  return { section, markdown: `${source.slice(0, section.headingEndOffset)}${normalized}${source.slice(section.endOffset)}` };
}

export async function insertSection(source: string, afterSectionIndex: number | undefined, heading: string, content: string) {
  const sections = await parseMarkdownSectionsAst(source);
  if (afterSectionIndex !== undefined && (afterSectionIndex < 0 || afterSectionIndex >= sections.length)) throw new Error(`Invalid sectionIndex: ${afterSectionIndex}`);
  const insertion = `${source.trimEnd() ? "\n\n" : ""}${heading.trim()}\n\n${content.trim()}\n`;
  if (afterSectionIndex === undefined || afterSectionIndex === sections.length - 1) return source.trimEnd() + insertion;
  const point = sections[afterSectionIndex].endOffset;
  return `${source.slice(0, point).trimEnd()}${insertion}${source.slice(point)}`;
}
