export const config = {
  runtime: "bun@1.1.20",
};

export default function handler(_req: Request): Response {
  return new Response("hello", {
    status: 200,
    headers: { "content-type": "text/plain; charset=utf-8" },
  });
}
