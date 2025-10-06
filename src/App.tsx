// @ts-ignore: allow importing CSS as a side-effect (handled by the bundler)
import "./index.css";
import { categoryEnum, locationEnum, type ReadwiseItem } from "./utils/types";
import { useEffect, useState } from "react";

export function App() {
  const [tokenInput, setTokenInput] = useState<string>("");
  const [authStatus, setAuthStatus] = useState<
    "unknown" | "authenticated" | "missing"
  >("unknown");
  const [authMessage, setAuthMessage] = useState<{
    text: string;
    tone: "success" | "error" | "info";
  } | null>(null);
  const [isSavingToken, setIsSavingToken] = useState<boolean>(false);
  const [isTestingToken, setIsTestingToken] = useState<boolean>(false);
  const [isClearingToken, setIsClearingToken] = useState<boolean>(false);
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
  const [activeDocId, setActiveDocId] = useState<string | null>(null);
  const [activeDocUrl, setActiveDocUrl] = useState<string | null>(null);

  const [cursor, setCursor] = useState<string | null>();

  const [sampleText, setSampleText] = useState<string>("");

  const [selectedTags, setSelectedTags] = useState<Set<string>>(new Set());
  const [filtersExpanded, setFiltersExpanded] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<{
    text: string;
    tone: "success" | "error" | "info";
  } | null>(null);
  const [isFetchingSingle, setIsFetchingSingle] = useState<boolean>(false);
  const [isFetchingBatch, setIsFetchingBatch] = useState<boolean>(false);
  const [isUpdatingTags, setIsUpdatingTags] = useState<boolean>(false);
  const [selectedDocIds, setSelectedDocIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    const fetchSessionStatus = async () => {
      try {
        const res = await fetch("/api/session");
        if (!res.ok) {
          throw new Error("Failed to retrieve session status");
        }
        const data = (await res.json()) as { authenticated: boolean };
        setAuthStatus(data.authenticated ? "authenticated" : "missing");
      } catch {
        setAuthStatus("missing");
      }
    };

    void fetchSessionStatus();
  }, []);

  useEffect(() => {
    if (runSingle) {
      setFiltersExpanded(false);
    }
  }, [runSingle]);

  const handleUnauthorized = (
    message = "Your Readwise token is missing or invalid. Please set it before continuing."
  ) => {
    setAuthStatus("missing");
    setAuthMessage({ text: message, tone: "error" });
    setStatusMessage({ text: message, tone: "error" });
  };

  async function handleTokenSave() {
    const trimmedToken = tokenInput.trim();
    if (!trimmedToken) {
      setAuthMessage({
        text: "Enter a token before saving.",
        tone: "error",
      });
      setStatusMessage({ text: "Enter a token before saving.", tone: "error" });
      return;
    }

    setIsSavingToken(true);
    setAuthMessage(null);
    setStatusMessage({ text: "Saving token…", tone: "info" });

    try {
      const res = await fetch("/api/session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ token: trimmedToken }),
      });

      if (res.status === 204) {
        setAuthStatus("authenticated");
        setTokenInput("");
        setAuthMessage({
          text: "Token saved and validated successfully.",
          tone: "success",
        });
        setStatusMessage({
          text: "Token saved and validated successfully.",
          tone: "success",
        });
        return;
      }

      const data = (await res.json().catch(() => null)) as {
        error?: string;
      } | null;
      throw new Error(
        data?.error ?? `Failed to save token (status ${res.status}).`
      );
    } catch (error) {
      setAuthStatus("missing");
      setAuthMessage({
        text:
          error instanceof Error
            ? error.message
            : "Failed to save token. Please try again.",
        tone: "error",
      });
      setStatusMessage({
        text:
          error instanceof Error
            ? error.message
            : "Failed to save token. Please try again.",
        tone: "error",
      });
    } finally {
      setIsSavingToken(false);
    }
  }

  async function handleTestToken(useEnteredToken: boolean) {
    const trimmedToken = tokenInput.trim();
    if (useEnteredToken && !trimmedToken) {
      setAuthMessage({
        text: "Enter a token to test.",
        tone: "error",
      });
      setStatusMessage({ text: "Enter a token to test.", tone: "error" });
      return;
    }

    setIsTestingToken(true);
    setAuthMessage(null);
    setStatusMessage({ text: "Validating token…", tone: "info" });

    try {
      const init: RequestInit = {
        method: "POST",
      };

      if (useEnteredToken) {
        init.headers = {
          "Content-Type": "application/json",
        };
        init.body = JSON.stringify({ token: trimmedToken });
      }

      const res = await fetch("/api/session/test", init);

      if (res.status === 204) {
        setAuthStatus("authenticated");
        setAuthMessage({
          text: useEnteredToken ? "Token is valid." : "Stored token is valid.",
          tone: "success",
        });
        setStatusMessage({
          text: useEnteredToken
            ? "Token is valid. You're good to go."
            : "Stored token is valid.",
          tone: "success",
        });
        return;
      }

      const data = (await res.json().catch(() => null)) as {
        error?: string;
      } | null;
      throw new Error(
        data?.error ?? `Token validation failed (status ${res.status}).`
      );
    } catch (error) {
      if (!useEnteredToken) {
        setAuthStatus("missing");
      }
      setAuthMessage({
        text:
          error instanceof Error
            ? error.message
            : "Token validation failed. Please try again.",
        tone: "error",
      });
      setStatusMessage({
        text:
          error instanceof Error
            ? error.message
            : "Token validation failed. Please try again.",
        tone: "error",
      });
    } finally {
      setIsTestingToken(false);
    }
  }

  async function handleClearToken() {
    setIsClearingToken(true);
    setAuthMessage(null);
    setStatusMessage({ text: "Clearing stored token…", tone: "info" });

    try {
      const res = await fetch("/api/session", { method: "DELETE" });
      if (!res.ok) {
        throw new Error(`Failed to clear token (status ${res.status}).`);
      }

      setAuthStatus("missing");
      setAuthMessage({
        text: "Stored token removed.",
        tone: "info",
      });
      setStatusMessage({ text: "Stored token removed.", tone: "info" });
    } catch (error) {
      setAuthMessage({
        text:
          error instanceof Error
            ? error.message
            : "Failed to clear token. Please try again.",
        tone: "error",
      });
      setStatusMessage({
        text:
          error instanceof Error
            ? error.message
            : "Failed to clear token. Please try again.",
        tone: "error",
      });
    } finally {
      setIsClearingToken(false);
    }
  }

  const testTokenButtonLabel =
    tokenInput.trim().length > 0 ? "Test entered token" : "Test stored token";

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

  function toggleDocSelection(docId: string) {
    setSelectedDocIds((prev) => {
      const next = new Set(prev);
      if (next.has(docId)) {
        next.delete(docId);
      } else {
        next.add(docId);
      }
      return next;
    });
  }

  function clearDocSelection() {
    setSelectedDocIds(new Set());
  }

  function openSelectedDocs() {
    if (selectedDocIds.size === 0) {
      setStatusMessage({
        text: "Select at least one document with a Readwise URL to open.",
        tone: "error",
      });
      return;
    }

    const docsToOpen = fetchedDocs.filter(({ doc }) =>
      selectedDocIds.has(doc.id)
    );

    if (docsToOpen.length === 0) {
      setStatusMessage({
        text: "Selected documents are no longer in the list. Refresh and select again.",
        tone: "error",
      });
      clearDocSelection();
      return;
    }

    const docsWithUrl = docsToOpen.filter(({ doc }) => Boolean(doc.url));

    if (docsWithUrl.length === 0) {
      setStatusMessage({
        text: "None of the selected documents include a Readwise link to open.",
        tone: "error",
      });
      return;
    }

    docsWithUrl.forEach(({ doc }) => {
      if (doc.url) {
        window.open(doc.url, "_blank", "noopener");
      }
    });

    const skipped = docsToOpen.length - docsWithUrl.length;
    setStatusMessage({
      text:
        `Opening ${docsWithUrl.length} document${
          docsWithUrl.length > 1 ? "s" : ""
        } in new tabs.` +
        (skipped > 0
          ? ` ${skipped} selection${
              skipped > 1 ? "s" : ""
            } skipped—no URL available.`
          : ""),
      tone: "success",
    });
  }

  async function handleFetchSingle() {
    const trimmedId = documentId.trim();
    if (!trimmedId) {
      setStatusMessage({
        text: "Enter a document ID before fetching.",
        tone: "error",
      });
      return;
    }
    setIsFetchingSingle(true);
    setStatusMessage({ text: "Fetching document…", tone: "info" });
    try {
      const url = new URL("/api/fetch/" + trimmedId, location.href);
      const res = await fetch(url);

      if (res.status === 401) {
        handleUnauthorized(
          "Please set a valid Readwise access token before fetching documents."
        );
        return;
      }

      if (!res.ok) {
        throw new Error(`Failed to fetch document (status ${res.status}).`);
      }

      const data = (await res.json()) as {
        doc: ReadwiseItem;
        tags: string[];
      };
      setSampleText(data.doc?.summary || "");
      data.tags.sort((a, b) => a.localeCompare(b));
      setExtractedTags(data.tags);

      const tags = data.doc ? Object.keys(data.doc.tags) : [];

      tags.sort((a, b) => a.localeCompare(b));
      setDocumentTags(tags);

      const tagSet = new Set(tags);
      data.tags.forEach((t) => tagSet.add(t));

      setSelectedTags(tagSet);
      if (data.doc) {
        setActiveDocId(data.doc.id);
        setActiveDocUrl(data.doc.url ?? null);
      } else {
        setActiveDocId(null);
        setActiveDocUrl(null);
      }
      setStatusMessage({
        text: data.doc
          ? "Document loaded. Review the summary and tag differences."
          : "No document found, but extracted tags are available below.",
        tone: data.doc ? "success" : "info",
      });
    } catch (error) {
      console.error(error);
      setAuthMessage({
        text:
          error instanceof Error ? error.message : "Failed to fetch document.",
        tone: "error",
      });
      setStatusMessage({
        text:
          error instanceof Error ? error.message : "Failed to fetch document.",
        tone: "error",
      });
    } finally {
      setIsFetchingSingle(false);
    }
  }

  async function updateDocumentTags() {
    const idToUpdate = activeDocId ?? documentId;
    if (!idToUpdate) {
      setStatusMessage({
        text: "Select a document (or enter its ID) before applying tag updates.",
        tone: "error",
      });
      return;
    }
    setIsUpdatingTags(true);
    setStatusMessage({ text: "Applying tag updates…", tone: "info" });
    try {
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

      if (res.status === 401) {
        handleUnauthorized(
          "Please set a valid Readwise access token before updating tags."
        );
        return;
      }

      if (!res.ok) {
        throw new Error(`Failed to update document (status ${res.status}).`);
      }
      setStatusMessage({
        text: "Tags saved to Readwise.",
        tone: "success",
      });
    } catch (error) {
      console.error(error);
      setAuthMessage({
        text:
          error instanceof Error
            ? error.message
            : "Failed to update document tags.",
        tone: "error",
      });
      setStatusMessage({
        text:
          error instanceof Error
            ? error.message
            : "Failed to update document tags.",
        tone: "error",
      });
    } finally {
      setIsUpdatingTags(false);
    }
  }

  async function handleFetchBatch() {
    setIsFetchingBatch(true);
    setStatusMessage({ text: "Fetching documents…", tone: "info" });
    try {
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

      if (res.status === 401) {
        handleUnauthorized(
          "Please set a valid Readwise access token before fetching documents."
        );
        return;
      }

      if (!res.ok) {
        throw new Error(`Failed to fetch documents (status ${res.status}).`);
      }

      const data = (await res.json()) as {
        doc: ReadwiseItem;
        tags: string[];
      }[];
      setFetchedDocs(data);
      clearDocSelection();
      if (data.length > 0) {
        const firstWithDoc = data.find((entry) => entry.doc);
        if (firstWithDoc?.doc) {
          loadDocIntoPane(firstWithDoc.doc, firstWithDoc.tags);
          setStatusMessage({
            text: `Fetched ${data.length} document${
              data.length > 1 ? "s" : ""
            }. Loaded “${
              firstWithDoc.doc.title ?? "first document"
            }” for review.`,
            tone: "success",
          });
        } else {
          setStatusMessage({
            text: `Fetched ${data.length} document${
              data.length > 1 ? "s" : ""
            }, but none contained document details. Please try again.`,
            tone: "error",
          });
        }
      } else {
        setStatusMessage({
          text: "No documents matched those filters. Try adjusting and fetch again.",
          tone: "info",
        });
      }
    } catch (error) {
      console.error(error);
      setAuthMessage({
        text:
          error instanceof Error ? error.message : "Failed to fetch documents.",
        tone: "error",
      });
      setStatusMessage({
        text:
          error instanceof Error ? error.message : "Failed to fetch documents.",
        tone: "error",
      });
    } finally {
      setIsFetchingBatch(false);
    }
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

  const cursorIsSet = Boolean(cursor && cursor.trim());
  const filterCount =
    locations.length + categories.length + (cursorIsSet ? 1 : 0);
  const filterButtonLabel =
    filterCount > 0 ? `Adjust filters (${filterCount})` : "Adjust filters";
  const locationSummary = locations.join(", ");
  const categorySummary = categories.join(", ");

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-pink-50 to-yellow-50 text-gray-900 font-sans">
      <div className="max-w-6xl mx-auto flex flex-col gap-5 px-4 py-6 lg:gap-6">
        <header className="flex items-center justify-between rounded-2xl border border-white/60 bg-white/90 p-4 shadow-sm backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500 text-base font-semibold text-white shadow">
              RW
            </div>
            <div>
              <h1 className="text-lg font-semibold text-gray-900 lg:text-xl">
                Readwise Tags Mapper
              </h1>
              <p className="text-xs text-gray-500 lg:text-sm">
                Authenticate, fetch documents, and curate tags from one tidy
                surface.
              </p>
            </div>
          </div>
          <span
            className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-[11px] font-semibold transition ${
              authStatus === "authenticated"
                ? "bg-emerald-100 text-emerald-700"
                : authStatus === "missing"
                ? "bg-rose-100 text-rose-700"
                : "bg-gray-100 text-gray-600"
            }`}
          >
            <span className="flex h-1.5 w-1.5 rounded-full bg-current" />
            {authStatus === "authenticated"
              ? "Token active"
              : authStatus === "missing"
              ? "Token required"
              : "Status unknown"}
          </span>
        </header>

        <div className="grid gap-4 lg:grid-cols-[minmax(0,0.6fr)_minmax(0,0.4fr)] xl:grid-cols-[minmax(0,0.55fr)_minmax(0,0.45fr)]">
          <section
            className={`relative overflow-hidden rounded-2xl border border-white/70 p-5 shadow-sm backdrop-blur-sm ${
              authStatus === "authenticated"
                ? "bg-gradient-to-br from-emerald-50 via-white to-white"
                : "bg-gradient-to-br from-rose-50 via-white to-white"
            }`}
          >
            <div className="pointer-events-none absolute -right-10 -top-12 h-32 w-32 rounded-full bg-gradient-to-br from-indigo-200/50 to-purple-200/40 blur-3xl" />
            <div className="relative flex flex-col gap-4">
              <div>
                <h2 className="text-base font-semibold text-gray-900 lg:text-lg">
                  Enter your Readwise access token
                </h2>
                <p className="mt-1 text-xs text-gray-600 lg:text-sm">
                  Validate instantly and manage the credential whenever you
                  need.
                </p>
                <a
                  href="https://readwise.io/access_token"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-1 inline-block text-xs text-indigo-600 underline hover:text-indigo-800"
                >
                  Get your access token
                </a>
              </div>

              <label className="flex-1">
                <span className="block text-[11px] uppercase tracking-wide text-gray-500">
                  Access token
                </span>
                <input
                  type="password"
                  value={tokenInput}
                  onChange={(e) => setTokenInput(e.target.value)}
                  placeholder="Enter your Readwise access token"
                  autoComplete="off"
                  className="mt-1 w-full rounded-2xl border border-gray-200 bg-white/95 px-4 py-2 text-sm shadow-inner focus:outline-none focus:ring-4 focus:ring-indigo-200"
                />
              </label>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={handleTokenSave}
                  disabled={isSavingToken || tokenInput.trim().length === 0}
                  className="inline-flex items-center justify-center rounded-2xl bg-gradient-to-r from-indigo-500 to-purple-600 px-4 py-2 text-xs font-semibold text-white shadow-md transition hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSavingToken ? "Saving…" : "Save token"}
                </button>
                <button
                  type="button"
                  onClick={() => handleTestToken(tokenInput.trim().length > 0)}
                  disabled={isTestingToken}
                  className="inline-flex items-center justify-center rounded-2xl border border-indigo-200 px-4 py-2 text-xs font-semibold text-indigo-600 shadow-sm transition hover:border-indigo-300 hover:bg-indigo-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isTestingToken ? "Testing…" : testTokenButtonLabel}
                </button>
                <button
                  type="button"
                  onClick={handleClearToken}
                  disabled={isClearingToken || authStatus !== "authenticated"}
                  className="inline-flex items-center justify-center rounded-2xl border border-rose-200 px-4 py-2 text-xs font-semibold text-rose-600 transition hover:border-rose-300 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isClearingToken ? "Clearing…" : "Clear token"}
                </button>
              </div>

              {authMessage && (
                <p
                  className={`text-xs ${
                    authMessage.tone === "success"
                      ? "text-emerald-600"
                      : authMessage.tone === "error"
                      ? "text-rose-600"
                      : "text-gray-600"
                  }`}
                >
                  {authMessage.text}
                </p>
              )}
            </div>
          </section>

          <section className="rounded-2xl border border-white/70 bg-white/90 p-5 shadow-sm backdrop-blur-sm flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-semibold text-gray-900 lg:text-lg">
                  Workflow controls
                </h2>
                <div className="flex items-center gap-1 rounded-full bg-gray-100 p-1">
                  <label
                    className={`cursor-pointer rounded-full px-3 py-1 text-xs font-medium transition ${
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
                    className={`cursor-pointer rounded-full px-3 py-1 text-xs font-medium transition ${
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
              </div>
              <p className="text-xs text-gray-500 lg:text-sm">
                Switch once and keep filters tucked away until you need to tweak
                them again.
              </p>
            </div>

            {runSingle ? (
              <div className="flex flex-col gap-3">
                <label className="flex-1">
                  <span className="block text-[11px] uppercase tracking-wide text-gray-500">
                    Document ID
                  </span>
                  <input
                    value={documentId}
                    onChange={(e) => setDocumentId(e.target.value)}
                    placeholder="Document ID (e.g. d_123456)"
                    className="mt-1 w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-2 text-sm focus:outline-none focus:ring-4 focus:ring-indigo-200"
                  />
                </label>
                <button
                  onClick={handleFetchSingle}
                  disabled={isFetchingSingle}
                  className="inline-flex items-center justify-center rounded-2xl bg-gradient-to-r from-indigo-500 to-purple-600 px-4 py-2 text-sm font-semibold text-white shadow-md transition hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {isFetchingSingle ? "Fetching…" : "Fetch document"}
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                <div className="flex flex-wrap items-center gap-2 text-[11px] text-gray-500">
                  <span className="inline-flex items-center gap-1 rounded-full border border-gray-200 bg-gray-50 px-3 py-1 font-medium text-gray-600">
                    Locations: {locationSummary}
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full border border-gray-200 bg-gray-50 px-3 py-1 font-medium text-gray-600">
                    Categories: {categorySummary}
                  </span>
                  {cursorIsSet && (
                    <span className="inline-flex items-center gap-1 rounded-full border border-gray-200 bg-gray-50 px-3 py-1 font-medium text-gray-600">
                      Cursor set
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setFiltersExpanded((prev) => !prev)}
                  className="inline-flex items-center justify-center self-start rounded-full border border-indigo-200 px-4 py-2 text-xs font-semibold text-indigo-600 transition hover:border-indigo-300 hover:bg-indigo-50"
                >
                  {filtersExpanded ? "Hide filters" : filterButtonLabel}
                </button>

                {filtersExpanded && (
                  <div className="rounded-2xl border border-gray-200 bg-gray-50/70 p-4 space-y-4">
                    <div className="space-y-2">
                      <span className="block text-[11px] uppercase tracking-wide text-gray-500">
                        Locations
                      </span>
                      <div className="flex flex-wrap gap-2">
                        {Object.keys(locationEnum.enum).map((loc) => (
                          <button
                            key={loc}
                            onClick={() => toggleLocation(loc)}
                            className={`rounded-full border px-3 py-1.5 text-xs capitalize transition ${
                              locations.includes(loc)
                                ? "bg-teal-500 text-white border-teal-600 shadow"
                                : "border-gray-200 bg-white text-gray-700 hover:border-teal-300"
                            }`}
                          >
                            {loc}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <span className="block text-[11px] uppercase tracking-wide text-gray-500">
                        Categories
                      </span>
                      <div className="flex flex-wrap gap-2">
                        {Object.keys(categoryEnum.enum).map((cat) => (
                          <button
                            key={cat}
                            onClick={() => toggleCategory(cat)}
                            className={`rounded-full border px-3 py-1.5 text-xs capitalize transition ${
                              categories.includes(cat)
                                ? "bg-pink-500 text-white border-pink-600 shadow"
                                : "border-gray-200 bg-white text-gray-700 hover:border-pink-300"
                            }`}
                          >
                            {cat}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <span className="block text-[11px] uppercase tracking-wide text-gray-500">
                        Cursor (optional)
                      </span>
                      <input
                        type="text"
                        value={cursor ?? ""}
                        onChange={(e) => setCursor(e.target.value)}
                        placeholder="Cursor"
                        className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-2 text-sm focus:outline-none focus:ring-4 focus:ring-pink-200"
                      />
                    </div>
                  </div>
                )}

                <button
                  onClick={handleFetchBatch}
                  disabled={isFetchingBatch}
                  className="inline-flex items-center justify-center rounded-2xl bg-gradient-to-r from-pink-500 to-orange-400 px-4 py-2 text-sm font-semibold text-white shadow-md transition hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {isFetchingBatch ? "Fetching…" : "Fetch documents"}
                </button>
              </div>
            )}
          </section>
        </div>

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
              <div className="flex flex-col items-end gap-1 text-[11px] font-medium">
                <span className="inline-flex w-max items-center gap-1 rounded-full bg-indigo-100 px-2 py-1 text-indigo-700">
                  {fetchedDocs.length} total
                </span>
                {selectedDocIds.size > 0 && (
                  <button
                    type="button"
                    onClick={clearDocSelection}
                    className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-1 text-emerald-700 transition hover:border-emerald-300 hover:bg-emerald-100"
                  >
                    {selectedDocIds.size} selected · clear
                  </button>
                )}
              </div>
            </div>

            <button
              type="button"
              onClick={openSelectedDocs}
              disabled={selectedDocIds.size === 0}
              className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-indigo-200 bg-white px-3 py-2 text-sm font-semibold text-indigo-600 shadow-sm transition hover:border-indigo-300 hover:bg-indigo-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Open selected in Readwise
              {selectedDocIds.size > 0 && (
                <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-semibold text-indigo-700">
                  {selectedDocIds.size}
                </span>
              )}
            </button>

            <div className="max-h-[70vh] overflow-y-auto space-y-3 pr-1 pb-24">
              {fetchedDocs.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-indigo-200 bg-indigo-50/60 p-6 text-center text-sm text-indigo-500">
                  No documents yet. Run a fetch to populate this list.
                </div>
              ) : (
                fetchedDocs.map(({ doc, tags: docTags }) => {
                  const existing = doc?.tags
                    ? Object.keys(doc.tags).sort((a, b) => a.localeCompare(b))
                    : [];
                  const extracted = (docTags ?? [])
                    .slice()
                    .sort((a, b) => a.localeCompare(b));
                  const existingSet = new Set(existing);
                  const extractedSet = new Set(extracted);
                  const suggestedTags = extracted.filter(
                    (t) => !existingSet.has(t)
                  );
                  const overlapTags = extracted.filter((t) =>
                    existingSet.has(t)
                  );

                  const isActive =
                    activeDocId === doc.id || documentId === doc.id;
                  const isSelected = selectedDocIds.has(doc.id);
                  const hasDiff =
                    extractedSet.size == 0 || suggestedTags.length > 0;
                  const cardHighlight = isActive
                    ? "border-indigo-300 bg-indigo-50/80 shadow-lg"
                    : isSelected
                    ? "border-emerald-400 bg-emerald-50/80 shadow-lg"
                    : hasDiff
                    ? "border-amber-300 bg-amber-50/70 hover:border-amber-400 hover:bg-amber-100"
                    : "border-gray-200 bg-white hover:border-indigo-200 hover:shadow-md";

                  return (
                    <button
                      key={doc.id}
                      type="button"
                      onClick={() => loadDocIntoPane(doc, docTags)}
                      className={`w-full rounded-2xl border p-4 text-left transition ${cardHighlight}`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <span className="text-sm font-semibold text-gray-800 transition hover:text-indigo-600">
                            {doc.title ?? "(no title)"}
                          </span>
                          <div className="mt-1 text-[11px] text-gray-500 break-all line-clamp-2">
                            {doc.url}
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-1 text-[11px] font-semibold">
                          {hasDiff ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-1 text-amber-700">
                              Δ {suggestedTags.length} tags
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-1 text-emerald-700">
                              Tags aligned
                            </span>
                          )}
                          {extracted.length > 0 && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-indigo-100 px-2 py-1 text-indigo-700">
                              {extracted.length} suggestions
                            </span>
                          )}
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              event.preventDefault();
                              toggleDocSelection(doc.id);
                            }}
                            className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 transition text-[11px] ${
                              isSelected
                                ? "border-emerald-400 bg-emerald-100 text-emerald-700"
                                : "border-gray-200 bg-white text-gray-600 hover:border-indigo-200"
                            }`}
                          >
                            <span className="text-lg leading-none">
                              {isSelected ? "✓" : "+"}
                            </span>
                            {isSelected ? "Added" : "Add"}
                          </button>
                        </div>
                      </div>

                      <div className="mt-3 flex flex-col gap-2">
                        {suggestedTags.length > 0 && (
                          <div>
                            <span className="text-[11px] font-semibold uppercase tracking-wide text-amber-700">
                              Suggested additions
                            </span>
                            <div className="mt-1 flex flex-wrap gap-1.5">
                              {suggestedTags.slice(0, 5).map((t) => (
                                <span
                                  key={`suggest-${doc.id}-${t}`}
                                  className="rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-medium text-amber-700"
                                >
                                  +{t}
                                </span>
                              ))}
                              {suggestedTags.length > 5 && (
                                <span className="rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-medium text-amber-700">
                                  +{suggestedTags.length - 5} more
                                </span>
                              )}
                            </div>
                          </div>
                        )}

                        {overlapTags.length > 0 && (
                          <div>
                            <span className="text-[11px] font-semibold uppercase tracking-wide text-indigo-600">
                              Shared tags
                            </span>
                            <div className="mt-1 flex flex-wrap gap-1.5">
                              {overlapTags.slice(0, 4).map((t) => (
                                <span
                                  key={`overlap-${doc.id}-${t}`}
                                  className="rounded-full bg-indigo-50 px-2.5 py-1 text-[11px] font-medium text-indigo-700"
                                >
                                  #{t}
                                </span>
                              ))}
                              {overlapTags.length > 4 && (
                                <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-[11px] font-medium text-indigo-700">
                                  +{overlapTags.length - 4} more
                                </span>
                              )}
                            </div>
                          </div>
                        )}

                        {extracted.length === 0 && existing.length === 0 && (
                          <span className="rounded-full border border-indigo-100 bg-indigo-50 px-2.5 py-1 text-[11px] font-medium text-indigo-700">
                            No tags yet
                          </span>
                        )}
                      </div>
                    </button>
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
                disabled={isUpdatingTags}
                className="w-full rounded-2xl bg-gradient-to-r from-green-400 to-teal-500 px-5 py-3 text-base font-semibold text-white shadow-xl transition hover:shadow-2xl disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isUpdatingTags ? "Saving tags…" : "Apply tag updates"}
              </button>
            </div>
          </section>
        </div>
      </div>
      {statusMessage && (
        <div className="pointer-events-none fixed inset-x-0 top-5 z-50 flex justify-center px-4">
          <div
            role={statusMessage.tone === "error" ? "alert" : "status"}
            className={`pointer-events-auto flex w-full max-w-md items-start gap-3 rounded-2xl border px-5 py-4 text-sm shadow-xl transition lg:text-base ${
              statusMessage.tone === "success"
                ? "border-emerald-100 bg-emerald-50 text-emerald-700"
                : statusMessage.tone === "error"
                ? "border-rose-100 bg-rose-50 text-rose-700"
                : "border-indigo-100 bg-indigo-50 text-indigo-700"
            }`}
          >
            <span
              className={`mt-1 inline-flex h-2.5 w-2.5 flex-shrink-0 rounded-full ${
                statusMessage.tone === "success"
                  ? "bg-emerald-500"
                  : statusMessage.tone === "error"
                  ? "bg-rose-500"
                  : "bg-indigo-500"
              }`}
            />
            <span className="flex-1 leading-snug">{statusMessage.text}</span>
            <button
              type="button"
              onClick={() => setStatusMessage(null)}
              className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-transparent text-xs font-semibold text-current transition hover:border-current hover:bg-white/20"
            >
              <span className="sr-only">Dismiss message</span>×
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
