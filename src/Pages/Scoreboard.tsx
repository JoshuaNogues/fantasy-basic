import { useEffect, useState, type CSSProperties } from "react";
import { Link } from "react-router-dom";
import {
  LINEUP_SLOTS,
  type LineupSlot,
  normalizeLineupSlot,
} from "../constants/lineup";
import "../App.css";

interface Team {
  _id: string;
  name: string;
  lineup?: Partial<Record<LineupSlot, string | null>>; // Map of slot -> playerId
  lineups?: Record<string, Partial<Record<LineupSlot, string | null>>>;
  record?: Record<string, "W" | "L">;
}

interface Player {
  _id: string;
  name: string;
  teamId?: string;
  points: Record<string, number>;
  position?: LineupSlot;
}

// Explicit type for mapped team scores
interface TeamScore extends Team {
  starterTotal: number;
  leadingScorer: Player | null;
  leadingPoints: number;
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

const parseWeekNumber = (week: string): number | null => {
  const parsed = Number.parseInt(week.replace("week", ""), 10);
  return Number.isNaN(parsed) ? null : parsed;
};

const extractPlayerId = (value: unknown): string | null => {
  if (!value) return null;
  if (typeof value === "string") return value;
  if (typeof value === "object") {
    if (value && typeof (value as { $oid?: unknown }).$oid === "string") {
      return (value as { $oid: string }).$oid;
    }
    if (value && "toString" in value) {
      const stringified = (value as { toString: () => string }).toString();
      if (stringified && stringified !== "[object Object]") return stringified;
    }
  }
  return null;
};

const pickLineupForWeek = (
  team: Team,
  week: string
): Partial<Record<LineupSlot, string | null>> | undefined => {
  if (team.lineups?.[week]) return team.lineups[week];

  if (team.lineups) {
    const targetWeek = parseWeekNumber(week);
    const entries = Object.keys(team.lineups)
      .map((weekKey) => ({
        weekKey,
        num: parseWeekNumber(weekKey),
      }))
      .filter(
        (entry): entry is { weekKey: string; num: number } =>
          entry.num !== null
      )
      .sort((a, b) => b.num - a.num);

    const fallbackWeek =
      entries.find((entry) =>
        targetWeek === null ? true : entry.num <= targetWeek
      )?.weekKey ?? entries[0]?.weekKey;

    if (fallbackWeek) {
      return team.lineups[fallbackWeek];
    }
  }

  return team.lineup;
};

const getCumulativeRecord = (team: Team, upToWeek: string) => {
  if (!team.record) return { wins: 0, losses: 0 };
  const targetWeek = parseWeekNumber(upToWeek);
  if (targetWeek === null) return { wins: 0, losses: 0 };

  let wins = 0;
  let losses = 0;

  Object.entries(team.record).forEach(([weekKey, result]) => {
    const weekNum = parseWeekNumber(weekKey);
    if (weekNum === null || weekNum > targetWeek) return;
    if (result === "W") wins += 1;
    if (result === "L") losses += 1;
  });

  return { wins, losses };
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

const formatWeekLabel = (weekKey: string) => {
  const weekNum = parseWeekNumber(weekKey);
  if (weekNum === null) return weekKey;
  return `Week ${weekNum}`;
};

export default function Scoreboard() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [selectedWeek, setSelectedWeek] = useState("week1");

  const API_URL = import.meta.env.VITE_API_BASE;

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [teamsRes, playersRes, currentWeekRes] = await Promise.all([
          fetch(`${API_URL}/api/teams`),
          fetch(`${API_URL}/api/players`),
          fetch(`${API_URL}/api/settings/current-week`),
        ]);

        if (!teamsRes.ok || !playersRes.ok || !currentWeekRes.ok)
          throw new Error("Failed to fetch data");

        const teamsData: Team[] = await teamsRes.json();
        const playersData: Player[] = await playersRes.json();
        const currentWeekData = await currentWeekRes.json();
        const resolvedWeek =
          typeof currentWeekData?.currentWeek === "string"
            ? currentWeekData.currentWeek
            : "week1";

        setTeams(teamsData);
        setPlayers(
          playersData.map((p) => ({
            ...p,
            points: p.points ?? {},
            position: normalizeLineupSlot(p.position),
          }))
        );
        setSelectedWeek(resolvedWeek);
      } catch (err) {
        console.error("Error fetching data:", err);
      }
    };

    fetchData();
  }, [API_URL]);

  // Compute starter totals and top starters based on lineup
  const teamScores: TeamScore[] = teams.map((team) => {
    const teamPlayers = players.filter((p) => p.teamId === team._id);

    // Grab starters from lineup
    const starters: Player[] = [];
    const lineupForWeek = pickLineupForWeek(team, selectedWeek);
    if (lineupForWeek) {
      for (const slot of LINEUP_SLOTS) {
        const playerId = extractPlayerId(lineupForWeek[slot]);
        if (!playerId) continue;
        const player = teamPlayers.find((p) => p._id === playerId);
        if (player) starters.push(player);
      }
    }

    const starterTotal = starters.reduce(
      (sum, p) => sum + (p.points[selectedWeek] || 0),
      0
    );

    let leadingScorer: Player | null = null;
    let maxPoints = -Infinity;
    starters.forEach((p) => {
      const pts = p.points[selectedWeek] || 0;
      if (pts > maxPoints) {
        maxPoints = pts;
        leadingScorer = p;
      }
    });

    return {
      ...team,
      starterTotal,
      leadingScorer,
      leadingPoints: maxPoints === -Infinity ? 0 : maxPoints,
    };
  });

  const sortedTeams = [...teamScores].sort(
    (a, b) => b.starterTotal - a.starterTotal
  );
  const weekLabel = formatWeekLabel(selectedWeek);

  return (
    <div className="scoreboard-page">
      <div className="scoreboard-panel">
        <header className="scoreboard-hero">
          <div className="hero-top-row">
            <span className="spotlight-tag">Week Spotlight</span>
            <span className="hero-meta">Starter totals for {weekLabel}</span>
          </div>
          <h1>Scoreboard</h1>
          <p className="hero-copy">
            Track each squad&apos;s starter output and see who delivered the
            biggest performance of the week.
          </p>
          <div className="week-selector">
            <label htmlFor="week-select">Select week</label>
            <select
              id="week-select"
              value={selectedWeek}
              onChange={(e) => setSelectedWeek(e.target.value)}
            >
              {Array.from({ length: 17 }, (_, i) => (
                <option key={`week${i + 1}`} value={`week${i + 1}`}>
                  {`Week ${i + 1}`}
                </option>
              ))}
            </select>
          </div>
        </header>

        <section className="scoreboard-list">
          {sortedTeams.length > 0 ? (
            sortedTeams.map((team, index) => {
              const { wins, losses } = getCumulativeRecord(team, selectedWeek);
              const theme = ACCENT_THEMES[index % ACCENT_THEMES.length];
              const recordHasData =
                typeof team.record === "object" &&
                Object.keys(team.record).length > 0;

              const style = {
                "--accent-color": theme.accentColor,
                "--accent-glow": theme.glow,
                "--badge-gradient": theme.badgeGradient,
                "--badge-text-color": theme.badgeTextColor,
              } as CSSProperties;

              return (
                <article key={team._id} className="scoreboard-row" style={style}>
                  <div className="row-main">
                    <div className="row-left">
                      <span className="team-badge">
                        {getTeamInitials(team.name)}
                      </span>
                      <div className="team-meta">
                        <Link to={`/team/${team._id}`} className="team-name">
                          {team.name}
                        </Link>
                        <span className="team-record">
                          {recordHasData ? `${wins}-${losses}` : "Record pending"}
                        </span>
                      </div>
                    </div>
                    <div className="row-right">
                      <span className="score-value">
                        {team.starterTotal.toFixed(1)}
                      </span>
                      <span className="score-label">pts</span>
                    </div>
                  </div>
                  <footer className="leading-scorer">
                    {team.leadingScorer ? (
                      <>
                        Top starter:{" "}
                        <span className="leading-name">
                          {team.leadingScorer.name}
                        </span>{" "}
                        ({team.leadingPoints.toFixed(1)} pts)
                      </>
                    ) : (
                      <>No starters recorded</>
                    )}
                  </footer>
                </article>
              );
            })
          ) : (
            <p className="empty-state">No teams yet.</p>
          )}
        </section>

        <Link className="scoreboard-back" to="/">
          Back to Home
        </Link>
      </div>
    </div>
  );
}
