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

  const API_URL = import.meta.env.VITE_API_BASE;

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Fetch team
        const teamRes = await fetch(`${API_URL}/api/teams/${id}`);
        if (!teamRes.ok) throw new Error(`Failed to fetch team: ${teamRes.status}`);
        const teamData = await teamRes.json();
        setTeam(teamData);

        // Fetch only players for this team
        const playersRes = await fetch(`${API_URL}/api/players?teamId=${id}`);
        if (!playersRes.ok) throw new Error(`Failed to fetch players: ${playersRes.status}`);
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

  // Split players: first 5 starters, rest bench
  const starters = players.slice(0, 5);
  const bench = players.slice(5);

  // Calculate totals
  const calcTotal = (group: Player[]) =>
    group.reduce((sum, p) => sum + (p.points[selectedWeek] || 0), 0);

  const starterTotal = calcTotal(starters);
  const benchTotal = calcTotal(bench);
  const teamTotal = starterTotal + benchTotal;

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

      {/* Starters */}
      <section className="card-section">
        <h2>Starters</h2>
        {starters.length > 0 ? (
          <ul className="player-list">
            {starters.map((p) => (
              <li key={p._id} className="player-card">
                <strong>{p.name}</strong> – Points: {p.points[selectedWeek] || 0}
              </li>
            ))}
          </ul>
        ) : (
          <p>No starters assigned yet.</p>
        )}
        <p><strong>Starter Total: {starterTotal}</strong></p>
      </section>

      {/* Bench */}
      <section className="card-section">
        <h2>Bench</h2>
        {bench.length > 0 ? (
          <ul className="player-list">
            {bench.map((p) => (
              <li key={p._id} className="player-card">
                <strong>{p.name}</strong> – Points: {p.points[selectedWeek] || 0}
              </li>
            ))}
          </ul>
        ) : (
          <p>No bench players assigned yet.</p>
        )}
        <p><strong>Bench Total: {benchTotal}</strong></p>
      </section>

      <Link className="btn-link" to="/fantasy">
        ⬅ Back to Fantasy
      </Link>
    </div>
  );
}
