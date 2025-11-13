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
  rank: number;
  streakLabel: string | null;
}

interface ThemeGroup {
  accentColor: string;
  glow: string;
  badgeGradient: string;
  badgeTextColor: string;
  rowBackground: string;
  rowBorder: string;
  statPillBg: string;
  statPillBorder: string;
  rankLabelColor: string;
  rankNumberColor?: string;
}

const STANDINGS_THEMES: ThemeGroup[] = [
  {
    accentColor: "#5bdbe6",
    glow: "rgba(28, 163, 180, 0.38)",
    badgeGradient: "linear-gradient(135deg, #0e7481, #1ca3b4)",
    badgeTextColor: "#062126",
    rowBackground: "linear-gradient(140deg, #031723, #0c3441)",
    rowBorder: "rgba(91, 219, 230, 0.35)",
    statPillBg: "rgba(3, 18, 24, 0.92)",
    statPillBorder: "rgba(91, 219, 230, 0.35)",
    rankLabelColor: "rgba(91, 219, 230, 0.8)",
  },
  {
    accentColor: "#cbd5f5",
    glow: "rgba(203, 213, 245, 0.32)",
    badgeGradient: "linear-gradient(135deg, #3b424f, #6b7684)",
    badgeTextColor: "#f8fafc",
    rowBackground: "linear-gradient(140deg, #1c1f24, #262c34)",
    rowBorder: "rgba(148, 163, 184, 0.35)",
    statPillBg: "rgba(18, 22, 29, 0.92)",
    statPillBorder: "rgba(148, 163, 184, 0.45)",
    rankLabelColor: "rgba(203, 213, 225, 0.75)",
  },
  {
    accentColor: "#FA4616",
    glow: "rgba(250, 70, 22, 0.45)",
    badgeGradient: "linear-gradient(135deg, #4a1c11, #FA4616)",
    badgeTextColor: "#120b08",
    rowBackground: "linear-gradient(140deg, #2a0e0a, #40140d)",
    rowBorder: "rgba(250, 70, 22, 0.4)",
    statPillBg: "rgba(33, 12, 10, 0.92)",
    statPillBorder: "rgba(250, 70, 22, 0.4)",
    rankLabelColor: "#f1f5f9",
    rankNumberColor: "#f1f5f9",
  },
];

const getThemeForRank = (rank: number): ThemeGroup => {
  if (rank <= 3) return STANDINGS_THEMES[0];
  if (rank <= 6) return STANDINGS_THEMES[1];
  return STANDINGS_THEMES[2];
};

const getTeamInitials = (name: string) => {
  const trimmed = name.trim();
  if (!trimmed) return "??";
  const words = trimmed.split(/\s+/);
  if (words.length === 1) {
    return words[0].slice(0, 2).toUpperCase();
  }
  return (words[0][0] + words[1][0]).toUpperCase();
};

const parseWeekNumber = (week: string): number | null => {
  const parsed = Number.parseInt(week.replace("week", ""), 10);
  return Number.isNaN(parsed) ? null : parsed;
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

const computeStreakLabel = (record?: Record<string, "W" | "L">) => {
  if (!record) return null;

  const entries = Object.entries(record);
  if (entries.length === 0) return null;

  const sorted = entries
    .map(([week, result]) => ({
      week,
      result,
      order: parseWeekNumber(week) ?? Number.POSITIVE_INFINITY,
    }))
    .sort((a, b) => a.order - b.order || a.week.localeCompare(b.week));

  const last = sorted[sorted.length - 1];
  if (!last) return null;

  const targetResult = last.result;
  let count = 0;
  for (let i = sorted.length - 1; i >= 0; i -= 1) {
    if (sorted[i].result === targetResult) count += 1;
    else break;
  }

  return `${targetResult}${count}`;
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
    const sorted = teams
      .map((team) => {
        const totals = computeRecordTotals(team);
        const streakLabel = computeStreakLabel(team.record);
        return { ...team, ...totals, streakLabel };
      })
      .sort((a, b) => {
        if (a.winPct !== b.winPct) return b.winPct - a.winPct;
        if (a.wins !== b.wins) return b.wins - a.wins;
        if (a.losses !== b.losses) return a.losses - b.losses;
        return b.tieBreaker - a.tieBreaker;
      });

    const ranked: TeamStandings[] = [];
    let teamsProcessed = 0;
    let currentRank = 1;
    let lastKey: string | null = null;

    sorted.forEach((team) => {
      const key = `${team.wins}-${team.losses}-${team.totalGames}`;
      if (key !== lastKey) {
        currentRank = teamsProcessed + 1;
      }
      ranked.push({ ...team, rank: currentRank });
      teamsProcessed += 1;
      lastKey = key;
    });

    return ranked;
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
            Snapshot of every squad&apos;s season record and streaks. So keep winning to stay on top.
          </p>
        </header>

        <section className="scoreboard-list standings-list">
          {standings.length > 0 ? (
            standings.map((team) => {
              const theme = getThemeForRank(team.rank);
              const style = {
                "--accent-color": theme.accentColor,
                "--accent-glow": theme.glow,
                "--badge-gradient": theme.badgeGradient,
                "--badge-text-color": theme.badgeTextColor,
                "--row-background": theme.rowBackground,
                "--row-border": theme.rowBorder,
                "--stat-pill-bg": theme.statPillBg,
                "--stat-pill-border": theme.statPillBorder,
                "--rank-label-color": theme.rankLabelColor,
                "--rank-number-color": theme.rankNumberColor ?? theme.accentColor,
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
                    <span className="rank-number">{formatOrdinal(team.rank)}</span>
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
                          {team.totalGames > 0 ? team.winPct.toFixed(3) : "-"}
                        </span>
                      </div>
                      <div className="stat-pill">
                        <span className="stat-label">Streak</span>
                        <span className="stat-value">
                          {team.streakLabel ?? "-"}
                        </span>
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
