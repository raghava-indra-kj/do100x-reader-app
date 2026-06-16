import type { NodeProps } from "../../types/node-props";
import { CodeInline } from "../inline/code-inline";
import { CodeBlock } from "./code-block";
import { MermaidBlock } from "./mermaid-block";

/** Regex to detect language-* class on fenced code blocks. */
const LANGUAGE_RE = /language-([\w-]+)/;

/** Determines if a code node is a block by language class or newline presence. */
function isBlockCode(className: string | undefined, children: unknown): boolean {
  if (className && LANGUAGE_RE.test(className)) return true;
  return typeof children === "string" && children.includes("\n");
}

/** Routes code elements to MermaidBlock, CodeBlock, or CodeInline based on content. */
export function CodeRouter({ className, children }: NodeProps) {
  if (isBlockCode(className, children)) {
    const match = LANGUAGE_RE.exec(className ?? "");
    const language = match?.[1];

    if (language === "mermaid") {
      return <MermaidBlock>{children}</MermaidBlock>;
    }

    return (
      <CodeBlock language={language} codeClassName={className}>
        {children}
      </CodeBlock>
    );
  }
  return <CodeInline>{children}</CodeInline>;
}
