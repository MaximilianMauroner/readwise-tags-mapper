import { extractHashtags, getDocuments } from "@/utils/readwise";
import { getAccessTokenFromRequest } from "./session";

export async function POST(req: Request) {
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
}
