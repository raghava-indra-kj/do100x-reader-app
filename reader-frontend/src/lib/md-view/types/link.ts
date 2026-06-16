/** Classification of a link's target */
export type LinkType = "external" | "anchor" | "email" | "relative";

/** Payload delivered to onLinkClick */
export interface LinkClickEvent {
    href: string;
    type: LinkType;
    originalEvent: React.MouseEvent<HTMLAnchorElement>;
}
