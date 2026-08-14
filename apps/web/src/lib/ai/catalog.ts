import { defineCatalog } from "@json-render/core";
import { schema } from "@json-render/react/schema";
import { z } from "zod";

/**
 * json-render catalog for the docs assistant. Isomorphic (no JSX): the chat
 * route feeds `docsCatalog.prompt()` to the model and the client registry
 * renders the resulting spec. Keep it tiny — two components — so the model
 * can't wander.
 */
export const docsCatalog = defineCatalog(schema, {
  components: {
    DocCardScroller: {
      props: z.object({}),
      slots: ["default"],
      description:
        "Horizontal scroller of DocCard children. Use exactly one, with up to 3 DocCard children, when the answer draws on multiple docs pages.",
    },
    DocCard: {
      props: z.object({
        title: z.string(),
        description: z.string(),
        section: z
          .string()
          .describe("Docs section name, e.g. 'Getting started'"),
        href: z
          .string()
          .regex(/^\/[a-z0-9/-]*$/)
          .describe(
            "Site-relative docs path, e.g. /getting-started/setup. Never an absolute URL."
          ),
      }),
      description: "Link card to one docs page the answer cites.",
    },
  },
  actions: {},
});
