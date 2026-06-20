import { createContext, useContext } from "react";

/** True when a code element is rendered inside a pre block (fenced code). */
export const InsidePreContext = createContext(false);

/** Returns true when the current code element is inside a pre (fenced code, not inline). */
export const useInsidePre = () => useContext(InsidePreContext);
