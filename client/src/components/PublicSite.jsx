import { useEffect, useState } from "react";
import { Link } from "react-router";

function PublicSite() {
  const [pages, setPages] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function loadPages() {
      try {
        const response = await fetch("/api/pages", {
          credentials: "omit",
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Could not load pages");
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

    loadPages();

    return () => {
      active = false;
    };
  }, []);

  return (
    <main className="public-site">
      <header className="public-header">
        <div>
          <p className="eyebrow">Corporate Web Ops</p>
          <h1>Published pages</h1>
          <p>The latest content from our team.</p>
        </div>

        <Link to="/" className="text-link">
          Staff portal →
        </Link>
      </header>

      {isLoading && <p role="status">Loading pages…</p>}
      {error && <p role="alert">{error}</p>}

      {!isLoading && !error && pages.length === 0 && (
        <p>No pages have been published yet.</p>
      )}

      {!isLoading && !error && (
        <div className="public-pages">
          {pages.map((page) => (
            <article className="public-page" key={page._id}>
             <h2>
            <Link to={`/site/${encodeURIComponent(page.slug)}`}>
                {page.title}
            </Link>
            </h2>

            {page.content && (
            <p className="page-excerpt">
                {page.content.length > 160
                ? `${page.content.slice(0, 160)}…`
                : page.content}
            </p>
            )}
            </article>
          ))}
        </div>
      )}
    </main>
  );
}

export default PublicSite;