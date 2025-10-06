import { serve } from "bun";
import index from "./index.html";
import {
  extractHashtags,
  getDocumentById,
  getDocuments,
  updateDocumentApi,
} from "./utils/readwise";

const server = serve({
  routes: {
    // Serve index.html for all unmatched routes.
    "/*": index,

    "/api/fetch/:id": {
      async GET(req) {
        const id = req.params.id;
        const doc = await getDocumentById(id);

        return await Response.json({
          doc,
          tags: extractHashtags(doc?.summary),
        });
      },
      async PATCH(req) {
        const id = req.params.id;
        const data = (await req.json()) as { tags: string[] };
        const response = await updateDocumentApi(id, {
          tags: data.tags,
        });
        return await Response.json(response);
      },
    },

    "/api/multi-fetch": {
      async POST(req) {
        const data = (await req.json()) as {
          locations: string[];
          categories: string[];
          cursor: string | null;
        };
        const docs = await getDocuments(
          data.locations,
          data.categories,
          data.cursor
        );

        return Response.json(
          docs.map((doc) => {
            return {
              doc,
              tags: extractHashtags(doc?.summary),
            };
          })
        );
      },
    },
  },

  development: process.env.NODE_ENV !== "production" && {
    // Enable browser hot reloading in development
    hmr: true,

    // Echo console logs from the browser to the server
    console: true,
  },
});

console.log(`🚀 Server running at ${server.url}`);
