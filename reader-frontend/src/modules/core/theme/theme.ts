export class Theme {
    static readonly LIGHT = new Theme('Light', 'light');
    static readonly DARK = new Theme('Dark', 'dark');

    static readonly values = [Theme.LIGHT, Theme.DARK] as const;

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
