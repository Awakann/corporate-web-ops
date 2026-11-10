import { useEffect, useState } from "react";

export default function PublishedList({ refreshVersion, onUnpublished }) {
  const [pages, setPages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    const controller = new AbortController();

    async function loadPages() {
      setLoading(true);
      setError("");

      try {
        const response = await fetch("/api/pages", {
          signal: controller.signal,
        });
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Could not load published pages.");
        }
        if (!controller.signal.aborted) setPages(data.pages);
      } catch (error) {
        if (!controller.signal.aborted) setError(error.message);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    loadPages();
    return () => controller.abort();
  }, [refreshVersion]);

  async function unpublish(page) {
    if (busy || !window.confirm(`Move “${page.title}” back to drafts?`)) {
      return;
    }

    setBusy(true);
    setError("");
    setNotice("");

    try {
      const response = await fetch(`/api/admin/pages/${page._id}/unpublish`, {
        method: "PATCH",
        credentials: "same-origin",
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Could not unpublish the page.");
      }

      setPages((current) => current.filter((item) => item._id !== page._id));
      setNotice(`“${page.title}” moved back to drafts.`);
      onUnpublished();
    } catch (error) {
      setError(error.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="draft-list">
      <h2>Published pages</h2>
      {notice && <p role="status">{notice}</p>}
      {error && <p role="alert">{error}</p>}
      {loading && <p role="status">Loading published pages…</p>}
      {!loading && !error && pages.length === 0 && <p>No published pages yet.</p>}
      {!loading && pages.length > 0 && (
        <ul>
          {pages.map((page) => (
            <li key={page._id}>
              <h3>{page.title}</h3>
              <button type="button" disabled={busy} onClick={() => unpublish(page)}>
                Unpublish
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}