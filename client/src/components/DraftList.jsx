import { useEffect, useState } from "react";
import DraftEditor from "./DraftEditor";

function DraftList({ refreshVersion, userRole, onPublished }) {

  const [pages, setPages] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [editingId, setEditingId] = useState(null);
  const canEdit = ["admin", "editor"].includes(userRole);
  const [publishTarget, setPublishTarget] = useState(null);
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishError, setPublishError] = useState("");
  const [notice, setNotice] = useState("");

  const canPublish = ["admin", "reviewer"].includes(userRole);


  useEffect(() => {
    let active = true;

    async function loadDrafts() {

        setIsLoading(true);
        setError("");

      try {
        const response = await fetch("/api/admin/pages", {
          credentials: "same-origin",
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Could not load drafts");
        }

        if (active) {
          setPages(data.pages);
        }
      } catch (error) {
        if (active) {
          setError(error.message);
        }
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    }

    loadDrafts();

    return () => {
      active = false;
    };
  }, [refreshVersion]);


  async function handlePublish() {
  if (!publishTarget || isPublishing) return;

  const page = publishTarget;
  setIsPublishing(true);
  setPublishError("");
  setNotice("");

  try {
    const response = await fetch(
      `/api/admin/pages/${page._id}/publish`,
      {
        method: "PATCH",
        credentials: "same-origin",
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Could not publish page");
    }

    setPages((current) =>
      current.filter((item) => item._id !== page._id)
    );
    setPublishTarget(null);
    setNotice(`"${page.title}" is now published.`);
    onPublished();
  } catch (error) {
    setPublishError(error.message);
  } finally {
    setIsPublishing(false);
  }
}


  if (isLoading) {
    return <p role="status">Loading drafts…</p>;
  }

  if (error) {
    return <p role="alert">{error}</p>;
  }

  return (
    <section className="draft-list">
      <h2>Draft pages</h2>

      <p className="panel-description">
        Review your drafts, refine the content, and publish when ready.
        </p>

    {notice && <p role="status">{notice}</p>}

   {publishTarget && (
    <div className="publish-confirmation">
        <h3>Publish “{publishTarget.title}”?</h3>
        <p>The current content will become publicly visible.</p>

        <div className="draft-actions">
        <button
            type="button"
            onClick={handlePublish}
            disabled={isPublishing}
        >
            {isPublishing ? "Publishing…" : "Confirm publish"}
        </button>

        <button
            type="button"
            className="button-secondary"
            disabled={isPublishing}
            onClick={() => {
            setPublishTarget(null);
            setPublishError("");
            }}
        >
            Cancel
        </button>
        </div>

        {publishError && <p role="alert">{publishError}</p>}
    </div>
)}

      {pages.length === 0 ? (
        <p>No drafts yet.</p>
      ) : (
        <ul>
          {pages.map((page) => (
            <li key={page._id}>
              <h3>{page.title}</h3>
              <p>/{page.slug}</p>
              <p>{page.content}</p>

            {canEdit && editingId === page._id && (
            <DraftEditor
                page={page}
                onCancel={() => setEditingId(null)}
                onSaved={(updatedPage) => {
                setPages((current) =>
                    current.map((item) =>
                    item._id === updatedPage._id ? updatedPage : item
                    )
                );
                setEditingId(null);
                }}
            />
            )}

            {canEdit && editingId !== page._id && (
            <button
                type="button"
                className="button-secondary"
                onClick={() => setEditingId(page._id)}
                disabled={editingId !== null || publishTarget !== null}
            >
                Edit content
            </button>
        )}

        {canPublish && (
    <button
        type="button"
        className="publish-button"
        disabled={editingId !== null || publishTarget !== null}
        onClick={() => {
        setPublishTarget(page);
        setPublishError("");
        setNotice("");
        }}
    >
        Publish
    </button>
)}

            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export default DraftList;