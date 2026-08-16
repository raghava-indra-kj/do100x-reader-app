import { useEffect, useState } from "react";
import { Maximize2, AlertCircle } from "lucide-react";
import { getD2Instance } from "./d2-instance";
import { D2FullscreenModal } from "./d2-fullscreen-modal";
import { useMdViewColors } from "../../context/md-view-context";

export interface D2DiagramProps {
  source: string;
  layout?: "dagre" | "elk";
  themeID?: number;
  darkThemeID?: number;
  dark?: boolean;
  pad?: number;
  sketch?: boolean;
  scale?: number;
  className?: string;
  allowFullscreen?: boolean;
}

/**
 * Standalone D2 diagram component for rendering D2 markup anywhere in React applications.
 */
export function D2Diagram({
  source,
  layout = "elk",
  themeID = 0,
  darkThemeID,
  dark,
  pad = 40,
  sketch = false,
  scale,
  className = "",
  allowFullscreen = true,
}: D2DiagramProps) {
  const [svg, setSvg] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const colors = useMdViewColors();

  useEffect(() => {
    let cancelled = false;

    const render = async () => {
      const trimmed = source.trim();
      if (!trimmed) {
        setSvg("");
        setError(null);
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const d2 = await getD2Instance();
        if (cancelled) return;

        const resolvedDark = dark ?? (typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches);
        const resolvedDarkThemeID = darkThemeID !== undefined ? darkThemeID : (resolvedDark ? 200 : undefined);

        const result = await d2.compile({
          fs: { index: trimmed },
          options: {
            layout,
            themeID,
            darkThemeID: resolvedDarkThemeID,
            noXMLTag: true,
            pad,
            sketch,
            scale,
          },
        });

        if (cancelled) return;

        const renderedSvg = await d2.render(result.diagram, result.renderOptions);

        if (!cancelled) {
          setSvg(renderedSvg);
        }
      } catch (err) {
        if (!cancelled) {
          const msg = err instanceof Error ? err.message : String(err);
          setError(msg || "Failed to render D2 diagram");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    render();

    return () => {
      cancelled = true;
    };
  }, [source, layout, themeID, darkThemeID, dark, pad, sketch, scale]);

  return (
    <div className={`md-d2-wrapper ${className}`}>
      {loading && <div className="md-d2 md-d2--loading" />}

      {error && (
        <div className="md-d2-error-wrapper">
          <div className="md-d2-error-header">
            <AlertCircle size={15} />
            <span>Invalid D2 diagram</span>
          </div>
          <pre className="md-d2-error-msg">{error}</pre>
        </div>
      )}

      {!loading && !error && svg && (
        <>
          {allowFullscreen && (
            <button
              type="button"
              className="md-d2-fullscreen-btn"
              onClick={() => setIsFullscreen(true)}
              title="View diagram in full screen"
              aria-label="View D2 diagram in full screen"
            >
              <Maximize2 size={14} />
              <span>Full screen</span>
            </button>
          )}

          <div
            className="md-d2"
            onDoubleClick={allowFullscreen ? () => setIsFullscreen(true) : undefined}
            dangerouslySetInnerHTML={{ __html: svg }}
          />

          {isFullscreen && (
            <D2FullscreenModal
              svg={svg}
              colors={colors}
              onClose={() => setIsFullscreen(false)}
            />
          )}
        </>
      )}
    </div>
  );
}
