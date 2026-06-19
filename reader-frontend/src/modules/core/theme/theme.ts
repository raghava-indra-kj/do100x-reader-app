export class Theme {
    static readonly LIGHT = new Theme('Light', 'light');
    static readonly DARK = new Theme('Dark', 'dark');
    static readonly SLATE_LIGHT = new Theme('Slate Light', 'slate-light');
    static readonly SEPIA = new Theme('Sepia', 'sepia');
    static readonly SAGE = new Theme('Sage', 'sage');
    static readonly FOREST_DARK = new Theme('Forest Dark', 'forest-dark');
    static readonly NOVA_DARK = new Theme('Nova Dark', 'nova-dark');
    static readonly WARM_DARK = new Theme('Warm Dark', 'warm-dark');

    static readonly values = [
        Theme.LIGHT,
        Theme.DARK,
        Theme.SLATE_LIGHT,
        Theme.SEPIA,
        Theme.SAGE,
        Theme.FOREST_DARK,
        Theme.NOVA_DARK,
        Theme.WARM_DARK,
    ] as const;

    public readonly name: string;
    public readonly value: string;

    private constructor(name: string, value: string) {
        this.name = name;
        this.value = value;
    }

    static fromValue(value: string): Theme | null {
        return Theme.values.find(theme => theme.value === value) ?? null;
    }

    static default(): Theme {
        return Theme.LIGHT;
    }
}
