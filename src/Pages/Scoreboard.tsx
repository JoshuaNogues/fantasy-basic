// src/Pages/Scoreboard.tsx
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import "../App.css";

interface Team {
  _id: string;
  name: string;
  lineup?: Record<string, string | null>; // Map of slot -> playerId
}

interface Player {
  _id: string;
  name: string;
  teamId?: string;
  points: Record<string, number>;
}

// Explicit type for mapped team scores
interface TeamScore extends Team {
  starterTotal: number;
  leadingScorer: Player | null;
  leadingPoints: number;
}

export default function Scoreboard() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [selectedWeek, setSelectedWeek] = useState("week1");

  const API_URL = import.meta.env.VITE_API_BASE;

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [teamsRes, playersRes] = await Promise.all([
          fetch(`${API_URL}/api/teams`),
          fetch(`${API_URL}/api/players`),
        ]);

        if (!teamsRes.ok || !playersRes.ok) throw new Error("Failed to fetch data");

        const teamsData: Team[] = await teamsRes.json();
        const playersData: Player[] = await playersRes.json();

        setTeams(teamsData);
        setPlayers(playersData.map((p) => ({ ...p, points: p.points ?? {} })));
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
    if (team.lineup) {
      for (const slot of ["Passing", "Rushing", "Receiving", "Defense", "Kicking"]) {
        const playerId = team.lineup[slot];
        if (playerId) {
          const player = teamPlayers.find((p) => p._id === playerId);
          if (player) starters.push(player);
        }
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

  const sortedTeams = [...teamScores].sort((a, b) => b.starterTotal - a.starterTotal);

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
                <h2>
                  <Link to={`/team/${t._id}`}>{t.name}</Link>
                </h2>
                <p>
                  Starter Total: <strong>{t.starterTotal}</strong>
                </p>
                {t.leadingScorer ? (
                  <p>
                    ⭐ Top Starter: {t.leadingScorer!.name} ({t.leadingPoints} pts)
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
        ⬅ Back to Fantasy
      </Link>
    </div>
  );
}
