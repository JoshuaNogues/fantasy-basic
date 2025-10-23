// src/Pages/Fantasy.tsx
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  LINEUP_SLOTS,
  type LineupSlot,
  normalizeLineupSlot,
} from "../constants/lineup";

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
  position?: LineupSlot;
}

export default function Fantasy() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [teamName, setTeamName] = useState("");
  const [playerName, setPlayerName] = useState("");
  const [playerTeam, setPlayerTeam] = useState("");
  const [playerPosition, setPlayerPosition] = useState<LineupSlot | "">("");

  const [pointsTeam, setPointsTeam] = useState("");
  const [pointsPlayer, setPointsPlayer] = useState("");
  const [pointsValue, setPointsValue] = useState<number>(0);

  const [recordTeam, setRecordTeam] = useState("");
  const [recordValue, setRecordValue] = useState<"W" | "L" | "">("");

  const [selectedWeek, setSelectedWeek] = useState("week1");
  const [currentWeek, setCurrentWeek] = useState("week1");
  const [currentWeekDraft, setCurrentWeekDraft] = useState("week1");
  const [updatingCurrentWeek, setUpdatingCurrentWeek] = useState(false);
  const [currentWeekError, setCurrentWeekError] = useState<string | null>(null);

  const API_URL = import.meta.env.VITE_API_BASE;
  // const API_URL = "http://localhost:5000";

  const formatWeekLabel = (week: string) => {
    const match = week.match(/^week(\d+)$/i);
    if (!match) return week;
    const weekNumber = Number.parseInt(match[1], 10);
    if (Number.isNaN(weekNumber)) return week;
    return weekNumber <= 14
      ? `Week ${weekNumber}`
      : `Playoff/Champ ${weekNumber - 13}`;
  };

  // Fetch teams and players
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [teamsRes, playersRes, currentWeekRes] = await Promise.all([
          fetch(`${API_URL}/api/teams`),
          fetch(`${API_URL}/api/players`),
          fetch(`${API_URL}/api/settings/current-week`),
        ]);

        if (!teamsRes.ok)
          throw new Error(`Failed to fetch teams: ${teamsRes.status}`);
        if (!playersRes.ok)
          throw new Error(`Failed to fetch players: ${playersRes.status}`);
        if (!currentWeekRes.ok)
          throw new Error(
            `Failed to fetch current week: ${currentWeekRes.status}`
          );

        const teamsData: Team[] = await teamsRes.json();
        const playersData: Player[] = await playersRes.json();
        const currentWeekData = await currentWeekRes.json();
        const resolvedWeek =
          typeof currentWeekData?.currentWeek === "string"
            ? currentWeekData.currentWeek
            : "week1";

        // Ensure Map fields are plain objects
        setTeams(teamsData.map((t) => ({ ...t, record: t.record ?? {} })));
        setPlayers(
          playersData.map((p) => ({
            ...p,
            points: p.points ?? {},
            position: normalizeLineupSlot(p.position),
          }))
        );
        setCurrentWeek(resolvedWeek);
        setCurrentWeekDraft(resolvedWeek);
        setSelectedWeek(resolvedWeek);
      } catch (err) {
        console.error(err);
      }
    };

    fetchData();
  }, [API_URL]);

  const handleUpdateCurrentWeek = async () => {
    setCurrentWeekError(null);
    setUpdatingCurrentWeek(true);
    try {
      const response = await fetch(`${API_URL}/api/settings/current-week`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ week: currentWeekDraft }),
      });

      if (!response.ok) {
        const message = await response.text();
        throw new Error(message || "Failed to update current week");
      }

      const data = await response.json();
      const resolvedWeek =
        typeof data?.currentWeek === "string" ? data.currentWeek : "week1";
      setCurrentWeek(resolvedWeek);
      setCurrentWeekDraft(resolvedWeek);
      setSelectedWeek(resolvedWeek);
    } catch (error) {
      console.error("Failed to set current week:", error);
      setCurrentWeekError("Unable to set current week. Please try again.");
    } finally {
      setUpdatingCurrentWeek(false);
    }
  };

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
          position: playerPosition || undefined,
        }),
      });
      const newPlayer: Player = await res.json();
      setPlayers([
        ...players,
        {
          ...newPlayer,
          points: newPlayer.points ?? {},
          position: normalizeLineupSlot(newPlayer.position),
        },
      ]);
      setPlayerName("");
      setPlayerTeam("");
      setPlayerPosition("");
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
        players.map((p) =>
          p._id === updatedPlayer._id
            ? {
                ...p,
                ...updatedPlayer,
                points: updatedPlayer.points ?? {},
                position: normalizeLineupSlot(updatedPlayer.position),
              }
            : p
        )
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

      <section className="card-section">
        <h2>Current Week</h2>
        <div className="form-row">
          <select
            value={currentWeekDraft}
            onChange={(e) => setCurrentWeekDraft(e.target.value)}
          >
            {Array.from({ length: 17 }, (_, i) => (
              <option key={`current-week-${i + 1}`} value={`week${i + 1}`}>
                {i < 14 ? `Week ${i + 1}` : `Playoff/Champ ${i - 13}`}
              </option>
            ))}
          </select>
          <button
            className="btn"
            onClick={handleUpdateCurrentWeek}
            disabled={updatingCurrentWeek || currentWeekDraft === currentWeek}
          >
            {updatingCurrentWeek ? "Saving..." : "Set Current Week"}
          </button>
          <span>
            Active Week: <strong>{formatWeekLabel(currentWeek)}</strong>
          </span>
        </div>
        {currentWeekError && (
          <p style={{ color: "#c0392b" }}>{currentWeekError}</p>
        )}
      </section>

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
          <select
            value={playerPosition}
            onChange={(e) =>
              setPlayerPosition(e.target.value as LineupSlot | "")
            }
          >
            <option value="">Select position</option>
            {LINEUP_SLOTS.map((slot) => (
              <option key={slot} value={slot}>
                {slot}
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
