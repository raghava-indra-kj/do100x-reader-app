/** Colors for the markdown view. */
export type MdViewColors = {
    h1: string;
    h2: string;
    h3: string;
    h4: string;
    h5: string;
    h6: string;
    body: string;
    muted: string;
    link: string;
    linkHover: string;
    codeInlineBg: string;
    codeInlineText: string;
    codeBlockBg: string;
    codeBlockText: string;
    calloutBg: string;
    calloutText: string;
    surfaceBg: string;
    border: string;
    borderStrong: string;
    marker: string;
    scrollbarThumb: string;
    scrollbarTrack: string;
    tableHeaderText: string;
    tableRowBg: string;
    errorColor: string;
};

/** Font sizes for the markdown view. */
export type MdViewFontSizes = {
    paragraph: number;
    h1: number;
    h2: number;
    h3: number;
    h4: number;
    h5: number;
    h6: number;
    code: number;
    equation: number;
    blockquote: number;
    callout: number;
    listItem: number;
    table: number;
};

/** Font families for the markdown view. */
export type MdViewFonts = {
    heading: string;
    prose: string;
    code: string;
};

/** Accent colors for mermaid diagrams. Controls node fills and cScale slots. */
export type MdViewMermaidTheme = {
    primaryColor: string;
    primaryTextColor: string;
    secondaryColor: string;
    secondaryTextColor: string;
    tertiaryColor: string;
    tertiaryTextColor: string;
    cScale0: string;
    cScale1: string;
    cScale2: string;
    cScale3: string;
    cScale4: string;
    cScale5: string;
};

/** Default mermaid accent palette. */
export const defaultMermaidTheme: MdViewMermaidTheme = {
    primaryColor:       "#4F6BED",
    primaryTextColor:   "#ffffff",
    secondaryColor:     "#2EAA74",
    secondaryTextColor: "#ffffff",
    tertiaryColor:      "#E07B3A",
    tertiaryTextColor:  "#ffffff",
    cScale0: "#4F6BED",
    cScale1: "#2EAA74",
    cScale2: "#E07B3A",
    cScale3: "#9B5DE5",
    cScale4: "#E84855",
    cScale5: "#00B4D8",
};
