import { BrowserRouter, Routes, Route, Link } from "react-router-dom";
import Fantasy from "./Pages/Fantasy";
import TeamPage from "./Pages/TeamPage";
import Scoreboard from "./Pages/Scoreboard";
import Home from "./Pages/Home";
import { useEffect, useState, useRef } from "react";
import "./App.css";

export default function App() {
  const [teams, setTeams] = useState<{ id: string; name: string }[]>([]);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const dropdownRef = useRef<HTMLLIElement>(null);

  useEffect(() => {
    const stored = localStorage.getItem("teams");
    if (stored) setTeams(JSON.parse(stored));
  }, []);

  // Close dropdown if clicked outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Close mobile menu when resizing to desktop
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth > 768 && mobileMenuOpen) setMobileMenuOpen(false);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [mobileMenuOpen]);

  return (
    <BrowserRouter>
      <nav className="navbar">
        {/* Hamburger button for mobile */}
        <button
          className="hamburger"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label="Toggle menu"
        >
          ☰
        </button>

        <ul className={`navlist ${mobileMenuOpen ? "open" : ""}`}>
          <li className="navitem">
            <Link
              to="/"
              className="nav-link"
              onClick={() => setMobileMenuOpen(false)}
            >
              League Home
            </Link>
          </li>

          <li className="navitem">
            <Link
              to="/fantasy"
              className="nav-link"
              onClick={() => setMobileMenuOpen(false)}
            >
              Fantasy App
            </Link>
          </li>

          {/* Teams dropdown */}
          <li className="navitem dropdown" ref={dropdownRef}>
            <span
              className="nav-link nav-trigger"
              onClick={() => setDropdownOpen(!dropdownOpen)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) =>
                (e.key === "Enter" || e.key === " ") && setDropdownOpen(!dropdownOpen)
              }
            >
              Teams ▾
            </span>

            {dropdownOpen && (
              <div className="dropdown-content">
                {teams.length > 0 ? (
                  teams.map((t) => (
                    <Link
                      key={t.id}
                      to={`/team/${t.id}`}
                      className="dropdown-item"
                      onClick={() => {
                        setDropdownOpen(false);
                        setMobileMenuOpen(false); // closes mobile menu too
                      }}
                    >
                      {t.name}
                    </Link>
                  ))
                ) : (
                  <span className="dropdown-item">No teams yet</span>
                )}
              </div>
            )}
          </li>

          <li className="navitem">
            <Link
              to="/scoreboard"
              className="nav-link"
              onClick={() => setMobileMenuOpen(false)}
            >
              Scoreboard
            </Link>
          </li>
        </ul>
      </nav>

      <div className="content">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/fantasy" element={<Fantasy />} />
          <Route path="/team/:id" element={<TeamPage />} />
          <Route path="/scoreboard" element={<Scoreboard />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}
