import type { NodeProps } from "../../types/node-props";
import { CodeInline } from "../inline/code-inline";
import { CodeBlock } from "./code-block";
import { MermaidBlock } from "./mermaid-block";
import { D2Block } from "./d2-block";
import { useInsidePre } from "./inside-pre-context";
import { EmbeddedContentBlock } from './embedded-content';

/** Regex to extract the language name from a language-* class. */
const LANGUAGE_RE = /language-([\w-]+)/;

/** Routes code elements to MermaidBlock, D2Block, CodeBlock, or CodeInline based on whether it is inside a pre element. */
export function CodeRouter({ node, className, children }: NodeProps) {
  const insidePre = useInsidePre();

  if (!insidePre) return <CodeInline node={node}>{children}</CodeInline>;

  const match = LANGUAGE_RE.exec(className ?? "");
  const language = match?.[1];

  if (language === 'reader-component') return <EmbeddedContentBlock source={String(children ?? '')} />;

  if (language === "mermaid") {
    return <MermaidBlock>{children}</MermaidBlock>;
  }

  if (language === "d2" || language === "d2lang") {
    return <D2Block>{children}</D2Block>;
  }

  return (
    <CodeBlock language={language} codeClassName={className} sourceMap={node?.properties.dataMdTextMap as string | undefined}>
      {children}
    </CodeBlock>
  );
}
