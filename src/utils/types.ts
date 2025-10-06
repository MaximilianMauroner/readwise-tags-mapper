import z from "zod";

export const tagType = z.enum(["manual", "generated", "public_api"]);
export type TagType = z.infer<typeof tagType>;

export const tagEntrySchema = z.object({
  name: z.string(),
  type: tagType,
  created: z.number(), // Unix timestamp (ms)
});
export type TagEntry = z.infer<typeof tagEntrySchema>;

export const tagMapSchema = z.record(z.string(), tagEntrySchema);
export type TagMap = z.infer<typeof tagMapSchema>;

export const categoryEnum = z.enum([
  "article",
  "email",
  "rss",
  "highlight",
  "note",
  "pdf",
  "epub",
  "tweet",
  "video",
]);
export type Category = z.infer<typeof categoryEnum>;

export const locationEnum = z.enum([
  "new",
  "later",
  "shortlist",
  "archive",
  "feed",
]);
export type Location = z.infer<typeof locationEnum>;

export const updateReadwiseItemSchema = z.object({
  id: z.string(),
  url: z.url(),
});

export type UpdateReadwiseItem = z.infer<typeof updateReadwiseItemSchema>;

export const readwiseItemSchema = z.object({
  id: z.string(),
  url: z.url(),
  title: z.string().nullable(),
  author: z.string().nullable(),
  source: z.string().nullable(),
  category: categoryEnum,
  location: locationEnum,
  tags: tagMapSchema,
  site_name: z.string().nullable(),
  word_count: z.number().nullable(),
  reading_time: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
  published_date: z.any().nullable(),
  summary: z.string().nullable(),
  image_url: z.string().nullable(),
  parent_id: z.string().nullable(),
  reading_progress: z.number().nullable(),
  first_opened_at: z.string().nullable(),
  last_opened_at: z.string().nullable(),
  saved_at: z.string().nullable(),
  last_moved_at: z.string().nullable(),
  content: z.string().nullable(),
  source_url: z.string().nullable(),
  notes: z.string().nullable(),
});

export type ReadwiseItem = z.infer<typeof readwiseItemSchema>;

// The top-level response from the Readwise list API (based on the example payload)

export const readwiseListResponseSchema = z.object({
  count: z.number(),
  nextPageCursor: z.string().nullable(),
  results: z.array(readwiseItemSchema),
});
export type ReadwiseListResponse = z.infer<typeof readwiseListResponseSchema>;

export const fetchDocumentListOptions = z.object({
  id: z.string().optional(),
  updatedAfter: z.string().nullable().optional(),
  location: locationEnum.nullable().optional(),
  category: categoryEnum.nullable().optional(),
  tags: z.array(z.string().nullable().optional()).optional(),
  pageCursor: z.string().nullable().optional(),
  withHtmlContent: z.boolean().optional(),
  withRawSourceUrl: z.boolean().optional(),
});
export type FetchDocumentListOptions = z.infer<typeof fetchDocumentListOptions>;

export const updateDocumentPayloadSchema = z.object({
  tags: z.array(z.string()).optional(),
});
export type UpdateDocumentPayload = z.infer<typeof updateDocumentPayloadSchema>;

export const tagUpdateMode = z.enum(["overwrite", "combine", "pick"]);
export type TagUpdateMode = z.infer<typeof tagUpdateMode>;

export const summaryRecordSchema = z.object({
  id: z.string(),
  summary: z.string(),
  tags: z.array(z.string()),
  category: z.string(),
});
export type SummaryRecord = {
  id: string;
  summary: string;
  tags: string[];
  category: string;
  location: string;
  url: string;
};
