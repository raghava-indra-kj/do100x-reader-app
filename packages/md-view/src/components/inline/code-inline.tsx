import type { NodeProps } from "../../types/node-props";

/** Inline code element. */
export function CodeInline({ node, children }: NodeProps) {
  return <code className="md-code-inline" data-md-text-map={node?.properties.dataMdTextMap}>{children}</code>;
}
