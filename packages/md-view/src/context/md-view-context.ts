import { createContext, useContext } from "react";
import type { MdViewColors } from "../types/theme";
import type { LinkClickEvent } from "../types/link";

/** Shared color palette for all md-view components */
export const MdViewColorContext = createContext<MdViewColors | null>(null);

export function useMdViewColors(): MdViewColors | null {
  return useContext(MdViewColorContext);
}

/** Optional link-click callback shared across all link components */
export const MdViewLinkContext = createContext<((e: LinkClickEvent) => void) | null>(null);

export function useMdViewLinkClick(): ((e: LinkClickEvent) => void) | null {
  return useContext(MdViewLinkContext);
}
