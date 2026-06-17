export class PageSubpageSort {
    public readonly id: string;
    public readonly label: string;
    public readonly key: "sortOrder" | "createdAt" | "title";

    private constructor(id: string, label: string, key: PageSubpageSort["key"]) {
        this.id = id;
        this.label = label;
        this.key = key;
    }

    public static readonly SORT_ORDER = new PageSubpageSort("sortOrder", "Manual", "sortOrder");
    public static readonly CREATED_AT = new PageSubpageSort("createdAt", "Created", "createdAt");
    public static readonly TITLE = new PageSubpageSort("title", "Title", "title");

    public static readonly VALUES: PageSubpageSort[] = [
        PageSubpageSort.SORT_ORDER,
        PageSubpageSort.CREATED_AT,
        PageSubpageSort.TITLE,
    ];
}
