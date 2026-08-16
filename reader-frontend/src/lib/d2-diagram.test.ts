import { describe, it, expect } from "vitest";
import { getD2Instance } from "@reader/md-view";

describe("D2 Diagram in-browser engine", () => {
    it("lazily initializes D2 instance successfully", async () => {
        const d2 = await getD2Instance();
        expect(d2).toBeDefined();
        expect(typeof d2.compile).toBe("function");
        expect(typeof d2.render).toBe("function");
    });

    it("compiles and renders a basic D2 diagram to SVG", async () => {
        const d2 = await getD2Instance();
        const source = "user: User -> service: Backend API";

        const result = await d2.compile({
            fs: { index: source },
            options: {
                layout: "elk",
                noXMLTag: true,
                pad: 20,
            },
        });

        expect(result).toBeDefined();
        expect(result.diagram).toBeDefined();

        const svg = await d2.render(result.diagram, result.renderOptions);
        expect(svg).toBeDefined();
        expect(svg).toContain("<svg");
        expect(svg).toContain("</svg>");
        expect(svg).toContain("User");
        expect(svg).toContain("Backend API");
    });

    it("handles D2 themes and dark mode options", async () => {
        const d2 = await getD2Instance();
        const source = `
direction: right
a: Service A -> b: Service B
`;
        const result = await d2.compile({
            fs: { index: source },
            options: {
                layout: "dagre",
                themeID: 0,
                darkThemeID: 200,
                noXMLTag: true,
            },
        });

        const svg = await d2.render(result.diagram, result.renderOptions);
        expect(svg).toContain("<svg");
    });
});
