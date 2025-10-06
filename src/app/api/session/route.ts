import {
  buildAccessTokenCookie,
  clearAccessTokenCookie,
  getAccessTokenFromRequest,
  verifyTokenWithReadwise,
} from "@/utils/session";

export async function GET(req: Request) {
  const token = getAccessTokenFromRequest(req);
  return Response.json({ authenticated: Boolean(token) });
}

export async function POST(req: Request) {
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

export async function DELETE() {
  return new Response(null, {
    status: 204,
    headers: {
      "Set-Cookie": clearAccessTokenCookie(),
    },
  });
}
