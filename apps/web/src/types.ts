import type { FilterByType, Get } from "@sanity/codegen";
import type {
  QueryGlobalSeoSettingsResult,
  QueryDocBySlugResult,
  QueryNavbarDataResult,
} from "@workspace/sanity/types";

export type PageBuilderBlock = Get<QueryDocBySlugResult, "pageBuilder", number>;

type PageBuilderBlockTypes = NonNullable<PageBuilderBlock>["_type"];

export type PagebuilderType<T extends PageBuilderBlockTypes> = FilterByType<
  NonNullable<PageBuilderBlock>,
  T
>;

export type SanityRichTextProps = Get<QueryDocBySlugResult, "body">;

export type SanityRichTextBlock = FilterByType<
  NonNullable<NonNullable<SanityRichTextProps>[number]>,
  "block"
>;

export type Maybe<T> = T | null | undefined;

export type NavigationData = {
  navbarData: QueryNavbarDataResult;
  settingsData: QueryGlobalSeoSettingsResult;
};
