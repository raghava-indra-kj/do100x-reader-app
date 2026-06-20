import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkFrontmatter from "remark-frontmatter";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";

/**
 * Shared remark processor for parsing markdown into an mdast tree.
 * Plugin set mirrors md-view/pipeline/remark-plugins.ts so block boundaries match the renderer.
 */
export const processor = unified().use(remarkParse).use(remarkFrontmatter).use(remarkGfm).use(remarkMath);
