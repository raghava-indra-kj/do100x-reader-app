import { MarkdownActionButton } from '../action-button';
import { useEffect, useRef, useState } from "react";
import { Maximize2, AlertCircle } from "lucide-react";
import { useMdViewColors } from "../../context/md-view-context";
import { getD2Instance } from "./d2-instance";
import { D2FullscreenModal } from "./d2-fullscreen-modal";
import { sanitizeDiagramSvg } from '../../utils/sanitize-svg';
import { isDarkColor } from '../../context/css-appearance';

export interface D2BlockProps {
  children?: unknown;
  layout?: "dagre" | "elk";
  themeID?: number;
  darkThemeID?: number;
  className?: string;
}

/**
 * Renders a D2 diagram source string into an inline SVG using the official WebAssembly engine.
 * Supports auto-theming, ELK/Dagre layout engines, and interactive full-screen modal mode.
 */
export function D2Block({
  children,
  layout = "elk",
  themeID = 0,
  darkThemeID,
  className = "",
}: D2BlockProps) {
  const source = String(children ?? "").trim();
  const colors = useMdViewColors();
  const colorsKey = JSON.stringify(colors);

  const ref = useRef<HTMLDivElement>(null);
  const [svg, setSvg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  useEffect(() => {
    let cancelled = false;
    setSvg(null);
    setError(null);

    if (!source) {
      setError("empty");
      return;
    }

    // Determine dark mode preference from custom theme or system query
    const isDark = (colors ? isDarkColor(colors.surfaceBg) : undefined)
      ?? (typeof window !== "undefined" && window.matchMedia?.("(prefers-color-scheme: dark)").matches);

    const resolvedDarkThemeID = darkThemeID !== undefined ? darkThemeID : (isDark ? 200 : undefined);

    getD2Instance()
      .then(async (d2) => {
        if (cancelled) return;
        const result = await d2.compile({
          fs: { index: source },
          options: {
            layout,
            themeID: isDark ? resolvedDarkThemeID ?? 200 : themeID,
            noXMLTag: true,
            pad: 40,
          },
        });

        if (cancelled) return;
        const renderedSvg = await d2.render(result.diagram, result.renderOptions);

        if (!cancelled) {
          setSvg(sanitizeDiagramSvg(renderedSvg));
        }
      })
      .catch((err) => {
        if (!cancelled) {
          const msg = err instanceof Error ? err.message : String(err);
          setError(msg || "Couldn’t render this D2 diagram.");
        }
      });

    return () => {
      cancelled = true;
    };
  }, [source, layout, themeID, darkThemeID, colorsKey, colors]);

  if (error) {
    if (error === "empty") return null;
    return (
      <div className="md-d2-error-wrapper">
        <div className="md-d2-error-header">
          <AlertCircle size={15} />
          <span>D2 diagram error</span>
        </div>
        <pre className="md-d2-error-msg">{error}</pre>
        <pre className="md-code-block">
          <code>{source}</code>
        </pre>
      </div>
    );
  }

  if (!svg) {
    return <div ref={ref} className={`md-d2 md-d2--loading ${className}`} />;
  }

  return (
    <div className={`md-d2-wrapper ${className}`}>
      <MarkdownActionButton
        type="button"
        className="md-d2-fullscreen-btn"
        onClick={() => setIsFullscreen(true)}
        tooltip="Open diagram fullscreen"
        aria-label="Open D2 diagram fullscreen"
      >
        <Maximize2 size={16} aria-hidden="true" />
      </MarkdownActionButton>

      <div
        ref={ref}
        className="md-d2"
        onDoubleClick={() => setIsFullscreen(true)}
        dangerouslySetInnerHTML={{ __html: svg }}
      />

      {isFullscreen && (
        <D2FullscreenModal
          svg={svg}
          colors={colors}
          onClose={() => setIsFullscreen(false)}
        />
      )}
    </div>
  );
}
