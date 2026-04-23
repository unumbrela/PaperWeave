declare module "turndown-plugin-gfm" {
  import type TurndownService from "turndown";
  export function gfm(ts: TurndownService): void;
  export function tables(ts: TurndownService): void;
  export function strikethrough(ts: TurndownService): void;
  export function taskListItems(ts: TurndownService): void;
  export function highlightedCodeBlock(ts: TurndownService): void;
}
