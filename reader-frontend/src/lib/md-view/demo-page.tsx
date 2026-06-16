import { useState } from "react";
import { MarkdownRenderer } from "./markdown-renderer";
import type { LinkClickEvent } from "./types/link";
import { defaultColors, defaultFontSizes, defaultFonts } from "@lib/md-parser/default-theme";
import testFile from "@lib/md-parser/test-file.md?raw";
import "./md-view.css";
import "./md-view-hljs.css";

// All URLs here are relative — they only load when baseUrl is provided.
const BASE_URL = "https://images.unsplash.com/";

const BASE_URL_MARKDOWN = `
## baseUrl demo

All \`src\` values below are relative paths. The renderer resolves them against:

\`\`\`
baseUrl = "${BASE_URL}"
\`\`\`

### Markdown image syntax

![Mountain](photo-1506905925346-21bda4d32df4?w=600&h=300&fit=crop&auto=format&q=80)

### Raw HTML image

<img src="photo-1481627834876-b7833e8f5570?w=600&h=250&fit=crop&auto=format&q=80" alt="Books" />

### Relative link

[Open image](photo-1519389950473-47ba0277781c?w=400&fit=crop)
`;

export default function MdViewDemoPage() {
    const [events, setEvents] = useState<LinkClickEvent[]>([]);

    function handleLinkClick(e: LinkClickEvent) {
        if (e.type === "relative" || e.type === "anchor") {
            e.originalEvent.preventDefault();
        }
        setEvents((prev) => [e, ...prev]);
    }

    return (
        <div className="flex gap-6 mx-auto max-w-5xl px-8 py-10">
            <div className="flex-1 min-w-0 space-y-12">

                {/* baseUrl demo */}
                <section>
                    <MarkdownRenderer
                        markdown={BASE_URL_MARKDOWN}
                        colors={defaultColors}
                        fontSizes={defaultFontSizes}
                        fonts={defaultFonts}
                        baseUrl={BASE_URL}
                    />
                </section>

                <hr className="border-gray-200" />

                {/* Full test-file render with onLinkClick */}
                <section>
                    <MarkdownRenderer
                        markdown={testFile}
                        colors={defaultColors}
                        fontSizes={defaultFontSizes}
                        fonts={defaultFonts}
                        onLinkClick={handleLinkClick}
                    />
                </section>

            </div>

            {events.length > 0 && (
                <aside className="w-56 shrink-0">
                    <div className="sticky top-10">
                        <div className="flex items-center justify-between mb-2">
                            <p className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold">Link events</p>
                            <button onClick={() => setEvents([])} className="text-[10px] text-gray-400 hover:text-gray-600">clear</button>
                        </div>
                        <div className="space-y-1">
                            {events.map((e, i) => (
                                <div key={i} className="text-xs font-mono bg-gray-50 border border-gray-200 rounded px-2 py-1.5">
                                    <span className={`inline-block px-1 rounded text-white text-[9px] font-bold mr-1 ${
                                        e.type === "external" ? "bg-blue-500" :
                                        e.type === "anchor"   ? "bg-purple-500" :
                                        e.type === "email"    ? "bg-green-500" :
                                                               "bg-orange-500"
                                    }`}>{e.type}</span>
                                    <span className="text-gray-600 break-all">{e.href}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </aside>
            )}
        </div>
    );
}
