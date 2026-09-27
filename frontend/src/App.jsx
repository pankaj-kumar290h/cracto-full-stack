import { Routes, Route } from "react-router-dom";
import ReleaseListPage from "./pages/ReleaseListPage.jsx";
import ReleasePage from "./pages/ReleasePage.jsx";
import "./App.css";

export default function App() {
  return (
    <div className="app">
      <header>
        <h1>ReleaseCheck</h1>
        <p className="subtitle">Your all-in-one release checklist tool</p>
      </header>

      <main>
        <Routes>
          <Route path="/" element={<ReleaseListPage />} />
          <Route path="/releases/:id" element={<ReleasePage />} />
        </Routes>
      </main>
    </div>
  );
}
