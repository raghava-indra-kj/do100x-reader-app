import type { NodeProps } from "../../types/node-props";

/** Inline code element. */
export function CodeInline({ children }: NodeProps) {
  return <code className="md-code-inline">{children}</code>;
}
