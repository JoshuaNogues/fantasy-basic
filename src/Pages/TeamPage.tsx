// src/Pages/TeamPage.tsx
import { useParams, Link } from "react-router-dom";
import { useEffect, useState } from "react";
import "../App.css";

interface Team {
  _id: string;
  name: string;
}

interface Player {
  _id: string;
  name: string;
  teamId?: string;
  points: Record<string, number>;
}

export default function TeamPage() {
  const { id } = useParams<{ id: string }>();
  const [team, setTeam] = useState<Team | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [selectedWeek, setSelectedWeek] = useState("week1");
  const [loading, setLoading] = useState(true);

  const API_URL = import.meta.env.VITE_API_URL;

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Fetch team
        const teamRes = await fetch(`${API_URL}/api/teams/${id}`);
        if (!teamRes.ok) throw new Error("Team not found");
        const teamData = await teamRes.json();
        setTeam(teamData);

        // Fetch only players for this team
        const playersRes = await fetch(`${API_URL}/api/players?teamId=${id}`);
        const teamPlayers = await playersRes.json();
        setPlayers(teamPlayers.map((p: any) => ({ ...p, points: p.points ?? {} })));
      } catch (err) {
        console.error(err);
        setTeam(null);
        setPlayers([]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id, API_URL]);

  if (loading) return null;

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

  const teamTotal = players.reduce(
    (sum, p) => sum + (p.points[selectedWeek] || 0),
    0
  );

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
        {players.length > 0 ? (
          <ul className="player-list">
            {players.map((p) => (
              <li key={p._id} className="player-card">
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
