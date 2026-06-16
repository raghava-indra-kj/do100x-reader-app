import type { CSSProperties } from "react";
import type { MdViewColors, MdViewFontSizes, MdViewFonts } from "../types/theme";

/** Converts theme props into CSS custom properties. */
export function propsToCssVars(
    colors: MdViewColors,
    fontSizes: MdViewFontSizes,
    fonts: MdViewFonts
): CSSProperties {
    const vars: Record<string, string> = {};

    for (const [key, value] of Object.entries(colors)) {
        vars[`--md-color-${key}`] = value;
    }

    for (const [key, value] of Object.entries(fontSizes)) {
        vars[`--md-font-size-${key}`] = `${value}rem`;
    }

    vars["--md-font-family-heading"] = fonts.heading;
    vars["--md-font-family-prose"] = fonts.prose;
    vars["--md-font-family-code"] = fonts.code;

    return vars as CSSProperties;
}
