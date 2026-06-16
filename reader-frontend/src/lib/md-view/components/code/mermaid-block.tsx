import { useEffect, useRef, useState } from "react";
import type { MermaidConfig } from "mermaid";
import { useMdViewColors } from "../../context/md-view-context";
import type { MdViewColors } from "../../types/theme";

type MermaidModule = typeof import("mermaid").default;

// Load the mermaid module once; initialization happens per-render with live colors.
let mermaidModule: Promise<MermaidModule> | null = null;
function loadMermaidModule(): Promise<MermaidModule> {
  if (!mermaidModule) {
    mermaidModule = import("mermaid").then((mod) => mod.default);
  }
  return mermaidModule;
}

/** Maps MdViewColors to mermaid base themeVariables so diagrams match the active palette. */
function buildMermaidConfig(colors: MdViewColors | null): MermaidConfig {
  const base: MermaidConfig = { startOnLoad: false, securityLevel: "strict" };

  if (!colors) {
    const isDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    return { ...base, theme: isDark ? "dark" : "default" };
  }

  return {
    ...base,
    theme: "base",
    themeVariables: {
      // shared
      background: colors.codeBlockBg,
      primaryColor: colors.surfaceBg,
      primaryTextColor: colors.body,
      primaryBorderColor: colors.borderStrong,
      lineColor: colors.body,
      secondaryColor: colors.surfaceBg,
      tertiaryColor: colors.surfaceBg,
      edgeLabelBackground: colors.codeBlockBg,
      titleColor: colors.h1,

      // flowchart
      clusterBkg: colors.surfaceBg,
      clusterBorder: colors.border,

      // sequence diagram
      actorBkg: colors.surfaceBg,
      actorBorder: colors.borderStrong,
      actorTextColor: colors.body,
      signalColor: colors.body,
      signalTextColor: colors.body,
      labelBoxBkgColor: colors.surfaceBg,
      labelBoxBorderColor: colors.border,
      labelTextColor: colors.body,
      loopTextColor: colors.body,
      noteBorderColor: colors.border,
      noteBkgColor: colors.codeBlockBg,
      noteTextColor: colors.body,
      activationBorderColor: colors.borderStrong,
      activationBkgColor: colors.surfaceBg,
    },
  };
}

/** Renders a mermaid diagram source string into an inline SVG, themed to match the active MdView palette. */
export function MermaidBlock({ children }: { children?: unknown }) {
  const source = String(children ?? "").trim();
  const colors = useMdViewColors();
  // Serialize colors so the effect re-runs whenever the palette actually changes.
  const colorsKey = JSON.stringify(colors);

  const ref = useRef<HTMLDivElement>(null);
  const [svg, setSvg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setSvg(null);
    setError(null);

    // Empty source — nothing to render.
    if (!source) {
      setError("empty");
      return;
    }

    const id = `mermaid-${Math.random().toString(36).slice(2, 9)}`;

    loadMermaidModule()
      .then(async (m) => {
        if (cancelled) return undefined;
        m.initialize(buildMermaidConfig(colors));

        // Pre-validate before render. mermaid.parse() throws on syntax errors
        // without touching the DOM, so invalid diagrams never reach render()
        // and can't append stray error SVGs to document.body.
        await m.parse(source);

        return m.render(id, source);
      })
      .then((result) => {
        if (!cancelled && result) setSvg(result.svg);
      })
      .catch((err) => {
        if (!cancelled) setError(String((err as Error)?.message ?? err));
      });

    return () => {
      cancelled = true;
    };
    // colorsKey is the stable serialized dep; `colors` object ref changes every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [source, colorsKey]);

  if (error) {
    // Empty source — render nothing rather than an empty code block.
    if (error === "empty") return null;
    return (
      <pre className="md-code-block">
        <code>{source}</code>
      </pre>
    );
  }

  if (!svg) {
    return <div ref={ref} className="md-mermaid md-mermaid--loading" />;
  }

  return (
    <div
      ref={ref}
      className="md-mermaid"
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
