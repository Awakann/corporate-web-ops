import { useState } from "react";

function DraftEditor({ page, onSaved, onCancel }) {
  const [content, setContent] = useState(page.content ?? "");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event) {
    event.preventDefault();
    setIsSaving(true);
    setError("");

    try {
      const response = await fetch(`/api/admin/pages/${page._id}`, {
        method: "PATCH",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Could not save changes");
      }

      onSaved(data.page);
    } catch (error) {
      setError(error.message);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <form className="draft-editor" onSubmit={handleSubmit}>
      <label htmlFor={`content-${page._id}`}>Edit content</label>

      <textarea
        id={`content-${page._id}`}
        value={content}
        onChange={(event) => setContent(event.target.value)}
        disabled={isSaving}
        rows={6}
        required
      />

      <div className="draft-actions">
        <button
          type="submit"
          disabled={isSaving || !content.trim()}
        >
          {isSaving ? "Saving…" : "Save changes"}
        </button>

        <button
          type="button"
          className="button-secondary"
          onClick={onCancel}
          disabled={isSaving}
        >
          Cancel
        </button>
      </div>

      {error && <p role="alert">{error}</p>}
    </form>
  );
}

export default DraftEditor;