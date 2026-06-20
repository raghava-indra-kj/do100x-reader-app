import type { MdViewFonts } from '@reader/md-view';

export class PageFontFamilies {
    public readonly id: string;
    public readonly label: string;
    public readonly value: MdViewFonts;

    private constructor(id: string, label: string, value: MdViewFonts) {
        this.id = id;
        this.label = label;
        this.value = value;
    }

    public static readonly LEXEND = new PageFontFamilies('lexend', 'Lexend', {
        heading: "'Lexend', system-ui, sans-serif",
        prose: "'Lexend', system-ui, sans-serif",
        code: "'JetBrains Mono', ui-monospace, monospace",
    });

    public static readonly MERRIWEATHER = new PageFontFamilies('merriweather', 'Merriweather', {
        heading: "'Merriweather', Georgia, serif",
        prose: "'Merriweather', Georgia, serif",
        code: "'JetBrains Mono', ui-monospace, monospace",
    });

    public static readonly ATKINSON = new PageFontFamilies('atkinson', 'Atkinson Hyperlegible', {
        heading: "'Atkinson Hyperlegible', sans-serif",
        prose: "'Atkinson Hyperlegible', sans-serif",
        code: "'JetBrains Mono', ui-monospace, monospace",
    });

    public static readonly VALUES: PageFontFamilies[] = [
        PageFontFamilies.LEXEND,
        PageFontFamilies.MERRIWEATHER,
        PageFontFamilies.ATKINSON,
    ];
}
