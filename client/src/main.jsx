import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router'
import './index.css'
import App from './App.jsx'
import PublicSite from './components/PublicSite.jsx'
import PublicPage from './components/PublicPage.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/site" element={<PublicSite />} />
        <Route path="/site/:slug" element={<PublicPage />} />
        <Route path="*" element={<main className="public-site">
            <h1> Page not found </h1>
            <a href="/site"> Go to public pages </a>
        </main>}/>
      </Routes>
    </BrowserRouter>

  </StrictMode>,
)
