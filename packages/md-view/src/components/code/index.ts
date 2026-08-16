import type { Components } from "react-markdown";
import { CodeBlock } from "./code-block";
import { CodeRouter } from "./code-router";
import { MermaidBlock } from "./mermaid-block";
import { MermaidFullscreenModal } from "./mermaid-fullscreen-modal";
import { D2Block } from "./d2-block";
import { D2Diagram } from "./d2-diagram";
import { D2FullscreenModal } from "./d2-fullscreen-modal";
import { getD2Instance } from "./d2-instance";

export {
  CodeBlock,
  CodeRouter,
  MermaidBlock,
  MermaidFullscreenModal,
  D2Block,
  D2Diagram,
  D2FullscreenModal,
  getD2Instance,
};

/** Code tag to component map for react-markdown. */
export const codeComponents: Components = {
  code: CodeRouter,
};
