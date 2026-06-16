import type { Components } from "react-markdown";
import { Heading } from "./heading";
import { Paragraph } from "./paragraph";
import { Blockquote } from "./blockquote";
import { Divider } from "./divider";
import { BulletList, OrderedList, ListItem } from "./list";
import {
  Table, TableHead, TableBody, TableRow, TableCell, TableHeaderCell,
} from "./table";
import { Callout } from "./callout";
import { Details, DetailsSummary } from "./details";
import { Image } from "./image";
import { IFrame } from "./iframe";
import { PreUnwrap } from "./pre-unwrap";

export {
  Heading, Paragraph, Blockquote, Divider,
  BulletList, OrderedList, ListItem,
  Table, TableHead, TableBody, TableRow, TableCell, TableHeaderCell,
  Callout, Details, DetailsSummary, Image, IFrame, PreUnwrap,
};

/** Block tag to component map for react-markdown. */
export const blockComponents: Components = {
  p: Paragraph,
  h1: Heading,
  h2: Heading,
  h3: Heading,
  h4: Heading,
  h5: Heading,
  h6: Heading,
  blockquote: Blockquote,
  hr: Divider,
  ul: BulletList,
  ol: OrderedList,
  li: ListItem,
  table: Table,
  thead: TableHead,
  tbody: TableBody,
  tr: TableRow,
  td: TableCell,
  th: TableHeaderCell,
  details: Details,
  summary: DetailsSummary,
  img: Image,
  iframe: IFrame,
  pre: PreUnwrap,
};

/** Non-HTML custom elements excluded from the standard Components type. */
export const customBlockComponents = {
  callout: Callout,
};
