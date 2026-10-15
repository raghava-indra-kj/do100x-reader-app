import rehypeRaw from "rehype-raw";
import rehypeHighlight from "rehype-highlight";
import rehypeKatex from "rehype-katex";
import rehypeSanitize from "rehype-sanitize";
import type { PluggableList } from "unified";
import { mdSanitizeSchema, rawMarkdownSchema } from "./sanitize-schema";
import rehypeUnwrapBlocks from "./rehype-unwrap-blocks";
import { rehypeResolveBaseUrl } from "./rehype-resolve-base-url";
import { sourceBlocks } from './source-blocks';
import { sourceText, sourceTextPositions, repairTextPositions } from './source-text';
import { rehypeMathSourceFallback } from './rehype-math-source-fallback';
import type { MarkdownDocument, SourceRange } from '@reader/md-ast';

// Unified merges options for repeated plugin identities. A distinct wrapper is
// required so the final KaTeX-aware sanitizer cannot loosen the raw HTML pass.
function sanitizeRawMarkdown() { return rehypeSanitize(rawMarkdownSchema); }

/**
 * Builds the ordered rehype pipeline.
 * When baseUrl is provided, relative URLs in raw HTML src/poster attributes
 * are resolved before sanitization runs.
 */
export function getRehypePlugins(errorColor: string, baseUrl?: string, source?: { document: MarkdownDocument; range?: SourceRange }): PluggableList {
  const plugins: PluggableList = [
    ...(source ? [sourceTextPositions] : []),
    rehypeRaw,
    ...(source ? [repairTextPositions] : []),
    rehypeUnwrapBlocks,
    sanitizeRawMarkdown,
  ];

  if (source) plugins.push([sourceBlocks, source], [sourceText, source]);
  plugins.push(rehypeMathSourceFallback, rehypeHighlight, [rehypeKatex, { throwOnError: false, errorColor, trust: false, maxExpand: 1000, maxSize: 20, output: 'htmlAndMathml' }]);

  if (baseUrl) {
    plugins.push(rehypeResolveBaseUrl(baseUrl) as never);
  }

  plugins.push([rehypeSanitize, mdSanitizeSchema]);

  return plugins;
}
