import { faq } from "@/schemaTypes/documents/faq";
import { doc } from "@/schemaTypes/documents/doc";
import { docsIndex } from "@/schemaTypes/documents/docs-index";
import { navbar } from "@/schemaTypes/documents/navbar";
import { redirect } from "@/schemaTypes/documents/redirect";
import { settings } from "@/schemaTypes/documents/settings";

export const singletons = [docsIndex, settings, navbar];

export const documents = [doc, faq, ...singletons, redirect];
