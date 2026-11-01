import { useEffect, useState } from "react";
import { Link, useParams } from "react-router";

function PublicPage() {
  const { slug } = useParams();
  const [page, setPage] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function loadPage() {
      setIsLoading(true);
      setError("");
      setPage(null);

      try {
        const response = await fetch(
          `/api/pages/${encodeURIComponent(slug)}`,
          { credentials: "omit" }
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Could not load page");
        }

        if (active) {
          setPage(data.page);
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

    loadPage();

    return () => {
      active = false;
    };
  }, [slug]);

  return (
    <main className="public-site">
      <nav className="page-navigation" aria-label="Page navigation">
        <Link to="/site" className="text-link">
          ← All published pages
        </Link>
      </nav>

      {isLoading && <p role="status">Loading page…</p>}
      {error && <p role="alert">{error}</p>}

      {!isLoading && !error && page && (
        <article className="public-page">
          <p className="eyebrow">Corporate Web Ops</p>
          <h1>{page.title}</h1>
          <div className="page-content">{page.content}</div>
        </article>
      )}
    </main>
  );
}

export default PublicPage;