import {
  Cog,
  File,
  House,
  type LucideIcon,
  MessageCircle,
  PanelTop,
  Settings2,
  TrendingUpDown,
} from "lucide-react";
import type {
  StructureBuilder,
  StructureResolverContext,
} from "sanity/structure";

import { createSlugBasedStructure } from "@/components/nested-pages-structure";
import type { SchemaType, SingletonType } from "@/schemaTypes/index";
import { getTitleCase } from "@/utils/helper";

type Base<T = SchemaType> = {
  id?: string;
  type: T;
  preview?: boolean;
  title?: string;
  icon?: LucideIcon;
};

type CreateSingleTon = {
  S: StructureBuilder;
} & Base<SingletonType>;

const createSingleTon = ({ S, type, title, icon }: CreateSingleTon) => {
  const newTitle = title ?? getTitleCase(type);
  return S.listItem()
    .title(newTitle)
    .icon(icon ?? File)
    .child(S.document().schemaType(type).documentId(type));
};

type CreateList = {
  S: StructureBuilder;
} & Base;

const createList = ({ S, type, icon, title, id }: CreateList) => {
  const newTitle = title ?? getTitleCase(type);
  return S.documentTypeListItem(type)
    .id(id ?? type)
    .title(newTitle)
    .icon(icon ?? File);
};

export const structure = (
  S: StructureBuilder,
  _context: StructureResolverContext
) =>
  S.list()
    .title("Content")
    .items([
      createSingleTon({
        S,
        type: "docsIndex",
        title: "Docs Home",
        icon: House,
      }),
      S.divider(),
      createSlugBasedStructure(S, "doc"),
      createList({
        S,
        type: "faq",
        title: "FAQs",
        icon: MessageCircle,
      }),
      createList({
        S,
        type: "redirect",
        title: "Redirects",
        icon: TrendingUpDown,
      }),
      S.divider(),
      S.listItem()
        .title("Site Configuration")
        .icon(Settings2)
        .child(
          S.list()
            .title("Site Configuration")
            .items([
              createSingleTon({
                S,
                type: "navbar",
                title: "Navigation",
                icon: PanelTop,
              }),
              createSingleTon({
                S,
                type: "chat",
                title: "Chat",
                icon: MessageCircle,
              }),
              createSingleTon({
                S,
                type: "settings",
                title: "Global Settings",
                icon: Cog,
              }),
            ])
        ),
    ]);
