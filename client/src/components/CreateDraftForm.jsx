import { useState } from "react";

function CreateDraftForm({ onCreated }) {
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function handleSubmit(event) {
    event.preventDefault();

    const form = event.currentTarget;
    const fields = new FormData(form);

    setIsSaving(true);
    setError("");
    setMessage("");

    try {
      const response = await fetch("/api/pages", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: fields.get("title").trim(),
          slug: fields.get("slug").trim(),
          content: fields.get("content"),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Could not create draft");
      }

      form.reset();
      setMessage("Draft created.");
      onCreated();
    } catch (error) {
      setError(error.message);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <section className="create-draft">
      <h2>Create a draft</h2>

         <p className="panel-description">
            Prepare your content here. It stays private until published.
        </p>

      <form onSubmit={handleSubmit}>
        <label htmlFor="draft-title">Title</label>
        <input id="draft-title" name="title" required />

        <label htmlFor="draft-slug">URL slug</label>
        <input
          id="draft-slug"
          name="slug"
          placeholder="company-news"
          pattern="[a-z0-9]+(-[a-z0-9]+)*"
          title="Use lowercase letters, numbers, and single hyphens between words."
          required
        />

        <label htmlFor="draft-content">Content</label>
        <textarea id="draft-content" name="content" rows={6} />

        <button type="submit" disabled={isSaving}>
          {isSaving ? "Saving…" : "Save draft"}
        </button>
      </form>

      {error && <p role="alert">{error}</p>}
      {message && <p role="status">{message}</p>}
    </section>
  );
}

export default CreateDraftForm;