import { safeParseMarkdown } from "@reader/md-ast";
import type { MdAstDocument, ParseResult } from "@reader/md-ast";

export interface ContentParseResult {
  /** The parsed AST document, or null if parsing failed. */
  content: MdAstDocument | null;
  /** The full parse result for returning to the client. */
  parseResult: ParseResult;
}

/**
 * Wraps safeParseMarkdown from @reader/md-ast.
 * Returns the AST as `content` (stored in DB) and the full `parseResult`
 * (returned to the client so they know if parsing succeeded).
 */
export function parseContent(rawMarkdown: string): ContentParseResult {
  const parseResult = safeParseMarkdown({ source: rawMarkdown });

  return {
    content: parseResult.ok ? parseResult.data : null,
    parseResult,
  };
}
