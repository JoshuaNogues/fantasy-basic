// src/Pages/TeamPage.tsx
import { useParams, Link } from "react-router-dom";
import { useEffect, useState } from "react";
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

export default function TeamPage() {
  const { id } = useParams<{ id: string }>();
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

  const team = teams.find((t) => t.id === id);
  const teamPlayers = players.filter((p) => p.teamId === id);

  const teamTotal = teamPlayers.reduce(
    (sum, p) => sum + (p.points[selectedWeek] || 0),
    0
  );

  if (!team) {
    return (
      <div className="team-page">
        <h1>Team Not Found</h1>
        <Link className="btn-link" to="/fantasy">
          ⬅ Back to Fantasy
        </Link>
      </div>
    );
  }

  return (
    <div className="team-page">
      <div className="team-header card-section">
        <h1>{team.name}</h1>
        <h2>Total Points: {teamTotal}</h2>
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
        <h2>Players</h2>
        {teamPlayers.length > 0 ? (
          <ul className="player-list">
            {teamPlayers.map((p) => (
              <li key={p.id} className="player-card">
                <strong>{p.name}</strong> – Points: {p.points[selectedWeek] || 0}
              </li>
            ))}
          </ul>
        ) : (
          <p>No players assigned yet.</p>
        )}
      </section>

      <Link className="btn-link" to="/fantasy">
        ⬅ Back to Fantasy
      </Link>
    </div>
  );
}
