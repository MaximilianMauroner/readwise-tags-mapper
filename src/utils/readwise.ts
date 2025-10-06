import {
  categoryEnum,
  locationEnum,
  readwiseItemSchema,
  readwiseListResponseSchema,
  updateReadwiseItemSchema,
  type FetchDocumentListOptions,
  type ReadwiseItem,
  type ReadwiseListResponse,
  type UpdateDocumentPayload,
  type UpdateReadwiseItem,
} from "./types";

type AuthenticatedRequestInit = RequestInit & {
  authToken?: string;
};

const MAX_RATE_LIMIT_RETRIES = 5;
const DEFAULT_RETRY_DELAY_MS = 1_500;

const delay = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

const getRetryAfterDelayMs = (response: Response): number | null => {
  const retryAfter = response.headers.get("Retry-After");
  if (!retryAfter) return null;

  const seconds = Number(retryAfter);
  if (Number.isFinite(seconds) && seconds >= 0) {
    return seconds * 1_000;
  }

  const retryDate = Date.parse(retryAfter);
  if (!Number.isNaN(retryDate)) {
    const diff = retryDate - Date.now();
    if (diff > 0) return diff;
  }

  return null;
};

const fetchWrapper = async <T>(
  input: string | URL | Request,
  init?: AuthenticatedRequestInit
): Promise<T> => {
  const { authToken, headers, ...restInit } = init ?? {};

  if (!authToken) {
    throw new Error(
      "Missing Readwise access token. Ensure the authentication cookie is set before making requests."
    );
  }

  const headersInstance = new Headers(headers ?? undefined);
  headersInstance.set("Authorization", `Token ${authToken}`);

  const buildRequestInit = (): RequestInit => ({
    ...restInit,
    headers: headersInstance,
  });

  let retryCount = 0;

  while (true) {
    const response = await fetch(input, buildRequestInit());

    if (response.status === 429) {
      if (retryCount >= MAX_RATE_LIMIT_RETRIES) {
        throw new Error(
          "Rate limit exceeded: received too many 429 responses from Readwise API"
        );
      }

      const retryDelayMs =
        getRetryAfterDelayMs(response) ?? DEFAULT_RETRY_DELAY_MS;
      retryCount += 1;
      console.warn(
        `Rate limited by Readwise API. Retrying in ${Math.ceil(
          retryDelayMs / 1_000
        )}s (attempt ${retryCount}/${MAX_RATE_LIMIT_RETRIES}).`
      );
      await delay(retryDelayMs);
      continue;
    }

    if (!response.ok) {
      throw new Error(
        `Network error: ${response.status} ${response.statusText}`
      );
    }

    if (response.status === 204 || response.status === 205) {
      return undefined as T;
    }

    const contentType = response.headers.get("Content-Type") ?? "";

    if (contentType.includes("application/json")) {
      return (await response.json()) as T;
    }

    const text = await response.text();
    if (!text.trim()) {
      return undefined as T;
    }

    try {
      return JSON.parse(text) as T;
    } catch {
      throw new Error(
        `Expected JSON response but received content type '${
          contentType || "unknown"
        }'.`
      );
    }
  }
};

const fetchDocumentListApi = async (
  token: string,
  options: FetchDocumentListOptions = {}
) => {
  let fullData: ReadwiseItem[] = [];
  let nextPageCursor: string | null = options.pageCursor ?? null;

  while (true) {
    const queryParams = new URLSearchParams();
    if (nextPageCursor) queryParams.append("pageCursor", nextPageCursor);
    if (options.id) queryParams.append("id", options.id);
    if (options.updatedAfter)
      queryParams.append("updatedAfter", options.updatedAfter);
    if (options.location) queryParams.append("location", options.location);
    if (options.category) queryParams.append("category", options.category);
    if (options.tags) {
      options.tags
        .filter((tag) => tag !== undefined)
        .forEach((tag) => queryParams.append("tag", tag ?? ""));
    }
    if (typeof options.withHtmlContent === "boolean")
      queryParams.append("withHtmlContent", String(options.withHtmlContent));
    if (typeof options.withRawSourceUrl === "boolean")
      queryParams.append("withRawSourceUrl", String(options.withRawSourceUrl));

    const url = "https://readwise.io/api/v3/list/?" + queryParams.toString();
    const response = await fetchWrapper<ReadwiseListResponse>(url, {
      method: "GET",
      authToken: token,
    });

    const parsedResponse = readwiseListResponseSchema.parse(response);

    const results = parsedResponse.results ?? [];
    fullData.push(...results);
    if (options.id) break; // id lookups return at most one page
    nextPageCursor = parsedResponse.nextPageCursor ?? null;
    if (!nextPageCursor) break;
  }

  return fullData;
};

export const updateDocumentApi = async (
  token: string,
  id: string,
  payload: UpdateDocumentPayload
) => {
  if (!id) throw new Error("Document id is required to perform an update");
  const url = `https://readwise.io/api/v3/update/${id}/`;
  const response = await fetchWrapper<UpdateReadwiseItem>(url, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
    authToken: token,
  });
  const parsedResponse = updateReadwiseItemSchema.parse(response);
  return parsedResponse;
};

export const getDocumentById = async (
  token: string,
  id: string,
  options: Omit<FetchDocumentListOptions, "id" | "pageCursor"> = {}
) => {
  const results = await fetchDocumentListApi(token, { ...options, id });
  return results[0] ?? null;
};

export const getDocuments = async (
  token: string,
  locations: string[],
  categories: string[],
  pageCursor: string | null = null
) => {
  let allDocs: ReadwiseItem[] = [];
  for (const loc of locations) {
    const lo = locationEnum.parse(loc);
    for (const cat of categories) {
      const ca = categoryEnum.parse(cat);
      const docs = await fetchDocumentListApi(token, {
        location: lo,
        category: ca,
        pageCursor,
      });
      allDocs.push(...docs);
    }
  }
  return allDocs;
};

export const extractHashtags = (
  summary: string | null | undefined
): string[] => {
  if (typeof summary !== "string" || summary.trim().length === 0) {
    return [];
  }

  const hashtagRegex = /#[\p{L}0-9_]+(?:-[\p{L}0-9_]+)*/gu;
  const matches = summary.match(hashtagRegex) ?? [];

  const cleaned = matches
    .map((tag) => tag.slice(1).trim())
    .filter((tag) => tag.length > 0);

  const unique = Array.from(new Set(cleaned));
  return unique;
};
