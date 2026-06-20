import rehypeRaw from "rehype-raw";
import rehypeHighlight from "rehype-highlight";
import rehypeKatex from "rehype-katex";
import rehypeSanitize from "rehype-sanitize";
import type { PluggableList } from "unified";
import { mdSanitizeSchema } from "./sanitize-schema";
import rehypeUnwrapBlocks from "./rehype-unwrap-blocks";
import { rehypeResolveBaseUrl } from "./rehype-resolve-base-url";

/**
 * Builds the ordered rehype pipeline.
 * When baseUrl is provided, relative URLs in raw HTML src/poster attributes
 * are resolved before sanitization runs.
 */
export function getRehypePlugins(errorColor: string, baseUrl?: string): PluggableList {
  const plugins: PluggableList = [
    rehypeRaw,
    rehypeUnwrapBlocks,
    rehypeHighlight,
    [rehypeKatex, { throwOnError: false, errorColor }],
  ];

  if (baseUrl) {
    plugins.push(rehypeResolveBaseUrl(baseUrl) as never);
  }

  plugins.push([rehypeSanitize, mdSanitizeSchema]);

  return plugins;
}
