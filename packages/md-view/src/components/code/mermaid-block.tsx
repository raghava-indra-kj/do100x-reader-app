import { useEffect, useRef, useState } from "react";
import type { MermaidConfig } from "mermaid";
import { useMdViewColors, useMdViewMermaidTheme } from "../../context/md-view-context";
import type { MdViewColors, MdViewMermaidTheme } from "../../types/theme";

type MermaidModule = typeof import("mermaid").default;

let mermaidModule: Promise<MermaidModule> | null = null;
function loadMermaidModule(): Promise<MermaidModule> {
  if (!mermaidModule) {
    mermaidModule = import("mermaid").then((mod) => mod.default);
  }
  return mermaidModule;
}

/** Builds the mermaid config, blending theme-derived structure colors with the accent palette. */
function buildMermaidConfig({ colors, mermaidTheme }: { colors: MdViewColors | null; mermaidTheme: MdViewMermaidTheme }): MermaidConfig {
  const base: MermaidConfig = { startOnLoad: false, securityLevel: "strict" };

  if (!colors) {
    const isDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    return { ...base, theme: isDark ? "dark" : "default" };
  }

  return {
    ...base,
    theme: "base",
    themeVariables: {
      background: colors.codeBlockBg,
      primaryColor: mermaidTheme.primaryColor,
      primaryTextColor: mermaidTheme.primaryTextColor,
      primaryBorderColor: colors.borderStrong,
      lineColor: colors.body,
      secondaryColor: mermaidTheme.secondaryColor,
      secondaryTextColor: mermaidTheme.secondaryTextColor,
      tertiaryColor: mermaidTheme.tertiaryColor,
      tertiaryTextColor: mermaidTheme.tertiaryTextColor,
      edgeLabelBackground: colors.codeBlockBg,
      titleColor: colors.h1,
      cScale0: mermaidTheme.cScale0,
      cScale1: mermaidTheme.cScale1,
      cScale2: mermaidTheme.cScale2,
      cScale3: mermaidTheme.cScale3,
      cScale4: mermaidTheme.cScale4,
      cScale5: mermaidTheme.cScale5,

      clusterBkg: colors.surfaceBg,
      clusterBorder: colors.border,

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
  const mermaidTheme = useMdViewMermaidTheme();
  const colorsKey = JSON.stringify(colors);
  const mermaidThemeKey = JSON.stringify(mermaidTheme);

  const ref = useRef<HTMLDivElement>(null);
  const [svg, setSvg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setSvg(null);
    setError(null);

    if (!source) {
      setError("empty");
      return;
    }

    const id = `mermaid-${Math.random().toString(36).slice(2, 9)}`;

    loadMermaidModule()
      .then(async (m) => {
        if (cancelled) return undefined;
        m.initialize(buildMermaidConfig({ colors, mermaidTheme }));
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
    // colorsKey/mermaidThemeKey are stable serialized deps; object refs change every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [source, colorsKey, mermaidThemeKey]);

  if (error) {
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
