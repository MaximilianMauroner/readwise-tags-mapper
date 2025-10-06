// @ts-ignore: allow importing CSS as a side-effect (handled by the bundler)
import "./index.css";
import { categoryEnum, locationEnum, type ReadwiseItem } from "./utils/types";
import { useState } from "react";

export function App() {
  const [runSingle, setRunSingle] = useState<boolean>(false);
  const [documentId, setDocumentId] = useState<string>("");

  // batch options
  const [locations, setLocations] = useState<string[]>(["archive"]);
  const [categories, setCategories] = useState<string[]>(["article"]);

  const [extractedTags, setExtractedTags] = useState<string[]>([]);
  const [documentTags, setDocumentTags] = useState<string[]>([]);
  const [fetchedDocs, setFetchedDocs] = useState<
    { doc: ReadwiseItem; tags: string[] }[]
  >([]);
  const [selectedDocIds, setSelectedDocIds] = useState<Set<string>>(new Set());
  const [activeDocId, setActiveDocId] = useState<string | null>(null);
  const [activeDocUrl, setActiveDocUrl] = useState<string | null>(null);

  const [cursor, setCursor] = useState<string | null>();

  const [sampleText, setSampleText] = useState<string>("");

  const [selectedTags, setSelectedTags] = useState<Set<string>>(new Set());

  function toggleLocation(loc: string) {
    setLocations((prev) =>
      prev.includes(loc) ? prev.filter((l) => l !== loc) : [...prev, loc]
    );
  }

  function toggleCategory(cat: string) {
    setCategories((prev) =>
      prev.includes(cat) ? prev.filter((t) => t !== cat) : [...prev, cat]
    );
  }

  async function handleFetchSingle() {
    const url = new URL("/api/fetch/" + documentId, location.href);
    const res = await fetch(url);
    const data = (await res.json()) as {
      doc: ReadwiseItem;
      tags: string[];
    };
    setSampleText(data.doc.summary || "");
    data.tags.sort((a, b) => a.localeCompare(b));
    setExtractedTags(data.tags);

    const tags = Object.keys(data.doc.tags);

    tags.sort((a, b) => a.localeCompare(b));
    setDocumentTags(tags);

    const tagSet = new Set(tags);
    data.tags.forEach((t) => tagSet.add(t));

    setSelectedTags(tagSet);
    setActiveDocId(data.doc.id);
    setActiveDocUrl(data.doc.url ?? null);
  }

  async function updateDocumentTags() {
    const idToUpdate = activeDocId ?? documentId;
    if (!idToUpdate) {
      console.warn("No document selected to update");
      return;
    }
    const url = new URL("/api/fetch/" + idToUpdate, location.href);
    const res = await fetch(url, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        tags: Array.from(selectedTags),
      }),
    });
  }

  async function handleFetchBatch() {
    const url = new URL("/api/multi-fetch", location.href);
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        locations,
        categories,
        cursor,
      }),
    });
    const data = (await res.json()) as {
      doc: ReadwiseItem;
      tags: string[];
    }[];
    setFetchedDocs(data);
  }

  function loadDocIntoPane(doc: ReadwiseItem, docTags: string[]) {
    setActiveDocId(doc.id);
    setActiveDocUrl(doc.url ?? null);
    setDocumentId(doc.id);
    setSampleText(doc.summary || "");
    const existing = doc?.tags ? Object.keys(doc.tags) : docTags ?? [];
    existing.sort((a, b) => a.localeCompare(b));
    setDocumentTags(existing);
    const tagSet = new Set(existing);
    (docTags ?? []).forEach((t) => tagSet.add(t));
    setSelectedTags(tagSet);
    setExtractedTags(
      (docTags ?? []).slice().sort((a, b) => a.localeCompare(b))
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-pink-50 to-yellow-50 text-gray-900 font-sans">
      <div className="max-w-7xl mx-auto flex flex-col gap-6 px-6 py-8">
        <header className="flex flex-wrap items-center gap-4 rounded-3xl border border-white/60 bg-white/90 p-5 shadow-lg backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500 text-lg font-semibold text-white shadow-md">
              RW
            </div>
            <div>
              <h1 className="text-xl font-semibold text-gray-900 lg:text-2xl">
                Readwise Tags Mapper
              </h1>
              <p className="text-xs text-gray-500 lg:text-sm">
                Switch flows, pull documents, and curate tags—all without
                leaving this view.
              </p>
            </div>
          </div>

          <div className="flex flex-1 flex-col gap-4 lg:flex-row lg:items-center lg:justify-end">
            <div className="flex items-center gap-2 rounded-full bg-gray-100 p-1">
              <label
                className={`cursor-pointer rounded-full px-4 py-2 text-sm font-medium transition ${
                  runSingle
                    ? "bg-indigo-600 text-white shadow"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                <input
                  type="radio"
                  name="runMode"
                  checked={runSingle}
                  onChange={() => setRunSingle(true)}
                  className="hidden"
                />
                Single
              </label>
              <label
                className={`cursor-pointer rounded-full px-4 py-2 text-sm font-medium transition ${
                  !runSingle
                    ? "bg-indigo-600 text-white shadow"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                <input
                  type="radio"
                  name="runMode"
                  checked={!runSingle}
                  onChange={() => setRunSingle(false)}
                  className="hidden"
                />
                Batch
              </label>
            </div>

            {runSingle ? (
              <div className="flex w-full flex-col gap-3 lg:w-auto lg:flex-row lg:items-center">
                <input
                  value={documentId}
                  onChange={(e) => setDocumentId(e.target.value)}
                  placeholder="Document ID (e.g. d_123456)"
                  className="w-full min-w-[220px] rounded-2xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm focus:outline-none focus:ring-4 focus:ring-indigo-200 lg:w-64"
                />
                <button
                  onClick={handleFetchSingle}
                  className="inline-flex items-center justify-center rounded-2xl bg-gradient-to-r from-indigo-500 to-purple-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md transition hover:shadow-lg"
                >
                  Fetch document
                </button>
              </div>
            ) : (
              <div className="flex w-full flex-col gap-3 lg:flex-row lg:items-center lg:justify-end">
                <div className="flex flex-wrap gap-2">
                  {Object.keys(locationEnum.enum).map((loc) => (
                    <button
                      key={loc}
                      onClick={() => toggleLocation(loc)}
                      className={`rounded-full border px-3 py-1.5 text-sm capitalize transition ${
                        locations.includes(loc)
                          ? "bg-teal-500 text-white border-teal-600 shadow"
                          : "border-gray-200 bg-white text-gray-700 hover:border-teal-300"
                      }`}
                    >
                      {loc}
                    </button>
                  ))}
                </div>

                <div className="flex flex-wrap gap-2">
                  {Object.keys(categoryEnum.enum).map((cat) => (
                    <button
                      key={cat}
                      onClick={() => toggleCategory(cat)}
                      className={`rounded-full border px-3 py-1.5 text-sm capitalize transition ${
                        categories.includes(cat)
                          ? "bg-pink-500 text-white border-pink-600 shadow"
                          : "border-gray-200 bg-white text-gray-700 hover:border-pink-300"
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>

                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                  <input
                    type="text"
                    value={cursor ?? ""}
                    onChange={(e) => setCursor(e.target.value)}
                    placeholder="Cursor (optional)"
                    className="w-full min-w-[180px] rounded-2xl border border-gray-200 bg-white px-4 py-2.5 text-sm focus:outline-none focus:ring-4 focus:ring-pink-200"
                  />
                  <button
                    onClick={handleFetchBatch}
                    className="inline-flex items-center justify-center rounded-2xl bg-gradient-to-r from-pink-500 to-orange-400 px-5 py-2.5 text-sm font-semibold text-white shadow-md transition hover:shadow-lg"
                  >
                    Fetch documents
                  </button>
                </div>
              </div>
            )}
          </div>
        </header>

        <div className="flex flex-col gap-5 lg:flex-row">
          <aside className="lg:w-80 flex-shrink-0 overflow-hidden rounded-3xl border border-white/70 bg-white/90 p-6 shadow-lg backdrop-blur-sm space-y-4 lg:h-[calc(100vh-260px)] lg:sticky lg:top-8">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-800">
                  Fetched documents
                </h2>
                <p className="text-xs uppercase tracking-wide text-gray-400 mt-1">
                  Select a document to review its tags
                </p>
              </div>
              <span className="text-sm font-medium text-indigo-600">
                {fetchedDocs.length}
              </span>
            </div>

            <div className="max-h-[70vh] overflow-y-auto space-y-3 pr-1">
              {fetchedDocs.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-indigo-200 bg-indigo-50/60 p-6 text-center text-sm text-indigo-500">
                  No documents yet. Run a fetch to populate this list.
                </div>
              ) : (
                fetchedDocs.map(({ doc, tags: docTags }) => {
                  const existing = doc?.tags
                    ? Object.keys(doc.tags)
                    : docTags ?? [];
                  const isActive =
                    activeDocId === doc.id || documentId === doc.id;
                  return (
                    <div
                      key={doc.id}
                      className={`relative rounded-2xl border p-4 transition shadow-sm ${
                        isActive
                          ? "border-indigo-300 bg-indigo-50/80"
                          : "border-gray-200 bg-white hover:border-indigo-200"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <input
                          type="checkbox"
                          checked={selectedDocIds.has(doc.id)}
                          onChange={() =>
                            setSelectedDocIds((prev) => {
                              const next = new Set(prev);
                              if (next.has(doc.id)) next.delete(doc.id);
                              else next.add(doc.id);
                              return next;
                            })
                          }
                          className="mt-1 h-4 w-4 cursor-pointer rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                        />
                        <div className="flex-1">
                          <button
                            type="button"
                            onClick={() => loadDocIntoPane(doc, docTags)}
                            className="text-left text-sm font-semibold text-gray-800 hover:text-indigo-600"
                          >
                            {doc.title ?? "(no title)"}
                          </button>
                          <div className="mt-1 text-xs text-gray-500 break-all line-clamp-2">
                            {doc.url}
                          </div>
                          <div className="mt-3 flex flex-wrap gap-1">
                            {existing.length > 0 ? (
                              existing.slice(0, 6).map((t) => (
                                <span
                                  key={t}
                                  className="rounded-full bg-indigo-100 px-2.5 py-1 text-xs font-medium text-indigo-700"
                                >
                                  #{t}
                                </span>
                              ))
                            ) : (
                              <a
                                href={doc.url}
                                target="_blank"
                                rel="noreferrer"
                                className="text-xs font-medium text-blue-600 underline"
                              >
                                Open in Readwise
                              </a>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </aside>

          <section className="flex-1 min-w-0 bg-white/90 backdrop-blur-sm border border-white/70 rounded-3xl shadow-lg p-6 lg:p-8 flex flex-col gap-6">
            <div className="flex flex-col gap-2">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <h2 className="text-2xl font-semibold text-gray-800">
                  Tag update workspace
                </h2>
                <div className="flex flex-wrap items-center gap-3 text-sm">
                  <span className="font-medium text-gray-500">
                    {activeDocId || documentId || "No document selected"}
                  </span>
                  {activeDocUrl && (
                    <a
                      href={activeDocUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 font-semibold text-indigo-600 transition hover:border-indigo-300 hover:bg-indigo-100"
                    >
                      Open in Readwise
                    </a>
                  )}
                </div>
              </div>
              <p className="text-sm text-gray-500">
                Review the AI summary, curate the tag set, and apply when you're
                ready.
              </p>
            </div>

            <div className="space-y-3">
              <label className="block text-xs uppercase tracking-wide text-gray-500">
                Document summary
              </label>
              <textarea
                value={sampleText}
                readOnly
                rows={8}
                className="w-full resize-none rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm leading-relaxed text-gray-700"
              />
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
              <div className="space-y-3">
                <label className="block text-xs uppercase tracking-wide text-gray-500">
                  Existing tags
                </label>
                <div className="min-h-[64px] rounded-2xl border border-gray-200 bg-white px-3 py-3 flex flex-wrap gap-2">
                  {documentTags.length === 0 ? (
                    <span className="text-sm text-gray-400">
                      No tags on this document yet.
                    </span>
                  ) : (
                    documentTags.map((t) => (
                      <button
                        key={t}
                        onClick={() =>
                          setSelectedTags((prev) => {
                            const next = new Set(prev);
                            if (next.has(t)) next.delete(t);
                            else next.add(t);
                            return next;
                          })
                        }
                        className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
                          selectedTags.has(t)
                            ? "border-indigo-600 bg-indigo-600 text-white shadow-inner"
                            : "border-indigo-100 bg-indigo-50 text-indigo-700 hover:border-indigo-300"
                        }`}
                      >
                        #{t}
                      </button>
                    ))
                  )}
                </div>
              </div>

              <div className="space-y-3">
                <label className="block text-xs uppercase tracking-wide text-gray-500">
                  Extracted tags
                </label>
                <div className="min-h-[64px] rounded-2xl border border-gray-200 bg-white px-3 py-3 flex flex-wrap gap-2">
                  {extractedTags.length === 0 ? (
                    <span className="text-sm text-gray-400">
                      No tags extracted yet.
                    </span>
                  ) : (
                    extractedTags.map((t) => (
                      <button
                        key={t}
                        onClick={() =>
                          setSelectedTags((prev) => {
                            const next = new Set(prev);
                            if (next.has(t)) next.delete(t);
                            else next.add(t);
                            return next;
                          })
                        }
                        className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
                          selectedTags.has(t)
                            ? "border-indigo-600 bg-indigo-600 text-white shadow-inner"
                            : "border-indigo-100 bg-indigo-50 text-indigo-700 hover:border-indigo-300"
                        }`}
                      >
                        #{t}
                      </button>
                    ))
                  )}
                </div>
              </div>
            </div>

            <div className="border-t border-gray-200 pt-4">
              <button
                onClick={updateDocumentTags}
                type="submit"
                className="w-full rounded-2xl bg-gradient-to-r from-green-400 to-teal-500 px-5 py-3 text-base font-semibold text-white shadow-xl transition hover:shadow-2xl"
              >
                Apply tag updates
              </button>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

export default App;
