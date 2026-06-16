import type { NodeProps } from "../../types/node-props";

/** Blockquote with left border styling. */
export function Blockquote({ children }: NodeProps) {
  return <blockquote className="md-blockquote">{children}</blockquote>;
}
