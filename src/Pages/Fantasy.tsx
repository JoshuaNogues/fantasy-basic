// src/Pages/Fantasy.tsx
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";

interface Team {
  _id: string;
  name: string;
  record?: Record<string, "W" | "L">;
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
  const [playerTeam, setPlayerTeam] = useState("");

  const [pointsTeam, setPointsTeam] = useState("");
  const [pointsPlayer, setPointsPlayer] = useState("");
  const [pointsValue, setPointsValue] = useState<number>(0);

  const [recordTeam, setRecordTeam] = useState("");
  const [recordValue, setRecordValue] = useState<"W" | "L" | "">("");

  const [selectedWeek, setSelectedWeek] = useState("week1");

  const API_URL = import.meta.env.VITE_API_BASE;
  // const API_URL = "http://localhost:5000";

  // Fetch teams and players
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [teamsRes, playersRes] = await Promise.all([
          fetch(`${API_URL}/api/teams`),
          fetch(`${API_URL}/api/players`),
        ]);

        if (!teamsRes.ok)
          throw new Error(`Failed to fetch teams: ${teamsRes.status}`);
        if (!playersRes.ok)
          throw new Error(`Failed to fetch players: ${playersRes.status}`);

        const teamsData: Team[] = await teamsRes.json();
        const playersData: Player[] = await playersRes.json();

        // Ensure Map fields are plain objects
        setTeams(teamsData.map((t) => ({ ...t, record: t.record ?? {} })));
        setPlayers(playersData.map((p) => ({ ...p, points: p.points ?? {} })));
      } catch (err) {
        console.error(err);
      }
    };

    fetchData();
  }, [API_URL]);

  // Add a new team
  const addTeam = async () => {
    if (!teamName) return;
    try {
      const res = await fetch(`${API_URL}/api/teams`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: teamName }),
      });
      const newTeam: Team = await res.json();
      setTeams([...teams, { ...newTeam, record: {} }]);
      setTeamName("");
    } catch (err) {
      console.error(err);
    }
  };

  // Add a new player
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
      const newPlayer: Player = await res.json();
      setPlayers([...players, { ...newPlayer, points: {} }]);
      setPlayerName("");
      setPlayerTeam("");
    } catch (err) {
      console.error(err);
    }
  };

  // Set player points
  const setPoints = async () => {
    if (!pointsPlayer || isNaN(pointsValue)) return;
    try {
      const res = await fetch(`${API_URL}/api/players/${pointsPlayer}/points`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ week: selectedWeek, points: pointsValue }),
      });
      const updatedPlayer: Player = await res.json();
      setPlayers(
        players.map((p) => (p._id === updatedPlayer._id ? updatedPlayer : p))
      );
      setPointsPlayer("");
      setPointsTeam("");
      setPointsValue(0);
    } catch (err) {
      console.error(err);
    }
  };

  // Set team record
  const setRecord = async () => {
    if (!recordTeam || !recordValue) return;

    try {
      const res = await fetch(`${API_URL}/api/teams/${recordTeam}/record`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ week: selectedWeek, result: recordValue }),
      });

      if (!res.ok) throw new Error(`Failed to update team: ${res.status}`);
      const updatedTeam: Team = await res.json();

      // Update local teams state with new record
      setTeams((prev) =>
        prev.map((t) =>
          t._id === updatedTeam._id
            ? { ...t, record: updatedTeam.record ?? {} }
            : t
        )
      );
      setRecordTeam("");
      setRecordValue("");
    } catch (err) {
      console.error(err);
    }
  };

  // Helper: cumulative wins/losses up to selectedWeek
  const getCumulativeRecord = (team: Team, week: string) => {
    if (!team.record) return { wins: 0, losses: 0 };
    let wins = 0;
    let losses = 0;
    const weekNum = parseInt(week.replace("week", ""));
    for (let i = 1; i <= weekNum; i++) {
      const w = `week${i}`;
      if (team.record[w] === "W") wins++;
      if (team.record[w] === "L") losses++;
    }
    return { wins, losses };
  };

  const playersForPoints = pointsTeam
    ? players.filter((p) => p.teamId === pointsTeam)
    : [];

  return (
    <div className="fantasy-page">
      <h1 className="page-title">LM Tools Dashboard</h1>

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

        <h3>Current Teams</h3>
        <ul className="team-list">
          {teams.map((t) => {
            const record = getCumulativeRecord(t, selectedWeek);
            return (
              <li key={t._id} className="team-card">
                <Link to={`/team/${t._id}`}>{t.name}</Link>
                <span> ({record.wins}-{record.losses})</span>
              </li>
            );
          })}
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
              <option key={t._id} value={t._id}>
                {t.name}
              </option>
            ))}
          </select>
          <button className="btn" onClick={addPlayer}>
            Add Player
          </button>
        </div>
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
              <option key={t._id} value={t._id}>
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
              <option key={p._id} value={p._id}>
                {p.name}
              </option>
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
          <button className="btn" onClick={setPoints}>
            Set Points
          </button>
        </div>
      </section>

      {/* Set Record Section */}
      <section className="card-section">
        <h2>Set Team Record</h2>
        <div className="form-row">
          <select
            value={recordTeam}
            onChange={(e) => setRecordTeam(e.target.value)}
          >
            <option value="">Select Team</option>
            {teams.map((t) => (
              <option key={t._id} value={t._id}>
                {t.name}
              </option>
            ))}
          </select>

          <select
            value={recordValue}
            onChange={(e) => setRecordValue(e.target.value as "W" | "L")}
          >
            <option value="">Win / Loss</option>
            <option value="W">Win</option>
            <option value="L">Loss</option>
          </select>

          <select
            value={selectedWeek}
            onChange={(e) => setSelectedWeek(e.target.value)}
          >
            {Array.from({ length: 17 }, (_, i) => (
              <option key={`week${i + 1}-record`} value={`week${i + 1}`}>
                {i < 14 ? `Week ${i + 1}` : `Playoff/Champ ${i - 13}`}
              </option>
            ))}
          </select>

          <button className="btn" onClick={setRecord}>
            Set Record
          </button>
        </div>
      </section>
    </div>
  );
}
