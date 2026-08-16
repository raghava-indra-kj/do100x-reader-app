import { useState } from "react";
import { MarkdownRenderer, D2Diagram } from "@reader/md-view";
import type { LinkClickEvent } from "@reader/md-view";
import { defaultColors, defaultFontSizes, defaultFonts } from "@lib/md-parser/default-theme";
import testFile from "@lib/md-parser/test-file.md?raw";
import "@reader/md-view/md-view.css";
import "@reader/md-view/md-view-hljs.css";

const INITIAL_D2_SOURCE = `direction: right

client: Web Client {
  shape: person
}

gateway: API Gateway {
  auth: Auth Guard
  router: Router
}

services: Backend Services {
  reader: Reader Service
  ai: AI Lookup Service
}

db: Storage {
  shape: cylinder
}

client -> gateway.auth: HTTPS Request
gateway.auth -> gateway.router: Authorized
gateway.router -> services.reader: Internal RPC
gateway.router -> services.ai: LLM Queries
services.reader -> db: Read/Write
`;

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
    const [d2Source, setD2Source] = useState<string>(INITIAL_D2_SOURCE);
    const [d2Layout, setD2Layout] = useState<"elk" | "dagre">("elk");

    function handleLinkClick(e: LinkClickEvent) {
        if (e.type === "relative" || e.type === "anchor") {
            e.originalEvent.preventDefault();
        }
        setEvents((prev) => [e, ...prev]);
    }

    return (
        <div className="flex gap-6 mx-auto max-w-5xl px-8 py-10">
            <div className="flex-1 min-w-0 space-y-12">

                {/* D2 Interactive Diagram Demo */}
                <section className="p-6 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50">
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <h2 className="text-xl font-bold tracking-tight">D2 Architecture Playground</h2>
                            <p className="text-xs text-gray-500 mt-1">Browser-compiled WebAssembly D2 diagram renderer with ELK & Dagre layout</p>
                        </div>
                        <div className="flex items-center gap-2">
                            <label className="text-xs font-semibold text-gray-600 dark:text-gray-400">Layout:</label>
                            <select
                                value={d2Layout}
                                onChange={(e) => setD2Layout(e.target.value as "elk" | "dagre")}
                                className="text-xs px-2 py-1 rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800"
                            >
                                <option value="elk">ELK (Architecture)</option>
                                <option value="dagre">Dagre (Directed Graph)</option>
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        <textarea
                            value={d2Source}
                            onChange={(e) => setD2Source(e.target.value)}
                            rows={12}
                            spellCheck={false}
                            className="w-full font-mono text-xs p-3 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 resize-y focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Enter D2 code..."
                        />
                        <div className="p-2 rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 min-h-[260px] flex items-center justify-center">
                            <D2Diagram source={d2Source} layout={d2Layout} />
                        </div>
                    </div>
                </section>

                <hr className="border-gray-200" />


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
