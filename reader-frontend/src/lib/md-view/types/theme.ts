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
