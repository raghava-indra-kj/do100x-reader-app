import type { ReactNode } from "react";

/** Props for the fenced code block component. */
interface CodeBlockProps {
  language?: string;
  codeClassName?: string;
  children?: ReactNode;
}

/** Fenced code block with syntax highlighting support. */
export function CodeBlock({ language, codeClassName, children }: CodeBlockProps) {
  return (
    <pre className="md-code-block">
      <code
        data-language={language}
        className={`md-code-block-content ${codeClassName ?? ""}`.trim()}
      >
        {children}
      </code>
    </pre>
  );
}
