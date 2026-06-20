import type { Components } from "react-markdown";
import { CodeBlock } from "./code-block";
import { CodeRouter } from "./code-router";

export { CodeBlock, CodeRouter };

/** Code tag to component map for react-markdown. */
export const codeComponents: Components = {
  code: CodeRouter,
};
