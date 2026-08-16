import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Network, ZoomIn, ZoomOut, Maximize, X } from "lucide-react";
import type { MdViewColors } from "../../types/theme";

export interface MermaidFullscreenModalProps {
  svg: string;
  colors: MdViewColors | null;
  onClose: () => void;
}

const MIN_SCALE = 0.02;
const MAX_SCALE = 30;
const MAX_FIT_SCALE = 5;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

interface Viewport {
  scale: number;
  pan: { x: number; y: number };
}

export function MermaidFullscreenModal({ svg, colors, onClose }: MermaidFullscreenModalProps) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  const [viewport, setViewport] = useState<Viewport>({ scale: 1, pan: { x: 0, y: 0 } });
  const viewportRef = useRef(viewport);
  viewportRef.current = viewport;
  const svgSizeRef = useRef<{ width: number; height: number }>({ width: 800, height: 600 });
  const [isDragging, setIsDragging] = useState<boolean>(false);

  const dragStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const panStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Zoom around an anchor point in canvas coordinates, keeping the anchor stationary.
  const zoomAt = useCallback((anchorX: number, anchorY: number, factor: number) => {
    const prev = viewportRef.current;
    const nextScale = clamp(prev.scale * factor, MIN_SCALE, MAX_SCALE);
    if (nextScale === prev.scale) return;
    const ratio = nextScale / prev.scale;
    setViewport({
      scale: nextScale,
      pan: {
        x: anchorX - (anchorX - prev.pan.x) * ratio,
        y: anchorY - (anchorY - prev.pan.y) * ratio,
      },
    });
  }, []);

  // Auto-fit diagram to modal canvas based on intrinsic vector viewBox/bbox
  const fitToScreen = useCallback(() => {
    const canvas = canvasRef.current;
    const content = contentRef.current;
    if (!canvas || !content) return;
    const canvasRect = canvas.getBoundingClientRect();
    const svgEl = content.querySelector("svg");
    if (!svgEl) return;

    let w = 800;
    let h = 600;

    const viewBox = svgEl.viewBox?.baseVal;
    if (viewBox && viewBox.width > 0 && viewBox.height > 0) {
      w = viewBox.width;
      h = viewBox.height;
    } else if (svgEl.getBBox) {
      try {
        const bbox = svgEl.getBBox();
        if (bbox.width > 0 && bbox.height > 0) {
          w = bbox.width;
          h = bbox.height;
        }
      } catch {
        const rect = svgEl.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          w = rect.width;
          h = rect.height;
        }
      }
    }

    if (!svgEl.getAttribute("viewBox")) {
      svgEl.setAttribute("viewBox", `0 0 ${w} ${h}`);
    }

    svgSizeRef.current = { width: w, height: h };

    const padding = 40;
    const availW = Math.max(100, canvasRect.width - padding * 2);
    const availH = Math.max(100, canvasRect.height - padding * 2);

    const fitScale = clamp(Math.min(availW / w, availH / h), 0.05, MAX_FIT_SCALE);

    setViewport({
      scale: fitScale,
      pan: {
        x: (canvasRect.width - w * fitScale) / 2,
        y: (canvasRect.height - h * fitScale) / 2,
      },
    });
  }, []);

  // Ensure SVG element inside container expands crisp at 100% of parent bounds
  useLayoutEffect(() => {
    const svgEl = contentRef.current?.querySelector("svg");
    if (!svgEl) return;
    svgEl.setAttribute("width", "100%");
    svgEl.setAttribute("height", "100%");
    svgEl.style.width = "100%";
    svgEl.style.height = "100%";
    svgEl.style.maxWidth = "none";
    svgEl.style.maxHeight = "none";
  }, [svg]);

  // Lock body scroll and perform initial fit on mount ONLY
  useLayoutEffect(() => {
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const raf = requestAnimationFrame(() => fitToScreen());

    return () => {
      document.body.style.overflow = originalOverflow;
      cancelAnimationFrame(raf);
    };
  }, [fitToScreen]);

  // Handle cursor-centered wheel zoom
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = canvas.getBoundingClientRect();
      zoomAt(e.clientX - rect.left, e.clientY - rect.top, e.deltaY < 0 ? 1.12 : 0.89);
    };

    canvas.addEventListener("wheel", handleWheel, { passive: false });
    return () => {
      canvas.removeEventListener("wheel", handleWheel);
    };
  }, [zoomAt]);

  // Zoom center relative to viewport center (for toolbar +/- buttons)
  const zoomByFactor = useCallback(
    (factor: number) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      zoomAt(rect.width / 2, rect.height / 2, factor);
    },
    [zoomAt]
  );

  // Pointer events for dragging / panning
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    if ((e.target as HTMLElement).closest(".md-mermaid-fullscreen-header")) return;
    e.preventDefault();

    setIsDragging(true);
    dragStartRef.current = { x: e.clientX, y: e.clientY };
    panStartRef.current = { ...viewportRef.current.pan };

    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    e.preventDefault();

    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;

    setViewport((v) => ({
      ...v,
      pan: { x: panStartRef.current.x + dx, y: panStartRef.current.y + dy },
    }));
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isDragging) {
      setIsDragging(false);
      try {
        (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
      } catch {
        // ignore
      }
    }
  };

  // Double click resets zoom and position
  const handleDoubleClick = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest(".md-mermaid-fullscreen-header")) return;
    fitToScreen();
  };

  // Keyboard navigation & shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      } else if (e.key === "+" || e.key === "=") {
        e.preventDefault();
        zoomByFactor(1.25);
      } else if (e.key === "-" || e.key === "_") {
        e.preventDefault();
        zoomByFactor(0.8);
      } else if (e.key === "0") {
        e.preventDefault();
        fitToScreen();
      } else if (e.key === "ArrowLeft") {
        setViewport((v) => ({ ...v, pan: { ...v.pan, x: v.pan.x + 60 } }));
      } else if (e.key === "ArrowRight") {
        setViewport((v) => ({ ...v, pan: { ...v.pan, x: v.pan.x - 60 } }));
      } else if (e.key === "ArrowUp") {
        setViewport((v) => ({ ...v, pan: { ...v.pan, y: v.pan.y + 60 } }));
      } else if (e.key === "ArrowDown") {
        setViewport((v) => ({ ...v, pan: { ...v.pan, y: v.pan.y - 60 } }));
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose, zoomByFactor, fitToScreen]);

  const bgStyle = colors
    ? { backgroundColor: colors.surfaceBg, color: colors.body }
    : { backgroundColor: "var(--md-color-surfaceBg, #090d16)", color: "var(--md-color-body, #f1f5f9)" };

  const zoomPercent = Math.round(viewport.scale * 100);
  const scaledWidth = svgSizeRef.current.width * viewport.scale;
  const scaledHeight = svgSizeRef.current.height * viewport.scale;

  return createPortal(
    <div className="md-mermaid-fullscreen-modal" style={bgStyle}>
      {/* Header Toolbar */}
      <header className="md-mermaid-fullscreen-header">
        <div className="md-mermaid-fullscreen-title">
          <Network className="md-mermaid-icon" size={18} />
          <span>Mind Map Fullscreen</span>
        </div>

        <div className="md-mermaid-fullscreen-controls">
          <button
            type="button"
            className="md-mermaid-control-btn"
            onClick={() => zoomByFactor(0.8)}
            title="Zoom Out (-)"
            aria-label="Zoom Out"
          >
            <ZoomOut size={16} />
          </button>

          <span className="md-mermaid-zoom-badge" title="Current Zoom">{zoomPercent}%</span>

          <button
            type="button"
            className="md-mermaid-control-btn"
            onClick={() => zoomByFactor(1.25)}
            title="Zoom In (+)"
            aria-label="Zoom In"
          >
            <ZoomIn size={16} />
          </button>

          <button
            type="button"
            className="md-mermaid-control-btn"
            onClick={fitToScreen}
            title="Fit to Screen (0)"
            aria-label="Fit to Screen"
          >
            <Maximize size={16} />
            <span className="md-mermaid-control-label">Fit</span>
          </button>

          <div className="md-mermaid-control-divider" />

          <button
            type="button"
            className="md-mermaid-control-btn md-mermaid-close-btn"
            onClick={onClose}
            title="Close Fullscreen (Esc)"
            aria-label="Close Fullscreen"
          >
            <X size={16} />
          </button>
        </div>
      </header>

      {/* Interactive 2D Vector Canvas */}
      <div
        ref={canvasRef}
        className={`md-mermaid-fullscreen-canvas ${isDragging ? "md-mermaid-canvas--dragging" : ""}`}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onDoubleClick={handleDoubleClick}
      >
        <div
          ref={contentRef}
          className="md-mermaid-fullscreen-content"
          style={{
            transform: `translate(${viewport.pan.x}px, ${viewport.pan.y}px)`,
            width: `${scaledWidth}px`,
            height: `${scaledHeight}px`,
          }}
          dangerouslySetInnerHTML={{ __html: svg }}
        />
      </div>

      {/* Floating Info Chip */}
      <div className="md-mermaid-fullscreen-chip">
        <span>Drag canvas to move • Scroll to zoom • Double-click to fit • Press <b>Esc</b> to close</span>
      </div>
    </div>,
    document.body
  );
}