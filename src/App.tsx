import { BrowserRouter, Routes, Route, Link } from "react-router-dom";
import Fantasy from "./Pages/Fantasy";
import TeamPage from "./Pages/TeamPage";
import Scoreboard from "./Pages/Scoreboard";
import Home from "./Pages/Home";
import { useEffect, useState, useRef } from "react";
import "./App.css";

interface Team {
  _id: string; // MongoDB uses _id
  name: string;
}

export default function App() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const dropdownRef = useRef<HTMLLIElement>(null);

  // Use environment variable for backend URL
const API_URL = import.meta.env.VITE_API_BASE; // ✅ corrected

// Fetch teams from backend
useEffect(() => {
  const fetchTeams = async () => {
    try {
      const res = await fetch(`${API_URL}/api/teams`);
      if (!res.ok) throw new Error(`Failed to fetch teams: ${res.status}`);
      const data = await res.json();
      setTeams(data);
    } catch (err) {
      console.error("Error fetching teams:", err);
    }
  };
  fetchTeams();
}, [API_URL]);


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
              LM Tools
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
                      key={t._id}
                      to={`/team/${t._id}`}
                      className="dropdown-item"
                      onClick={() => {
                        setDropdownOpen(false);
                        setMobileMenuOpen(false); // close mobile menu too
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
