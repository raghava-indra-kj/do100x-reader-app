import type { MdViewColors, MdViewFontSizes, MdViewFonts } from "@lib/md-view";

/** Default light colors for demo and testing */
export const defaultColors: MdViewColors = {
    h1: "#1c1a17",
    h2: "#1c1a17",
    h3: "#2a2723",
    h4: "#2a2723",
    h5: "#3c3833",
    h6: "#3c3833",
    body: "#3c3833",
    muted: "#6b655b",
    link: "#d8431a",
    linkHover: "#b33414",
    codeInlineBg: "#f4ecdf",
    codeInlineText: "#3c3833",
    codeBlockBg: "#16263f",
    codeBlockText: "#d7dee9",
    calloutBg: "#fef3ed",
    calloutText: "#3c3833",
    surfaceBg: "#faf6ef",
    border: "#d5cfc4",
    borderStrong: "#b4ada1",
    marker: "#d8431a",
    scrollbarThumb: "#ddcfb6",
    scrollbarTrack: "#f4ecdf",
    tableHeaderText: "#1c1a17",
    errorColor: "#c6453f",
};

/** Default base font sizes for demo and testing */
export const defaultFontSizes: MdViewFontSizes = {
    paragraph: 1,
    h1: 2,
    h2: 1.625,
    h3: 1.375,
    h4: 1.125,
    h5: 1,
    h6: 1,
    code: 0.875,
    equation: 1.125,
    blockquote: 1.125,
    callout: 1,
    listItem: 1,
    table: 0.875,
};

/** Default system font stack for demo and testing */
export const defaultFonts: MdViewFonts = {
    heading: "system-ui, sans-serif",
    prose: "system-ui, sans-serif",
    code: "'JetBrains Mono', 'Fira Code', monospace",
};
