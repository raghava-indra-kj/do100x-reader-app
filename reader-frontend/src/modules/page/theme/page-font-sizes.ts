import type { MdViewFontSizes } from '@reader/md-view';

export class PageFontSizes {
    public readonly id: string;
    public readonly label: string;
    public readonly value: MdViewFontSizes;

    private constructor(id: string, label: string, value: MdViewFontSizes) {
        this.id = id;
        this.label = label;
        this.value = value;
    }

    public static readonly XS = new PageFontSizes('xs', 'XS', {
        paragraph: 13,
        h1: 24, h2: 20, h3: 18, h4: 16, h5: 14, h6: 13,
        code: 12,
        equation: 13,
        blockquote: 13,
        callout: 12,
        listItem: 13,
        table: 12,
    });

    public static readonly SM = new PageFontSizes('sm', 'Small', {
        paragraph: 14,
        h1: 26, h2: 22, h3: 19, h4: 17, h5: 15, h6: 14,
        code: 13,
        equation: 14,
        blockquote: 14,
        callout: 13,
        listItem: 14,
        table: 13,
    });

    public static readonly BASE = new PageFontSizes('base', 'Base', {
        paragraph: 16,
        h1: 32, h2: 26, h3: 22, h4: 18, h5: 16, h6: 16,
        code: 14,
        equation: 16,
        blockquote: 16,
        callout: 14,
        listItem: 16,
        table: 14,
    });

    public static readonly LG = new PageFontSizes('lg', 'Large', {
        paragraph: 18,
        h1: 36, h2: 30, h3: 26, h4: 22, h5: 18, h6: 18,
        code: 16,
        equation: 18,
        blockquote: 18,
        callout: 16,
        listItem: 18,
        table: 16,
    });

    public static readonly XL = new PageFontSizes('xl', 'XL', {
        paragraph: 20,
        h1: 40, h2: 33, h3: 28, h4: 23, h5: 20, h6: 20,
        code: 16,
        equation: 20,
        blockquote: 20,
        callout: 16,
        listItem: 20,
        table: 16,
    });

    public static readonly XL2 = new PageFontSizes('2xl', '2XL', {
        paragraph: 22,
        h1: 43, h2: 36, h3: 30, h4: 25, h5: 22, h6: 22,
        code: 17,
        equation: 22,
        blockquote: 22,
        callout: 17,
        listItem: 22,
        table: 16,
    });

    public static readonly XL3 = new PageFontSizes('3xl', '3XL', {
        paragraph: 24,
        h1: 46, h2: 38, h3: 32, h4: 27, h5: 24, h6: 24,
        code: 18,
        equation: 24,
        blockquote: 24,
        callout: 18,
        listItem: 24,
        table: 16,
    });

    public static readonly XL4 = new PageFontSizes('4xl', '4XL', {
        paragraph: 28,
        h1: 50, h2: 42, h3: 36, h4: 30, h5: 28, h6: 28,
        code: 20,
        equation: 28,
        blockquote: 26,
        callout: 19,
        listItem: 28,
        table: 17,
    });

    public static readonly XL5 = new PageFontSizes('5xl', '5XL', {
        paragraph: 32,
        h1: 54, h2: 46, h3: 40, h4: 34, h5: 32, h6: 32,
        code: 22,
        equation: 32,
        blockquote: 28,
        callout: 20,
        listItem: 32,
        table: 18,
    });

    public static readonly XL6 = new PageFontSizes('6xl', '6XL', {
        paragraph: 36,
        h1: 58, h2: 50, h3: 44, h4: 38, h5: 36, h6: 36,
        code: 24,
        equation: 36,
        blockquote: 30,
        callout: 22,
        listItem: 36,
        table: 20,
    });

    public static readonly VALUES: PageFontSizes[] = [
        PageFontSizes.XS,
        PageFontSizes.SM,
        PageFontSizes.BASE,
        PageFontSizes.LG,
        PageFontSizes.XL,
        PageFontSizes.XL2,
        PageFontSizes.XL3,
        PageFontSizes.XL4,
        PageFontSizes.XL5,
        PageFontSizes.XL6,
    ];
}
