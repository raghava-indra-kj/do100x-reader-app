import type { Components } from "react-markdown";
import { blockComponents, customBlockComponents } from "./blocks";
import { inlineComponents } from "./inline";
import { codeComponents } from "./code";

/** Merged tag-to-component map combining blocks, inline, code, and custom elements. */
export const mdComponents = {
  ...blockComponents,
  ...inlineComponents,
  ...codeComponents,
  ...customBlockComponents,
} as Components;
