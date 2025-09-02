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

  // Save lineup to backend
  const saveLineup = async (newLineup: Lineup) => {
    try {
      await fetch(`${API_URL}/api/teams/${id}/lineup`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lineup: Object.fromEntries(
            Object.entries(newLineup).map(([slot, player]) => [slot, player?._id || null])
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
        // Fetch team
        const teamRes = await fetch(`${API_URL}/api/teams/${id}`);
        if (!teamRes.ok) throw new Error(`Failed to fetch team: ${teamRes.status}`);
        const teamData = await teamRes.json();
        setTeam(teamData);

        // Fetch players
        const playersRes = await fetch(`${API_URL}/api/players?teamId=${id}`);
        if (!playersRes.ok) throw new Error(`Failed to fetch players: ${playersRes.status}`);
        const teamPlayers = await playersRes.json();
        const fetchedPlayers = teamPlayers.map((p: any) => ({ ...p, points: p.points ?? {} }));

        // Try fetching saved lineup from team.lineup
        let savedLineup: Lineup = {};
        let savedBench: Player[] = [];

        if (teamData.lineup) {
          savedLineup = Object.fromEntries(
            Object.entries(teamData.lineup).map(([slot, playerId]) => [
              slot,
              fetchedPlayers.find((p) => p._id === playerId),
            ])
          ) as Lineup;

          // Any players not in lineup go to bench
          savedBench = fetchedPlayers.filter(
            (p) => !Object.values(savedLineup).some((pl) => pl?._id === p._id)
          );
        }

        // Default first 5 if no lineup
        if (
          !savedLineup.Passing &&
          !savedLineup.Rushing &&
          !savedLineup.Receiving &&
          !savedLineup.Defense &&
          !savedLineup.Kicking
        ) {
          const starters = fetchedPlayers.slice(0, 5);
          const benchPlayers = fetchedPlayers.slice(5);
          const newLineup: Lineup = {};
          starters.forEach((p) => {
            if (p.name.includes("Passing") && !newLineup.Passing) newLineup.Passing = p;
            else if (p.name.includes("Rushing") && !newLineup.Rushing) newLineup.Rushing = p;
            else if (p.name.includes("Receiving") && !newLineup.Receiving) newLineup.Receiving = p;
            else if (p.name.includes("Defense") && !newLineup.Defense) newLineup.Defense = p;
            else if (p.name.includes("Kicking") && !newLineup.Kicking) newLineup.Kicking = p;
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

  // Totals
  const starterTotal = Object.values(lineup).reduce(
    (sum, p) => sum + (p?.points[selectedWeek] || 0),
    0
  );
  const benchTotal = bench.reduce((sum, p) => sum + (p.points[selectedWeek] || 0), 0);

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
    if (editing) {
      // Save lineup when done
      saveLineup(lineup);
    }
    setEditing(!editing);
  };

  return (
    <div className="team-page">
      <div className="team-header card-section">
        <h1>{team.name}</h1>
        <h2>Starter Total: {starterTotal}</h2>
        <button className="btn-link" onClick={toggleEditing}>
          {editing ? "Done" : "Edit Lineup"}
        </button>
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
        <ul className="player-list">
          {(["Passing", "Rushing", "Receiving", "Defense", "Kicking"] as const).map(
            (slot) =>
              lineup[slot] && (
                <li key={slot} className="player-card">
                  <strong>{lineup[slot]!.name}</strong> – Points: {lineup[slot]!.points[selectedWeek] || 0}
                  {editing && <button onClick={() => moveToBench(slot)}>Bench</button>}
                </li>
              )
          )}
        </ul>
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
                {editing && <button onClick={() => moveToLineup(p)}>Start</button>}
              </li>
            ))}
          </ul>
        ) : (
          <p>No bench players assigned yet.</p>
        )}
        <p><strong>Bench Total: {benchTotal}</strong></p>
      </section>

      <Link className="btn-link" to="/scoreboard">
        ⬅ Back to Scoreboard
      </Link>
    </div>
  );
}
