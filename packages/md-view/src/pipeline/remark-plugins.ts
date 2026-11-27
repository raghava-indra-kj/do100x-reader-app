import remarkFrontmatter from "remark-frontmatter";
import remarkGfm from "remark-gfm";
import { remarkCurrencyMath } from "@reader/md-ast";
import type { PluggableList } from "unified";
import remarkDisplayMath from "./remark-display-math";

/** Ordered remark pipeline: frontmatter strip → GFM → math → display-math promotion. */
export const REMARK_PLUGINS: PluggableList = [
  remarkFrontmatter,
  remarkGfm,
  remarkCurrencyMath,
  remarkDisplayMath,
];
