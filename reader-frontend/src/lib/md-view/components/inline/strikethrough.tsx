import type { NodeProps } from "../../types/node-props";

/** Strikethrough text element. */
export function Strikethrough({ children }: NodeProps) {
  return <del className="md-strikethrough">{children}</del>;
}
