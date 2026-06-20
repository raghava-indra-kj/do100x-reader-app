import { safeParseMarkdown } from "@reader/md-ast";
import type { ParseResult } from "@reader/md-ast";

// Parses raw markdown into a ParseResult; callers decide what to persist.
export const parseContent = (rawMarkdown: string): ParseResult =>
  safeParseMarkdown({ source: rawMarkdown });
