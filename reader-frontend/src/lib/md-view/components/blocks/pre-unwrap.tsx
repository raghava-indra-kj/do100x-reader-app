import type { ReactNode } from "react";

/** Strips the outer <pre> wrapper so CodeBlock owns its own <pre>. */
export function PreUnwrap({ children }: { children?: ReactNode }) {
  return <>{children}</>;
}
