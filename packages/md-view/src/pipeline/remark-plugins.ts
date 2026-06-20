import remarkFrontmatter from "remark-frontmatter";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import type { PluggableList } from "unified";
import remarkDisplayMath from "./remark-display-math";

/** Ordered remark pipeline: frontmatter strip → GFM → math → display-math promotion. */
export const REMARK_PLUGINS: PluggableList = [
  remarkFrontmatter,
  remarkGfm,
  remarkMath,
  remarkDisplayMath,
];
