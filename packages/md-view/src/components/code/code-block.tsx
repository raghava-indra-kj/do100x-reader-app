import { Check, Copy } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";

/** Props for the fenced code block component. */
interface CodeBlockProps {
  language?: string;
  codeClassName?: string;
  children?: ReactNode;
}

/** Fenced code block with syntax highlighting and a source-copy control. */
export function CodeBlock({ language, codeClassName, children }: CodeBlockProps) {
  const codeRef = useRef<HTMLElement>(null);
  const resetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">("idle");

  useEffect(() => () => {
    if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
  }, []);

  const resetFeedback = () => {
    if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
    resetTimerRef.current = setTimeout(() => setCopyState("idle"), 1800);
  };

  const copyCode = async () => {
    const source = codeRef.current?.textContent ?? "";
    if (!source) return;

    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(source);
      } else {
        const fallback = document.createElement("textarea");
        fallback.value = source;
        fallback.setAttribute("readonly", "");
        fallback.style.position = "fixed";
        fallback.style.opacity = "0";
        document.body.append(fallback);
        fallback.select();
        const copied = document.execCommand("copy");
        fallback.remove();
        if (!copied) throw new Error("Clipboard copy was rejected");
      }
      setCopyState("copied");
    } catch {
      setCopyState("failed");
    }
    resetFeedback();
  };

  const copyLabel = copyState === "copied"
    ? "Code copied"
    : copyState === "failed"
      ? "Could not copy code. Try again."
      : "Copy code";

  return (
    <pre className="md-code-block">
      <button
        type="button"
        className="md-code-block-copy"
        onClick={copyCode}
        title={copyLabel}
        aria-label={copyLabel}
      >
        {copyState === "copied" ? <Check size={14} aria-hidden="true" /> : <Copy size={14} aria-hidden="true" />}
      </button>
      <code
        ref={codeRef}
        data-language={language}
        className={`md-code-block-content ${codeClassName ?? ""}`.trim()}
      >
        {children}
      </code>
    </pre>
  );
}
