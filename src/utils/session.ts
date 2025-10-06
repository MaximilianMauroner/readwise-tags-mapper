export const READWISE_ACCESS_TOKEN_COOKIE = "readwiseAccessToken";

export const parseCookies = (
  cookieHeader: string | null
): Record<string, string> => {
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

export const getAccessTokenFromRequest = (req: Request): string | null => {
  const cookies = parseCookies(req.headers.get("cookie"));
  const token = cookies[READWISE_ACCESS_TOKEN_COOKIE];
  return typeof token === "string" && token.trim().length > 0 ? token : null;
};

export const buildAccessTokenCookie = (token: string): string => {
  const maxAgeSeconds = 60 * 60 * 24 * 30; // 30 days
  return `${READWISE_ACCESS_TOKEN_COOKIE}=${encodeURIComponent(
    token
  )}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${maxAgeSeconds}`;
};

export const clearAccessTokenCookie = (): string =>
  `${READWISE_ACCESS_TOKEN_COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT`;

export const verifyTokenWithReadwise = async (token: string): Promise<void> => {
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
