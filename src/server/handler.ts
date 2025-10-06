import index from "../index.html";
import {
  extractHashtags,
  getDocumentById,
  getDocuments,
  updateDocumentApi,
} from "../utils/readwise";

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
  const maxAgeSeconds = 60 * 60 * 24 * 30;
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

  if (response.status === 204) return;
  if (response.status === 401) throw new Error("Invalid Readwise access token");
  throw new Error(
    `Unexpected response from Readwise auth endpoint: ${response.status}`
  );
};

const serveStatic = async (url: URL): Promise<Response> => {
  let pathname = url.pathname;
  if (pathname === "/") pathname = "/index.html";

  try {
    const fileUrl = new URL(`..${pathname}`, import.meta.url);
    const file = Bun.file(fileUrl);

    if (!(await file.exists())) {
      return new Response(index.toString(), {
        headers: { "Content-Type": "text/html; charset=utf-8" },
      });
    }

    return new Response(file, {
      headers: {
        "Content-Type": file.type || "application/octet-stream",
      },
    });
  } catch {
    return new Response(index.toString(), {
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  }
};

export async function handleRequest(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const pathname = url.pathname;

  if (pathname.startsWith("/api/fetch/")) {
    const id = decodeURIComponent(pathname.slice("/api/fetch/".length));

    if (req.method === "GET") {
      const token = getAccessTokenFromRequest(req);
      if (!token) {
        return Response.json(
          { error: "Missing Readwise access token cookie" },
          { status: 401 }
        );
      }

      const doc = await getDocumentById(token, id);

      return Response.json({
        doc,
        tags: extractHashtags(doc?.summary),
      });
    }

    if (req.method === "PATCH") {
      const token = getAccessTokenFromRequest(req);
      if (!token) {
        return Response.json(
          { error: "Missing Readwise access token cookie" },
          { status: 401 }
        );
      }

      const data = (await req.json()) as { tags: string[] };
      const response = await updateDocumentApi(token, id, { tags: data.tags });
      return Response.json(response);
    }

    return new Response("Method Not Allowed", { status: 405 });
  }

  if (pathname === "/api/multi-fetch" && req.method === "POST") {
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
      docs.map((doc) => ({
        doc,
        tags: extractHashtags(doc?.summary),
      }))
    );
  }

  if (pathname === "/api/session") {
    if (req.method === "GET") {
      const token = getAccessTokenFromRequest(req);
      return Response.json({ authenticated: Boolean(token) });
    }

    if (req.method === "POST") {
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
    }

    if (req.method === "DELETE") {
      return new Response(null, {
        status: 204,
        headers: {
          "Set-Cookie": clearAccessTokenCookie(),
        },
      });
    }

    return new Response("Method Not Allowed", { status: 405 });
  }

  if (pathname === "/api/session/test" && req.method === "POST") {
    const body = (await req.json().catch(() => ({}))) as { token?: string };
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
  }

  if (req.method === "GET" || req.method === "HEAD") {
    return serveStatic(url);
  }

  return new Response("Not Found", { status: 404 });
}
