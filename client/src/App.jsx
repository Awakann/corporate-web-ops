import { useState, useEffect } from 'react'
import './App.css'
import DraftList from "./components/DraftList.jsx";
import CreateDraftForm from './components/CreateDraftForm'
import { Link } from 'react-router'
import PublishedList from './components/PublishedList.jsx'

function App() {

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [user, setUser] = useState(null);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const [draftVersion, setDraftVersion] = useState(0);


  useEffect(() => {
  let active = true;

  async function checkSession() {
    try {
      const response = await fetch("/api/auth/me", {
        credentials: "same-origin",
      });

      // A signed-out visitor is expected to receive 401.
      if (response.status === 401) {
        return;
      }

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Could not check your session");
      }

      if (active) {
        setUser(data.user);
      }
    } catch (error) {
      if (active) {
        setError(error.message);
      }
    } finally {
      if (active) {
        setIsCheckingSession(false);
      }
    }
  }

  checkSession();

  return () => {
    active = false;
  };
}, []);


  async function handleSubmit(event) {
  event.preventDefault();

  const form = event.currentTarget;
  const formData = new FormData(form);

  setIsSubmitting(true);
  setError("");
  setMessage("");

  try {
    const response = await fetch("/api/auth/login", {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: formData.get("email"),
        password: formData.get("password"),
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Could not sign in");
    }

    const accountResponse = await fetch("/api/auth/me", {
      credentials: "same-origin",
    });

    const accountData = await accountResponse.json();

    if (!accountResponse.ok) {
      throw new Error(accountData.error || "Could not load your account");
    }
    setUser(accountData.user);

    setMessage(data.message || "Login successful");
    form.reset();
  } catch (error) {
    setError(error.message);
  } finally {
    setIsSubmitting(false);
  }
}

  async function handleLogout() {
  setIsLoggingOut(true);
  setError("");

  try {
    const response = await fetch("/api/auth/logout", {
      method: "POST",
      credentials: "same-origin",
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Could not sign out");
    }

    setUser(null);
    setMessage("You have signed out.");
  } catch (error) {
    setError(error.message);
  } finally {
    setIsLoggingOut(false);
  }
}

  if (isCheckingSession) {
    return <p role="status">Checking your session…</p>;
  }

 
 if (user) {
    return (
      <main className="dashboard">
        <header>
          <p>Corporate Web Ops</p>
          <h1>Welcome, {user.name}</h1>
          <p>
            {user.email} · {user.role}
          </p>
          <button type="button" onClick={handleLogout} disabled={isLoggingOut}>  {isLoggingOut ? "Signing out..." : "Sign out" }   </button>

          <Link
            to="/site"
            target="_blank"
            rel="noopener noreferrer"
            className="dashboard-site-link"
>
            View published website ↗
          </Link>

          {error && <p role="alert">{error}</p>}
        </header>

        <section>
            <div className="workspace-grid">
                {["admin", "editor"].includes(user.role) && (
                    <CreateDraftForm
                      onCreated={() => setDraftVersion((version) => version + 1)}
                    />
                  )}

                  <DraftList  
                    refreshVersion={draftVersion}
                    userRole={user.role}
                    onPublished={() => setDraftVersion((version) => version + 1)}
                  />

                  {["admin", "reviewer"].includes(user.role) && (
                    <PublishedList
                      refreshVersion={draftVersion}
                      onUnpublished={() => setDraftVersion((version) => version + 1)}
                    />
                  )}
                </div>
        </section>
              </main>
            );
          }


  return (
    <main className="login-page">

      <section className="login-card">
        <h1>Corporate Web Ops</h1>
        <p>Sign in to manage website content.</p>

        <form onSubmit={handleSubmit}>

          <label htmlFor="email"> Email address </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="username"
            required
          />

          <label htmlFor="password"> Password </label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
          />

          <button type="submit" disabled={isSubmitting}> {isSubmitting ? "Signing in..." : "Sign in" } </button>

        </form>

        {error && <p role="alert">{error}</p>}
        {message && <p role="status">{message}</p>}

      </section>

    </main>
  )
}

export default App
