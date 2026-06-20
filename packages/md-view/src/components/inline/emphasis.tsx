import type { NodeProps } from "../../types/node-props";

/** Italic text element. */
export function Emphasis({ children }: NodeProps) {
  return <em className="md-emphasis">{children}</em>;
}
