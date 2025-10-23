// src/Pages/Scoreboard.tsx
import { useEffect, useState } from "react";
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

  return (
    <div className="scoreboard-page">
      <div className="scoreboard-header card-section">
        <h1>🏆 Scoreboard</h1>
        <div className="form-row">
          <label>Select Week: </label>
          <select
            value={selectedWeek}
            onChange={(e) => setSelectedWeek(e.target.value)}
          >
            {Array.from({ length: 17 }, (_, i) => (
              <option key={`week${i + 1}`} value={`week${i + 1}`}>
                {i < 14 ? `Week ${i + 1}` : `Playoff/Champ ${i - 13}`}
              </option>
            ))}
          </select>
        </div>
      </div>
      <section className="card-section">
        {sortedTeams.length > 0 ? (
          <div className="team-grid">
            {sortedTeams.map((t) => (
              <div key={t._id} className="team-card">
                <div className="teamname-points">
                  <h2>
                    <Link to={`/team/${t._id}`}>{t.name}</Link>
                  </h2>
                  <p>
                    Points: <strong>{t.starterTotal.toFixed(2)}</strong>
                  </p>
                </div>
                {t.leadingScorer ? (
                  <p>
                    ⭐ {t.leadingScorer!.name} ({t.leadingPoints.toFixed(2)}{" "}
                    pts)
                  </p>
                ) : (
                  <p>No starters yet</p>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p>No teams yet.</p>
        )}
      </section>
      <Link className="btn-link" to="/fantasy">
        {" "}
        ⬅ Back to Fantasy{" "}
      </Link>{" "}
    </div>
  );
}
