export class PageHeadingLevel {
    public readonly id: string;
    public readonly label: string;
    public readonly value: number | null;

    private constructor(id: string, label: string, value: number | null) {
        this.id = id;
        this.label = label;
        this.value = value;
    }

    public static readonly AUTO = new PageHeadingLevel('auto', 'Auto', null);
    public static readonly H1 = new PageHeadingLevel('h1', 'H1', 1);
    public static readonly H2 = new PageHeadingLevel('h2', 'H2', 2);
    public static readonly H3 = new PageHeadingLevel('h3', 'H3', 3);
    public static readonly H4 = new PageHeadingLevel('h4', 'H4', 4);
    public static readonly H5 = new PageHeadingLevel('h5', 'H5', 5);
    public static readonly H6 = new PageHeadingLevel('h6', 'H6', 6);

    public static readonly VALUES: PageHeadingLevel[] = [
        PageHeadingLevel.AUTO,
        PageHeadingLevel.H1,
        PageHeadingLevel.H2,
        PageHeadingLevel.H3,
        PageHeadingLevel.H4,
        PageHeadingLevel.H5,
        PageHeadingLevel.H6,
    ];
}
