// src/Pages/TeamPage.tsx
import { useParams, Link } from "react-router-dom";
import { useEffect, useState } from "react";
import "../App.css";

interface Team {
  _id: string;
  name: string;
  lineup?: Record<string, string | null>;
  record?: Record<string, "W" | "L">; // week -> "W" or "L"
}

interface Player {
  _id: string;
  name: string;
  teamId?: string;
  points: Record<string, number>;
}

type Lineup = {
  Passing?: Player;
  Rushing?: Player;
  Receiving?: Player;
  Defense?: Player;
  Kicking?: Player;
};

export default function TeamPage() {
  const { id } = useParams<{ id: string }>();
  const [team, setTeam] = useState<Team | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [lineup, setLineup] = useState<Lineup>({});
  const [bench, setBench] = useState<Player[]>([]);
  const [selectedWeek, setSelectedWeek] = useState("week1");
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);

  const API_URL = import.meta.env.VITE_API_BASE;
  // const API_URL = "http://localhost:5000";

  const saveLineup = async (newLineup: Lineup) => {
    try {
      await fetch(`${API_URL}/api/teams/${id}/lineup`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lineup: Object.fromEntries(
            Object.entries(newLineup).map(([slot, player]) => [
              slot,
              player?._id || null,
            ])
          ),
        }),
      });
    } catch (err) {
      console.error("Failed to save lineup", err);
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const teamRes = await fetch(`${API_URL}/api/teams/${id}`);
        if (!teamRes.ok)
          throw new Error(`Failed to fetch team: ${teamRes.status}`);
        const teamData = await teamRes.json();
        setTeam(teamData);

        const playersRes = await fetch(`${API_URL}/api/players?teamId=${id}`);
        if (!playersRes.ok)
          throw new Error(`Failed to fetch players: ${playersRes.status}`);
        const teamPlayers = await playersRes.json();
        const fetchedPlayers: Player[] = teamPlayers.map((p: any) => ({
          ...p,
          points: p.points ?? {},
        }));

        let savedLineup: Lineup = {};
        let savedBench: Player[] = [];

        if (teamData.lineup) {
          savedLineup = Object.fromEntries(
            Object.entries(teamData.lineup).map(([slot, playerId]) => [
              slot,
              fetchedPlayers.find((p) => p._id === playerId),
            ])
          ) as Lineup;

          savedBench = fetchedPlayers.filter(
            (p) => !Object.values(savedLineup).some((pl) => pl?._id === p._id)
          );
        }

        if (
          !savedLineup.Passing &&
          !savedLineup.Rushing &&
          !savedLineup.Receiving &&
          !savedLineup.Defense &&
          !savedLineup.Kicking
        ) {
          const starters: Player[] = fetchedPlayers.slice(0, 5);
          const benchPlayers: Player[] = fetchedPlayers.slice(5);
          const newLineup: Lineup = {};
          starters.forEach((p: Player) => {
            if (p.name.includes("Passing") && !newLineup.Passing)
              newLineup.Passing = p;
            else if (p.name.includes("Rushing") && !newLineup.Rushing)
              newLineup.Rushing = p;
            else if (p.name.includes("Receiving") && !newLineup.Receiving)
              newLineup.Receiving = p;
            else if (p.name.includes("Defense") && !newLineup.Defense)
              newLineup.Defense = p;
            else if (p.name.includes("Kicking") && !newLineup.Kicking)
              newLineup.Kicking = p;
            else benchPlayers.push(p);
          });
          setLineup(newLineup);
          setBench(benchPlayers);
        } else {
          setLineup(savedLineup);
          setBench(savedBench);
        }

        setPlayers(fetchedPlayers);
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

  // ✅ Calculate cumulative record
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

  const { wins, losses } = getCumulativeRecord(team, selectedWeek);

  const starterTotal = Object.values(lineup).reduce(
    (sum: number, p?: Player) => sum + (p?.points[selectedWeek] || 0),
    0
  );
  const benchTotal = bench.reduce(
    (sum: number, p: Player) => sum + (p.points[selectedWeek] || 0),
    0
  );

  const moveToBench = (slot: keyof Lineup) => {
    if (!lineup[slot]) return;
    const newBench = [...bench, lineup[slot]!];
    const newLineup = { ...lineup, [slot]: undefined };
    setBench(newBench);
    setLineup(newLineup);
  };

  const moveToLineup = (player: Player) => {
    let slot: keyof Lineup | null = null;
    if (player.name.includes("Passing")) slot = "Passing";
    else if (player.name.includes("Rushing")) slot = "Rushing";
    else if (player.name.includes("Receiving")) slot = "Receiving";
    else if (player.name.includes("Defense")) slot = "Defense";
    else if (player.name.includes("Kicking")) slot = "Kicking";

    if (slot) {
      const replaced = lineup[slot];
      const newBench = replaced
        ? [...bench.filter((p) => p._id !== player._id), replaced]
        : bench.filter((p) => p._id !== player._id);

      const newLineup = { ...lineup, [slot]: player };
      setLineup(newLineup);
      setBench(newBench);
    }
  };

  const toggleEditing = () => {
    if (editing) saveLineup(lineup);
    setEditing(!editing);
  };

  return (
    <div className="team-page">
      <div className="team-header">
        <div className="team-name-total">
          <h1>{team?.name ?? "Unknown Team"}</h1>
          <h2>
            Record: {wins}-{losses}
          </h2>
          <p>
            Week {selectedWeek.replace("week", "")}:{" "}
            {team.record?.[selectedWeek] || "-"}
          </p>
        </div>

        <div className="form-row">
          <h2>Points: {starterTotal?.toFixed(2) ?? 0}</h2>
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
        <div className="team-name-total">
          <h2>Starters</h2>
          <button className="btn-link" onClick={toggleEditing}>
            {editing ? "Done" : "Edit Lineup"}
          </button>
        </div>
        <ul className="player-list">
          {(
            ["Passing", "Rushing", "Receiving", "Defense", "Kicking"] as const
          ).map(
            (slot) =>
              lineup[slot] && (
                <li key={slot} className="player-card">
                  <strong>{lineup[slot]!.name}</strong> Points:{" "}
                  {(lineup[slot]!.points[selectedWeek] || 0).toFixed(2)}
                  {editing && (
                    <button onClick={() => moveToBench(slot)}>Bench</button>
                  )}
                </li>
              )
          )}
        </ul>
        <p>
          <strong>Starter Total: {starterTotal.toFixed(2)}</strong>
        </p>
      </section>

      <section className="card-section">
        <h2 className="bench-h2">Bench</h2>
        {bench.length > 0 ? (
          <ul className="player-list">
            {bench.map((p: Player) => (
              <li key={p._id} className="player-card">
                <strong>{p.name}</strong> Points:{" "}
                {(p.points[selectedWeek] || 0).toFixed(2)}
                {editing && (
                  <button onClick={() => moveToLineup(p)}>Start</button>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p>No bench players assigned yet.</p>
        )}
        <p>
          <strong>Bench Total: {benchTotal.toFixed(2)}</strong>
        </p>
      </section>

      <Link className="btn-link" to="/scoreboard">
        ⬅ Back to Scoreboard
      </Link>
    </div>
  );
}