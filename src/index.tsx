import { serve } from "bun";
import index from "./index.html";
import {
  extractHashtags,
  getDocumentById,
  getDocuments,
  updateDocumentApi,
} from "./utils/readwise";

const READWISE_ACCESS_TOKEN_COOKIE = "readwiseAccessToken";

const parseCookies = (cookieHeader: string | null): Record<string, string> => {
  if (!cookieHeader) return {};

  const safeDecode = (value: string): string => {
    try {
      return decodeURIComponent(value);
    } catch {
      return value;
    }
  };

  const pairs = cookieHeader
    .split(";")
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const [rawName, ...rawValueParts] = part.split("=");
      const name = safeDecode(rawName ?? "");
      const value = safeDecode(rawValueParts.join("=") ?? "");
      return [name, value] as const;
    });

  return Object.fromEntries(pairs);
};

const getAccessTokenFromRequest = (req: Request): string | null => {
  const cookies = parseCookies(req.headers.get("cookie"));
  const token = cookies[READWISE_ACCESS_TOKEN_COOKIE];
  return typeof token === "string" && token.trim().length > 0 ? token : null;
};

const buildAccessTokenCookie = (token: string): string => {
  const maxAgeSeconds = 60 * 60 * 24 * 30; // 30 days
  return `${READWISE_ACCESS_TOKEN_COOKIE}=${encodeURIComponent(
    token
  )}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${maxAgeSeconds}`;
};

const clearAccessTokenCookie = (): string =>
  `${READWISE_ACCESS_TOKEN_COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT`;

const verifyTokenWithReadwise = async (token: string): Promise<void> => {
  const response = await fetch("https://readwise.io/api/v2/auth/", {
    method: "GET",
    headers: {
      Authorization: `Token ${token}`,
    },
  });

  if (response.status === 204) {
    return;
  }

  if (response.status === 401) {
    throw new Error("Invalid Readwise access token");
  }

  throw new Error(
    `Unexpected response from Readwise auth endpoint: ${response.status}`
  );
};

const server = serve({
  routes: {
    // Serve index.html for all unmatched routes.
    "/*": index,

    "/api/fetch/:id": {
      async GET(req) {
        const id = req.params.id;
        const token = getAccessTokenFromRequest(req);
        if (!token) {
          return Response.json(
            { error: "Missing Readwise access token cookie" },
            { status: 401 }
          );
        }

        const doc = await getDocumentById(token, id);

        return await Response.json({
          doc,
          tags: extractHashtags(doc?.summary),
        });
      },
      async PATCH(req) {
        const id = req.params.id;
        const token = getAccessTokenFromRequest(req);
        if (!token) {
          return Response.json(
            { error: "Missing Readwise access token cookie" },
            { status: 401 }
          );
        }
        const data = (await req.json()) as { tags: string[] };
        const response = await updateDocumentApi(token, id, {
          tags: data.tags,
        });
        return await Response.json(response);
      },
    },

    "/api/multi-fetch": {
      async POST(req) {
        const token = getAccessTokenFromRequest(req);
        if (!token) {
          return Response.json(
            { error: "Missing Readwise access token cookie" },
            { status: 401 }
          );
        }
        const data = (await req.json()) as {
          locations: string[];
          categories: string[];
          cursor: string | null;
        };
        const docs = await getDocuments(
          token,
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

    "/api/session": {
      async GET(req) {
        const token = getAccessTokenFromRequest(req);
        return Response.json({ authenticated: Boolean(token) });
      },
      async POST(req) {
        const payload = (await req.json()) as { token?: string };
        const token = payload?.token?.trim();

        if (!token) {
          return Response.json(
            { error: "The 'token' field is required" },
            { status: 400 }
          );
        }

        try {
          await verifyTokenWithReadwise(token);
        } catch (error) {
          const message =
            error instanceof Error ? error.message : "Token validation failed";
          return Response.json({ error: message }, { status: 401 });
        }

        return new Response(null, {
          status: 204,
          headers: {
            "Set-Cookie": buildAccessTokenCookie(token),
          },
        });
      },
      async DELETE() {
        return new Response(null, {
          status: 204,
          headers: {
            "Set-Cookie": clearAccessTokenCookie(),
          },
        });
      },
    },

    "/api/session/test": {
      async POST(req) {
        const body = (await req.json().catch(() => ({}))) as {
          token?: string;
        };
        const suppliedToken = body?.token?.trim() || null;
        const cookieToken = getAccessTokenFromRequest(req);
        const token = suppliedToken ?? cookieToken;

        if (!token) {
          return Response.json(
            { error: "No token supplied or stored" },
            { status: 400 }
          );
        }

        try {
          await verifyTokenWithReadwise(token);
        } catch (error) {
          const message =
            error instanceof Error ? error.message : "Token validation failed";
          return Response.json({ error: message }, { status: 401 });
        }

        return new Response(null, { status: 204 });
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
