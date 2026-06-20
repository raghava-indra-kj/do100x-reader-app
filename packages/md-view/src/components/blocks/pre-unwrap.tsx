import type { ReactNode } from "react";
import { InsidePreContext } from "../code/inside-pre-context";

/** Strips the outer <pre> wrapper and signals to child code elements that they are inside a fenced block. */
export function PreUnwrap({ children }: { children?: ReactNode }) {
  return (
    <InsidePreContext.Provider value={true}>
      {children}
    </InsidePreContext.Provider>
  );
}
