// src/Pages/Fantasy.tsx
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";

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

export default function Fantasy() {
  const [teams, setTeams] = useState<Team[]>(() =>
    JSON.parse(localStorage.getItem("teams") || "[]")
  );

  const [players, setPlayers] = useState<Player[]>(() => {
    const stored = JSON.parse(localStorage.getItem("players") || "[]");
    return stored.map((p: any) => ({ ...p, points: p.points ?? {} }));
  });

  const [teamName, setTeamName] = useState("");
  const [playerName, setPlayerName] = useState("");
  const [playerTeam, setPlayerTeam] = useState<string>("");

  const [pointsTeam, setPointsTeam] = useState<string>("");
  const [pointsPlayer, setPointsPlayer] = useState<string>("");
  const [pointsValue, setPointsValue] = useState<number>(0);
  const [selectedWeek, setSelectedWeek] = useState("week1");

  useEffect(() => {
    localStorage.setItem("teams", JSON.stringify(teams));
  }, [teams]);

  useEffect(() => {
    localStorage.setItem("players", JSON.stringify(players));
  }, [players]);

  const addTeam = () => {
    if (!teamName) return;
    const newTeam = { id: crypto.randomUUID(), name: teamName };
    setTeams([...teams, newTeam]);
    setTeamName("");
  };

  const addPlayer = () => {
    if (!playerName) return;
    const newPlayer: Player = {
      id: crypto.randomUUID(),
      name: playerName,
      teamId: playerTeam || undefined,
      points: {},
    };
    setPlayers([...players, newPlayer]);
    setPlayerName("");
    setPlayerTeam("");
  };

  const setPoints = () => {
    if (!pointsPlayer || !selectedWeek || isNaN(pointsValue)) return;

    setPlayers(
      players.map((p) =>
        p.id === pointsPlayer
          ? { ...p, points: { ...p.points, [selectedWeek]: pointsValue } }
          : p
      )
    );

    setPointsPlayer("");
    setPointsTeam("");
    setPointsValue(0);
  };

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
          <button className="btn" onClick={addTeam}>
            Add Team
          </button>
        </div>

        <h3>Your Teams</h3>
        <ul className="team-list">
          {teams.map((t) => (
            <li key={t.id} className="team-card">
              <Link to={`/team/${t.id}`}>{t.name}</Link>
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
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
          <button className="btn" onClick={addPlayer}>
            Add Player
          </button>
        </div>

        <h3>All Players</h3>
        <ul className="player-list">
          {players.map((p) => (
            <li key={p.id} className="player-card">
              <strong>{p.name}</strong>{" "}
              {p.teamId
                ? `(Team: ${teams.find((t) => t.id === p.teamId)?.name})`
                : "(Unassigned)"}{" "}
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
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>

          <select
            value={pointsPlayer}
            onChange={(e) => setPointsPlayer(e.target.value)}
            disabled={!pointsTeam}
          >
            <option value="">Select Player</option>
            {playersForPoints.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>

          <select
            value={selectedWeek}
            onChange={(e) => setSelectedWeek(e.target.value)}
          >
            {Array.from({ length: 17 }, (_, i) => (
              <option
                key={`week${i + 1}`}
                value={`week${i + 1}`}
              >{`Week ${i + 1}`}</option>
            ))}
          </select>

          <input
            type="number"
            value={pointsValue}
            onChange={(e) => setPointsValue(Number(e.target.value))}
            placeholder="Points"
          />
          <button className="btn" onClick={setPoints}>
            Set Points
          </button>
        </div>
      </section>
    </div>
  );
}
