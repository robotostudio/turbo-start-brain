import { chat } from "@/schemaTypes/documents/chat";
import { doc } from "@/schemaTypes/documents/doc";
import { docsIndex } from "@/schemaTypes/documents/docs-index";
import { faq } from "@/schemaTypes/documents/faq";
import { redirect } from "@/schemaTypes/documents/redirect";
import { settings } from "@/schemaTypes/documents/settings";

export const singletons = [docsIndex, settings, chat];

export const documents = [doc, faq, ...singletons, redirect];
