import {
  getAccessTokenFromRequest,
  verifyTokenWithReadwise,
} from "@/utils/session";

export async function POST(req: Request) {
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
}
