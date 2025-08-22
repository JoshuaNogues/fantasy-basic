// src/Pages/Scoreboard.tsx
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import "../App.css";

interface Team {
  id: string;
  name: string;
}

interface Player {
  id: string;
  name: string;
  teamId?: string;
  points: Record<string, number>;
}

export default function Scoreboard() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [selectedWeek, setSelectedWeek] = useState("week1");

  useEffect(() => {
    const storedTeams = JSON.parse(localStorage.getItem("teams") || "[]");
    const storedPlayers = JSON.parse(localStorage.getItem("players") || "[]");
    const fixedPlayers = storedPlayers.map((p: any) => ({
      ...p,
      points: p.points ?? {},
    }));

    setTeams(storedTeams);
    setPlayers(fixedPlayers);
  }, []);

  const teamScores = teams.map((t) => {
    const teamPlayers = players.filter((p) => p.teamId === t.id);
    const total = teamPlayers.reduce(
      (sum, p) => sum + (p.points[selectedWeek] || 0),
      0
    );

    let leadingScorer: Player | null = null;
    let maxPoints = -Infinity;
    teamPlayers.forEach((p) => {
      const pts = p.points[selectedWeek] || 0;
      if (pts > maxPoints) {
        maxPoints = pts;
        leadingScorer = p;
      }
    });

    return {
      ...t,
      total,
      leadingScorer: leadingScorer as Player | null,
      leadingPoints: maxPoints === -Infinity ? 0 : maxPoints,
    };
  });

  const sortedTeams = [...teamScores].sort((a, b) => b.total - a.total);

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
              <div key={t.id} className="team-card">
                <h2>
                  <Link to={`/team/${t.id}`}>{t.name}</Link>
                </h2>
                <p>Total Points: <strong>{t.total}</strong></p>
                {t.leadingScorer ? (
                  <p>
                    ⭐ Top Scorer: {t.leadingScorer.name} (
                    {t.leadingPoints} pts)
                  </p>
                ) : (
                  <p>No players yet</p>
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
