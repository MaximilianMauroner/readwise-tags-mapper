import {
  extractHashtags,
  getDocumentById,
  updateDocumentApi,
} from "@/utils/readwise";
import { getAccessTokenFromRequest } from "api/session";

export async function GET(req: Request, ctx: { params: { id: string } }) {
  const id = ctx.params.id;
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
}
export async function PATCH(req: Request, ctx: { params: { id: string } }) {
  const id = ctx.params.id;
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
}
