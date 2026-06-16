import type { MdViewColors } from '@lib/md-view';

export class PageColorSchema {
    public readonly id: string;
    public readonly label: string;
    public readonly value: MdViewColors;

    private constructor(id: string, label: string, value: MdViewColors) {
        this.id = id;
        this.label = label;
        this.value = value;
    }

    public static readonly LIGHT = new PageColorSchema('light', 'Light', {
        h1: '#1c1a17',
        h2: '#1c1a17',
        h3: '#2a2723',
        h4: '#2a2723',
        h5: '#3c3833',
        h6: '#3c3833',
        body: '#3c3833',
        muted: '#6b655b',
        link: '#d8431a',
        linkHover: '#b33414',
        codeInlineBg: '#ece1cf',
        codeInlineText: '#2a2723',
        codeBlockBg: '#1c1a17',
        codeBlockText: '#faf6ef',
        calloutBg: '#f4ecdf',
        calloutText: '#3c3833',
        surfaceBg: '#faf6ef',
        border: '#d5cfc4',
        borderStrong: '#b4ada1',
        marker: '#f15a29',
        scrollbarThumb: '#ddcfb6',
        scrollbarTrack: '#f4ecdf',
        tableHeaderText: '#1c1a17',
        tableRowBg: '#ffffff',
        errorColor: '#c6453f',
    });

    public static readonly DARK = new PageColorSchema('dark', 'Dark', {
        h1: '#fdfbf7',
        h2: '#fdfbf7',
        h3: '#faf6ef',
        h4: '#faf6ef',
        h5: '#f4ecdf',
        h6: '#f4ecdf',
        body: '#f4ecdf',
        muted: '#8a8478',
        link: '#f79871',
        linkHover: '#fabfa4',
        codeInlineBg: '#16263f',
        codeInlineText: '#f4ecdf',
        codeBlockBg: '#060d18',
        codeBlockText: '#faf6ef',
        calloutBg: '#101d31',
        calloutText: '#f4ecdf',
        surfaceBg: '#060d18',
        border: '#213655',
        borderStrong: '#314a6c',
        marker: '#f15a29',
        scrollbarThumb: '#213655',
        scrollbarTrack: '#101d31',
        tableHeaderText: '#fdfbf7',
        tableRowBg: '#101d31',
        errorColor: '#dd675e',
    });

    public static readonly VALUES: PageColorSchema[] = [
        PageColorSchema.LIGHT,
        PageColorSchema.DARK,
    ];
}
