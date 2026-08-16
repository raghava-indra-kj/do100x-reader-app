import type { D2 } from "@d2lang/d2";

let d2InstancePromise: Promise<D2> | null = null;

/**
 * Returns a shared, lazily initialized instance of the D2 compiler and renderer.
 * The WebAssembly module and JS wrapper are loaded on-demand on the first call.
 */
export function getD2Instance(): Promise<D2> {
  if (!d2InstancePromise) {
    d2InstancePromise = import("@d2lang/d2").then((mod) => new mod.D2());
  }
  return d2InstancePromise;
}
