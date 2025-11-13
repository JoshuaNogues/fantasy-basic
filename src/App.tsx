import { BrowserRouter, Routes, Route, Link } from "react-router-dom";
import { useEffect, useState, useRef } from "react";
import Fantasy from "./Pages/Fantasy";
import TeamPage from "./Pages/TeamPage";
import Scoreboard from "./Pages/Scoreboard";
import Standings from "./Pages/Standings";
import Home from "./Pages/Home";
import "./App.css";

interface Team {
  _id: string;
  name: string;
}

export default function App() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const dropdownRef = useRef<HTMLLIElement>(null);

  const API_URL = import.meta.env.VITE_API_BASE;

  useEffect(() => {
    const fetchTeams = async () => {
      try {
        const res = await fetch(`${API_URL}/api/teams`);
        if (!res.ok) throw new Error(`Failed to fetch teams: ${res.status}`);
        const data = await res.json();
        setTeams(data);
      } catch (error) {
        console.error("Error fetching teams:", error);
      }
    };

    fetchTeams();
  }, [API_URL]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth > 768 && mobileMenuOpen) {
        setMobileMenuOpen(false);
      }
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [mobileMenuOpen]);

  return (
    <BrowserRouter>
      <nav className="navbar">
        <div className="navbar-inner">
          <Link
            to="/"
            className="navbar-brand"
            onClick={() => {
              setMobileMenuOpen(false);
              setDropdownOpen(false);
            }}
          >
            <img
              src="/logo.png"
              alt="Funtasy 5 logo"
              className="brand-logo"
            />
            <span className="brand-name">Funtasy 5</span>
          </Link>

          <button
            className={`hamburger ${mobileMenuOpen ? "active" : ""}`}
            onClick={() => {
              setMobileMenuOpen((prev) => !prev);
              setDropdownOpen(false);
            }}
            aria-label="Toggle navigation"
            aria-expanded={mobileMenuOpen}
          >
            <span />
            <span />
            <span />
          </button>

          <ul className={`navlist ${mobileMenuOpen ? "open" : ""}`}>
            <li className="navitem">
              <Link
                to="/"
                className="nav-link"
                onClick={() => {
                  setMobileMenuOpen(false);
                  setDropdownOpen(false);
                }}
              >
                League Home
              </Link>
            </li>
            <li className="navitem">
              <Link
                to="/fantasy"
                className="nav-link"
                onClick={() => {
                  setMobileMenuOpen(false);
                  setDropdownOpen(false);
                }}
              >
                LM Tools
              </Link>
            </li>
            <li
              className={`navitem dropdown ${dropdownOpen ? "open" : ""}`}
              ref={dropdownRef}
            >
              <span
                className="nav-link nav-trigger"
                onClick={() => setDropdownOpen((prev) => !prev)}
                role="button"
                tabIndex={0}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    setDropdownOpen((prev) => !prev);
                  }
                }}
              >
                Teams ▾
              </span>

              {dropdownOpen && (
                <div className="dropdown-content">
                  {teams.length > 0 ? (
                    teams.map((team) => (
                      <Link
                        key={team._id}
                        to={`/team/${team._id}`}
                        className="dropdown-item"
                        onClick={() => {
                          setDropdownOpen(false);
                          setMobileMenuOpen(false);
                        }}
                      >
                        {team.name}
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
                onClick={() => {
                  setMobileMenuOpen(false);
                  setDropdownOpen(false);
                }}
              >
                Scoreboard
              </Link>
            </li>
            <li className="navitem">
              <Link
                to="/standings"
                className="nav-link"
                onClick={() => {
                  setMobileMenuOpen(false);
                  setDropdownOpen(false);
                }}
              >
                Standings
              </Link>
            </li>
          </ul>
        </div>
      </nav>

      <div className="content">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/fantasy" element={<Fantasy />} />
          <Route path="/team/:id" element={<TeamPage />} />
          <Route path="/scoreboard" element={<Scoreboard />} />
          <Route path="/standings" element={<Standings />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}
