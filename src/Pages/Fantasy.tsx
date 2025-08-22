// src/Pages/Fantasy.tsx
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";

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

export default function Fantasy() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [teamName, setTeamName] = useState("");
  const [playerName, setPlayerName] = useState("");
  const [playerTeam, setPlayerTeam] = useState<string>("");

  const [pointsTeam, setPointsTeam] = useState<string>("");
  const [pointsPlayer, setPointsPlayer] = useState<string>("");
  const [pointsValue, setPointsValue] = useState<number>(0);
  const [selectedWeek, setSelectedWeek] = useState("week1");

  // Use environment variable for backend URL
  const API_URL = import.meta.env.VITE_API_BASE; // ✅ updated

// Fetch teams and players from backend
useEffect(() => {
  const fetchData = async () => {
    try {
      const [teamsRes, playersRes] = await Promise.all([
        fetch(`${API_URL}/api/teams`),
        fetch(`${API_URL}/api/players`),
      ]);

      if (!teamsRes.ok) throw new Error(`Failed to fetch teams: ${teamsRes.status}`);
      if (!playersRes.ok) throw new Error(`Failed to fetch players: ${playersRes.status}`);

      const teamsData = await teamsRes.json();
      const playersData = await playersRes.json();

      setTeams(teamsData);
      setPlayers(playersData.map((p: any) => ({ ...p, points: p.points ?? {} })));
    } catch (err) {
      console.error("Error fetching data:", err);
    }
  };
  fetchData();
}, [API_URL]);


  // Add new team
  const addTeam = async () => {
    if (!teamName) return;
    try {
      const res = await fetch(`${API_URL}/api/teams`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: teamName }),
      });
      const newTeam = await res.json();
      setTeams([...teams, newTeam]);
      setTeamName("");
    } catch (err) {
      console.error("Error adding team:", err);
    }
  };

  // Add new player
  const addPlayer = async () => {
    if (!playerName) return;
    try {
      const res = await fetch(`${API_URL}/api/players`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: playerName,
          teamId: playerTeam || undefined,
          points: {},
        }),
      });
      const newPlayer = await res.json();
      setPlayers([...players, newPlayer]);
      setPlayerName("");
      setPlayerTeam("");
    } catch (err) {
      console.error("Error adding player:", err);
    }
  };

  // Set points for a player
  const setPoints = async () => {
    if (!pointsPlayer || !selectedWeek || isNaN(pointsValue)) return;
    try {
      const res = await fetch(`${API_URL}/api/players/${pointsPlayer}/points`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ week: selectedWeek, points: pointsValue }),
      });
      const updatedPlayer = await res.json();
      setPlayers(players.map((p) => (p._id === updatedPlayer._id ? updatedPlayer : p)));

      setPointsPlayer("");
      setPointsTeam("");
      setPointsValue(0);
    } catch (err) {
      console.error("Error updating points:", err);
    }
  };

  // Filter players for selected team in points section
  const playersForPoints = pointsTeam
    ? players.filter((p) => p.teamId === pointsTeam)
    : [];

  return (
    <div className="fantasy-page">
      <h1 className="page-title">Fantasy Dashboard</h1>

      {/* Teams Section */}
      <section className="card-section">
        <h2>Create Team</h2>
        <div className="form-row">
          <input
            value={teamName}
            onChange={(e) => setTeamName(e.target.value)}
            placeholder="Team name"
          />
          <button className="btn" onClick={addTeam}>Add Team</button>
        </div>

        <h3>Your Teams</h3>
        <ul className="team-list">
          {teams.map((t) => (
            <li key={t._id} className="team-card">
              <Link to={`/team/${t._id}`}>{t.name}</Link>
            </li>
          ))}
        </ul>
      </section>

      {/* Players Section */}
      <section className="card-section">
        <h2>Create Player</h2>
        <div className="form-row">
          <input
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            placeholder="Player name"
          />
          <select
            value={playerTeam}
            onChange={(e) => setPlayerTeam(e.target.value)}
          >
            <option value="">Unassigned</option>
            {teams.map((t) => (
              <option key={t._id} value={t._id}>{t.name}</option>
            ))}
          </select>
          <button className="btn" onClick={addPlayer}>Add Player</button>
        </div>

        <h3>All Players</h3>
        <ul className="player-list">
          {players.map((p) => (
            <li key={p._id} className="player-card">
              <strong>{p.name}</strong>{" "}
              {p.teamId ? `(Team: ${teams.find((t) => t._id === p.teamId)?.name})` : "(Unassigned)"}{" "}
              – Points: {p.points[selectedWeek] || 0}
            </li>
          ))}
        </ul>
      </section>

      {/* Set Points Section */}
      <section className="card-section">
        <h2>Set Points</h2>
        <div className="form-row">
          <select
            value={pointsTeam}
            onChange={(e) => {
              setPointsTeam(e.target.value);
              setPointsPlayer("");
            }}
          >
            <option value="">Select Team</option>
            {teams.map((t) => (
              <option key={t._id} value={t._id}>{t.name}</option>
            ))}
          </select>

          <select
            value={pointsPlayer}
            onChange={(e) => setPointsPlayer(e.target.value)}
            disabled={!pointsTeam}
          >
            <option value="">Select Player</option>
            {playersForPoints.map((p) => (
              <option key={p._id} value={p._id}>{p.name}</option>
            ))}
          </select>

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

          <input
            type="number"
            value={pointsValue}
            onChange={(e) => setPointsValue(Number(e.target.value))}
            placeholder="Points"
          />
          <button className="btn" onClick={setPoints}>Set Points</button>
        </div>
      </section>
    </div>
  );
}
