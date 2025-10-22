// src/Pages/TeamPage.tsx
import { useParams, Link } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import {
  LINEUP_SLOTS,
  type LineupSlot,
  normalizeLineupSlot,
} from "../constants/lineup";
import "../App.css";

interface Team {
  _id: string;
  name: string;
  lineup?: Partial<Record<LineupSlot, string | null>>;
  record?: Record<string, "W" | "L">;
}

interface Player {
  _id: string;
  name: string;
  teamId?: string;
  points: Record<string, number>;
  position?: LineupSlot;
}

type Lineup = Partial<Record<LineupSlot, Player>>;

const extractPlayerId = (value: unknown): string | null => {
  if (!value) return null;
  if (typeof value === "string") return value;
  if (typeof value === "object") {
    if (value && typeof (value as { $oid?: unknown }).$oid === "string") {
      return (value as { $oid: string }).$oid;
    }
    if (value && "toString" in value) {
      const stringified = (value as { toString: () => string }).toString();
      if (stringified && stringified !== "[object Object]") return stringified;
    }
  }
  return null;
};

const mapServerLineup = (rawLineup: Team["lineup"], roster: Player[]): Lineup => {
  const starters: Lineup = {};
  if (!rawLineup) return starters;

  for (const slot of LINEUP_SLOTS) {
    const playerId = extractPlayerId(rawLineup?.[slot]);
    if (!playerId) continue;
    const player = roster.find((p) => p._id === playerId);
    if (player) starters[slot] = player;
  }

  return starters;
};

const buildDefaultLineup = (roster: Player[]): Lineup => {
  const starters: Lineup = {};
  const taken = new Set<string>();

  for (const slot of LINEUP_SLOTS) {
    const candidate = roster.find(
      (player) => player.position === slot && !taken.has(player._id)
    );
    if (candidate) {
      starters[slot] = candidate;
      taken.add(candidate._id);
    }
  }

  for (const slot of LINEUP_SLOTS) {
    if (!starters[slot]) {
      const fallback = roster.find((player) => !taken.has(player._id));
      if (fallback) {
        starters[slot] = fallback;
        taken.add(fallback._id);
      }
    }
  }

  return starters;
};

const lineupToPayload = (lineup: Lineup) =>
  Object.fromEntries(
    LINEUP_SLOTS.map((slot) => [slot, lineup[slot]?._id ?? null])
  );

export default function TeamPage() {
  const { id } = useParams<{ id: string }>();
  const [team, setTeam] = useState<Team | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [lineup, setLineup] = useState<Lineup>({});
  const [selectedWeek, setSelectedWeek] = useState("week1");
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);

  const API_URL = import.meta.env.VITE_API_BASE;

  const bench = useMemo(() => {
    if (!players.length) return [] as Player[];
    const starterIds = new Set(
      LINEUP_SLOTS.map((slot) => lineup[slot]?._id).filter(Boolean) as string[]
    );
    return players.filter((player) => !starterIds.has(player._id));
  }, [players, lineup]);

  const saveLineup = async (lineupToSave: Lineup, rosterOverride?: Player[]) => {
    if (!id) return;
    const roster = rosterOverride ?? players;

    try {
      const response = await fetch(`${API_URL}/api/teams/${id}/lineup`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lineup: lineupToPayload(lineupToSave) }),
      });

      if (!response.ok) {
        throw new Error(`Failed to save lineup: ${response.status}`);
      }

      const updatedTeam: Team = await response.json();
      setTeam(updatedTeam);

      const synced = mapServerLineup(updatedTeam.lineup, roster);
      if (Object.keys(synced).length) {
        setLineup(synced);
      }
    } catch (error) {
      console.error("Failed to save lineup", error);
    }
  };

  useEffect(() => {
    if (!id) {
      setTeam(null);
      setPlayers([]);
      setLineup({});
      setLoading(false);
      return;
    }

    let isMounted = true;

    const fetchData = async () => {
      setLoading(true);
      try {
        const [teamRes, playersRes] = await Promise.all([
          fetch(`${API_URL}/api/teams/${id}`),
          fetch(`${API_URL}/api/players?teamId=${id}`),
        ]);

        if (!teamRes.ok) throw new Error(`Failed to fetch team: ${teamRes.status}`);
        if (!playersRes.ok)
          throw new Error(`Failed to fetch players: ${playersRes.status}`);

        const teamData: Team = await teamRes.json();
        const playersRaw = await playersRes.json();
        const roster: Player[] = (playersRaw as any[]).map((player) => ({
          _id:
            extractPlayerId(player?._id) ??
            (typeof player?._id === "string" ? player._id : String(player?._id ?? "")),
          name: player?.name ?? "Unknown Player",
          teamId: player?.teamId
            ? extractPlayerId(player.teamId) ?? String(player.teamId)
            : undefined,
          points: player?.points ?? {},
          position: normalizeLineupSlot(player?.position),
        }));

        if (!isMounted) return;

        setTeam(teamData);
        setPlayers(roster);

        const mappedLineup = mapServerLineup(teamData.lineup, roster);
        if (Object.keys(mappedLineup).length) {
          setLineup(mappedLineup);
        } else {
          const defaultLineup = buildDefaultLineup(roster);
          setLineup(defaultLineup);
          if (roster.length) void saveLineup(defaultLineup, roster);
        }
      } catch (error) {
        console.error(error);
        if (!isMounted) return;
        setTeam(null);
        setPlayers([]);
        setLineup({});
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    void fetchData();

    return () => {
      isMounted = false;
    };
  }, [id, API_URL]);

  if (loading) return null;

  if (!team) {
    return (
      <div className="team-page">
        <h1>Team Not Found</h1>
        <Link className="btn-link" to="/fantasy">
          ? Back to Fantasy
        </Link>
      </div>
    );
  }

  const getCumulativeRecord = (team: Team, week: string) => {
    if (!team.record) return { wins: 0, losses: 0 };
    let wins = 0;
    let losses = 0;
    const weekNum = parseInt(week.replace("week", ""));
    for (let i = 1; i <= weekNum; i++) {
      const weekKey = `week${i}`;
      if (team.record[weekKey] === "W") wins++;
      if (team.record[weekKey] === "L") losses++;
    }
    return { wins, losses };
  };

  const { wins, losses } = getCumulativeRecord(team, selectedWeek);

  const starterTotal = Object.values(lineup).reduce(
    (sum, player) => sum + (player?.points[selectedWeek] || 0),
    0
  );
  const benchTotal = bench.reduce(
    (sum, player) => sum + (player.points[selectedWeek] || 0),
    0
  );

  const moveToBench = (slot: LineupSlot) => {
    setLineup((current) => {
      if (!current[slot]) return current;
      const next = { ...current };
      delete next[slot];
      if (editing) void saveLineup(next);
      return next;
    });
  };

  const moveToLineup = (player: Player) => {
    setLineup((current) => {
      const slot = player.position;
      if (!slot) {
        console.warn(`Cannot move ${player.name} to lineup without a position`);
        return current;
      }
      const next = { ...current, [slot]: player };
      if (editing) void saveLineup(next);
      return next;
    });
  };

  const toggleEditing = () => {
    if (editing) {
      void saveLineup(lineup);
    }
    setEditing((prev) => !prev);
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
          <h2>Points: {starterTotal.toFixed(2)}</h2>
          <select
            value={selectedWeek}
            onChange={(event) => setSelectedWeek(event.target.value)}
          >
            {Array.from({ length: 17 }, (_, index) => (
              <option key={`week${index + 1}`} value={`week${index + 1}`}>
                {index < 14 ? `Week ${index + 1}` : `Playoff/Champ ${index - 13}`}
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
          {LINEUP_SLOTS.map(
            (slot) =>
              lineup[slot] && (
                <li key={slot} className="player-card">
                  <strong>
                    {lineup[slot]!.name}
                  </strong>{" "}
                  Points:{" "}
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
            {bench.map((player) => (
              <li key={player._id} className="player-card">
                <strong>
                  {player.name}
                </strong>{" "}
                Points:{" "}
                {(player.points[selectedWeek] || 0).toFixed(2)}
                {editing && (
                  <button
                    onClick={() => moveToLineup(player)}
                    disabled={!player.position}
                    title={
                      player.position
                        ? undefined
                        : "Assign a position to this player before starting"
                    }
                  >
                    Start
                  </button>
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
        
        View League Scoreboard
      </Link>
    </div>
  );
}
