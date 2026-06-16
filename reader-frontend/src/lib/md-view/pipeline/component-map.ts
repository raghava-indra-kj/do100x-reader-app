import type { Components } from "react-markdown";
import { mdComponents } from "../components";

/** Merges consumer component overrides over the built-in map. */
export function buildComponentMap(overrides?: Partial<Components>): Components {
  if (!overrides) return mdComponents;
  return { ...mdComponents, ...overrides } as Components;
}
