import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { Link } from "react-router-dom";
import "../App.css";

interface ApiTeam {
  _id: string;
  name: string;
  record?: Record<string, "W" | "L">;
}

interface DecoratedTeam extends ApiTeam {
  tieBreaker: number;
}

interface TeamStandings extends DecoratedTeam {
  wins: number;
  losses: number;
  winPct: number;
  totalGames: number;
}

const ACCENT_THEMES = [
  {
    accentColor: "#5bdbe6",
    glow: "rgba(28, 163, 180, 0.38)",
    badgeGradient: "linear-gradient(135deg, #0e7481, #1ca3b4)",
    badgeTextColor: "#062126",
  },
  {
    accentColor: "#FA4616",
    glow: "rgba(250, 70, 22, 0.35)",
    badgeGradient: "linear-gradient(135deg, #c33210, #FA4616)",
    badgeTextColor: "#120b08",
  },
  {
    accentColor: "#8A8D8F",
    glow: "rgba(138, 141, 143, 0.32)",
    badgeGradient: "linear-gradient(135deg, #4a4d4f, #8A8D8F)",
    badgeTextColor: "#f3f4f6",
  },
  {
    accentColor: "#29b9cc",
    glow: "rgba(41, 185, 204, 0.32)",
    badgeGradient: "linear-gradient(135deg, #165d66, #29b9cc)",
    badgeTextColor: "#062126",
  },
] as const;

const getTeamInitials = (name: string) => {
  const trimmed = name.trim();
  if (!trimmed) return "??";
  const words = trimmed.split(/\s+/);
  if (words.length === 1) {
    return words[0].slice(0, 2).toUpperCase();
  }
  return (words[0][0] + words[1][0]).toUpperCase();
};

const computeRecordTotals = (team: ApiTeam) => {
  if (!team.record) {
    return { wins: 0, losses: 0, totalGames: 0, winPct: 0 };
  }

  let wins = 0;
  let losses = 0;
  Object.values(team.record).forEach((result) => {
    if (result === "W") wins += 1;
    if (result === "L") losses += 1;
  });

  const totalGames = wins + losses;
  const winPct = totalGames === 0 ? 0 : wins / totalGames;
  return { wins, losses, totalGames, winPct };
};

const formatOrdinal = (rank: number) => {
  const suffixes: Record<number, string> = { 1: "st", 2: "nd", 3: "rd" };
  const remainder = rank % 100;
  if (remainder >= 11 && remainder <= 13) return `${rank}th`;
  return `${rank}${suffixes[rank % 10] ?? "th"}`;
};

export default function Standings() {
  const [teams, setTeams] = useState<DecoratedTeam[]>([]);
  const API_URL = import.meta.env.VITE_API_BASE;

  useEffect(() => {
    const fetchTeams = async () => {
      try {
        const response = await fetch(`${API_URL}/api/teams`);
        if (!response.ok) throw new Error("Failed to fetch teams");
        const data: ApiTeam[] = await response.json();
        setTeams(
          data.map((team) => ({
            ...team,
            tieBreaker: Math.random(),
          }))
        );
      } catch (err) {
        console.error("Error fetching teams:", err);
      }
    };

    fetchTeams();
  }, [API_URL]);

  const standings: TeamStandings[] = useMemo(() => {
    return teams
      .map((team) => {
        const totals = computeRecordTotals(team);
        return { ...team, ...totals };
      })
      .sort((a, b) => {
        if (a.winPct !== b.winPct) return b.winPct - a.winPct;
        if (a.wins !== b.wins) return b.wins - a.wins;
        if (a.losses !== b.losses) return a.losses - b.losses;
        return b.tieBreaker - a.tieBreaker;
      });
  }, [teams]);

  return (
    <div className="scoreboard-page">
      <div className="scoreboard-panel">
        <header className="scoreboard-hero">
          <div className="hero-top-row">
            <span className="spotlight-tag">League Table</span>
            <span className="hero-meta">Sorted from best to worst record</span>
          </div>
          <h1>Standings</h1>
          <p className="hero-copy">
            Snapshot of every squad&apos;s season record. Ties shuffle randomly
            for now, so keep winning to stay on top.
          </p>
        </header>

        <section className="scoreboard-list standings-list">
          {standings.length > 0 ? (
            standings.map((team, index) => {
              const theme = ACCENT_THEMES[index % ACCENT_THEMES.length];
              const style = {
                "--accent-color": theme.accentColor,
                "--accent-glow": theme.glow,
                "--badge-gradient": theme.badgeGradient,
                "--badge-text-color": theme.badgeTextColor,
              } as CSSProperties;

              const recordLabel =
                team.totalGames > 0
                  ? `${team.wins}-${team.losses}`
                  : "Record pending";

              return (
                <article
                  key={team._id}
                  className="scoreboard-row standings-row"
                  style={style}
                >
                  <div className="standings-rank">
                    <span className="rank-number">{formatOrdinal(index + 1)}</span>
                    <span className="rank-label">Place</span>
                  </div>

                  <div className="row-main">
                    <div className="row-left">
                      <span className="team-badge">
                        {getTeamInitials(team.name)}
                      </span>
                      <div className="team-meta">
                        <Link to={`/team/${team._id}`} className="team-name">
                          {team.name}
                        </Link>
                        <span className="team-record">{recordLabel}</span>
                      </div>
                    </div>
                    <div className="row-right standings-row-right">
                      <div className="stat-pill">
                        <span className="stat-label">Win %</span>
                        <span className="stat-value">
                          {team.totalGames > 0 ? team.winPct.toFixed(3) : "—"}
                        </span>
                      </div>
                      <div className="stat-pill">
                        <span className="stat-label">Games</span>
                        <span className="stat-value">{team.totalGames}</span>
                      </div>
                    </div>
                  </div>
                </article>
              );
            })
          ) : (
            <p className="empty-state">No teams yet.</p>
          )}
        </section>

        <div className="standings-links">
          <Link className="scoreboard-back" to="/">
            Back to Home
          </Link>
          <Link className="scoreboard-back" to="/scoreboard">
            View Scoreboard
          </Link>
        </div>
      </div>
    </div>
  );
}

