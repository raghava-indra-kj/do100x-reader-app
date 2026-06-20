import type { NodeProps } from "../../types/node-props";
import { CodeInline } from "../inline/code-inline";
import { CodeBlock } from "./code-block";
import { MermaidBlock } from "./mermaid-block";
import { useInsidePre } from "./inside-pre-context";

/** Regex to extract the language name from a language-* class. */
const LANGUAGE_RE = /language-([\w-]+)/;

/** Routes code elements to MermaidBlock, CodeBlock, or CodeInline based on whether it is inside a pre element. */
export function CodeRouter({ className, children }: NodeProps) {
  const insidePre = useInsidePre();

  if (!insidePre) return <CodeInline>{children}</CodeInline>;

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
