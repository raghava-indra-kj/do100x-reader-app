export class PageSubpageGroup {
    public readonly id: string;
    public readonly label: string;
    public readonly groupByCategory: boolean;

    private constructor(id: string, label: string, groupByCategory: boolean) {
        this.id = id;
        this.label = label;
        this.groupByCategory = groupByCategory;
    }

    public static readonly NONE = new PageSubpageGroup("none", "None", false);
    public static readonly CATEGORY = new PageSubpageGroup("category", "Category", true);

    public static readonly VALUES: PageSubpageGroup[] = [
        PageSubpageGroup.NONE,
        PageSubpageGroup.CATEGORY,
    ];
}
