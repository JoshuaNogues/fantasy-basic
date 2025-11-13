// src/Pages/TeamPage.tsx
import { useParams, Link } from "react-router-dom";
import { useEffect, useMemo, useRef, useState } from "react";
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
  lineups?: Record<string, Partial<Record<LineupSlot, string | null>>>;
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
type MatchupMap = Record<string, Record<string, string>>;

interface OpponentInfo {
  teamId: string;
  name: string;
  starterTotal: number;
}

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

const mapServerPlayer = (player: any): Player => ({
  _id:
    extractPlayerId(player?._id) ??
    (typeof player?._id === "string"
      ? player._id
      : String(player?._id ?? "")),
  name: player?.name ?? "Unknown Player",
  teamId: player?.teamId
    ? extractPlayerId(player.teamId) ?? String(player.teamId)
    : undefined,
  points: player?.points ?? {},
  position: normalizeLineupSlot(player?.position),
});

const mapServerLineups = (
  rawLineups: Team["lineups"],
  roster: Player[]
): Record<string, Lineup> => {
  if (!rawLineups) return {};
  return Object.entries(rawLineups).reduce((acc, [weekKey, lineup]) => {
    acc[weekKey] = mapServerLineup(lineup, roster);
    return acc;
  }, {} as Record<string, Lineup>);
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

const pickLineupForWeek = (
  lineups: Record<string, Lineup>,
  fallback: Lineup | undefined,
  week: string
): Lineup | undefined => {
  if (lineups[week]) return lineups[week];
  const weekNum = parseWeekNumber(week);
  if (weekNum === null) return fallback;

  const entries = Object.entries(lineups)
    .map(([weekKey, lineup]) => ({
      weekKey,
      num: parseWeekNumber(weekKey),
      lineup,
    }))
    .filter(
      (entry): entry is { weekKey: string; num: number; lineup: Lineup } =>
        entry.num !== null
    )
    .sort((a, b) => b.num - a.num);

  const fallbackEntry =
    entries.find((entry) => entry.num <= weekNum) ?? entries[0];

  return fallbackEntry?.lineup ?? fallback;
};

const lineupToPayload = (lineup: Lineup) =>
  Object.fromEntries(
    LINEUP_SLOTS.map((slot) => [slot, lineup[slot]?._id ?? null])
  );

const parseWeekNumber = (week: string): number | null => {
  const parsed = Number.parseInt(week.replace("week", ""), 10);
  return Number.isNaN(parsed) ? null : parsed;
};

const formatWeekLabel = (weekKey: string) => {
  const weekNum = parseWeekNumber(weekKey);
  if (weekNum === null) return weekKey;
  return `Week ${weekNum}`;
};

const sumStarterPoints = (lineup: Lineup | undefined, week: string) => {
  if (!lineup) return 0;
  return LINEUP_SLOTS.reduce(
    (sum, slot) => sum + (lineup[slot]?.points?.[week] ?? 0),
    0
  );
};

export default function TeamPage() {
  const { id } = useParams<{ id: string }>();
  const [team, setTeam] = useState<Team | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [lineupsByWeek, setLineupsByWeek] = useState<Record<string, Lineup>>({});
  const [selectedWeek, setSelectedWeek] = useState("week1");
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [matchupsByWeek, setMatchupsByWeek] = useState<MatchupMap>({});
  const [opponentInfo, setOpponentInfo] = useState<OpponentInfo | null>(null);
  const [opponentLoading, setOpponentLoading] = useState(false);
  const opponentCacheRef = useRef<Record<string, { team: Team; players: Player[] }>>({});

  const API_URL = import.meta.env.VITE_API_BASE;

  const currentLineup = useMemo(
    () => lineupsByWeek[selectedWeek] ?? {},
    [lineupsByWeek, selectedWeek]
  );

  const bench = useMemo(() => {
    if (!players.length) return [] as Player[];
    const starterIds = new Set(
      LINEUP_SLOTS.map((slot) => currentLineup[slot]?._id).filter(Boolean) as string[]
    );
    return players.filter((player) => !starterIds.has(player._id));
  }, [players, currentLineup]);

  const saveLineup = async (
    weekKey: string,
    lineupToSave: Lineup,
    rosterOverride?: Player[]
  ) => {
    if (!id) return;
    const roster = rosterOverride ?? players;

    try {
      const response = await fetch(`${API_URL}/api/teams/${id}/lineup`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          week: weekKey,
          lineup: lineupToPayload(lineupToSave),
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to save lineup: ${response.status}`);
      }

      const updatedTeam: Team = await response.json();
      setTeam(updatedTeam);

      const syncedLineups = mapServerLineups(updatedTeam.lineups, roster);
      if (!Object.keys(syncedLineups).length) {
        const fallback = mapServerLineup(updatedTeam.lineup, roster);
        if (Object.keys(fallback).length) {
          syncedLineups[weekKey] = fallback;
        }
      }
      setLineupsByWeek(syncedLineups);
    } catch (error) {
      console.error("Failed to save lineup", error);
    }
  };

  useEffect(() => {
    if (!id) {
      setTeam(null);
      setPlayers([]);
      setLineupsByWeek({});
      setLoading(false);
      return;
    }

    let isMounted = true;

    const fetchData = async () => {
      setLoading(true);
      try {
        const [teamRes, playersRes, currentWeekRes] = await Promise.all([
          fetch(`${API_URL}/api/teams/${id}`),
          fetch(`${API_URL}/api/players?teamId=${id}`),
          fetch(`${API_URL}/api/settings/current-week`),
        ]);

        if (!teamRes.ok) throw new Error(`Failed to fetch team: ${teamRes.status}`);
        if (!playersRes.ok)
          throw new Error(`Failed to fetch players: ${playersRes.status}`);
        if (!currentWeekRes.ok)
          throw new Error(`Failed to fetch current week: ${currentWeekRes.status}`);

        const teamData: Team = await teamRes.json();
        const playersRaw = await playersRes.json();
        const currentWeekData = await currentWeekRes.json();
        const resolvedWeek =
          typeof currentWeekData?.currentWeek === "string"
            ? currentWeekData.currentWeek
            : "week1";

        const roster: Player[] = Array.isArray(playersRaw)
          ? (playersRaw as any[]).map((player) => mapServerPlayer(player))
          : [];

        if (!isMounted) return;

        setSelectedWeek((prev) => (prev === resolvedWeek ? prev : resolvedWeek));
        setTeam(teamData);
        setPlayers(roster);

        let mappedLineups = mapServerLineups(teamData.lineups, roster);
        if (!Object.keys(mappedLineups).length) {
          const fallbackLineup = mapServerLineup(teamData.lineup, roster);
          if (Object.keys(fallbackLineup).length) {
            mappedLineups = { [resolvedWeek]: fallbackLineup };
          }
        }

        if (!Object.keys(mappedLineups).length && roster.length) {
          const defaultLineup = buildDefaultLineup(roster);
          mappedLineups = { [resolvedWeek]: defaultLineup };
          void saveLineup(resolvedWeek, defaultLineup, roster);
        }

        setLineupsByWeek(mappedLineups);
      } catch (error) {
        console.error(error);
        if (!isMounted) return;
        setTeam(null);
        setPlayers([]);
        setLineupsByWeek({});
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    void fetchData();

    return () => {
      isMounted = false;
    };
  }, [id, API_URL]);

  useEffect(() => {
    const fetchMatchups = async () => {
      try {
        const response = await fetch(`${API_URL}/api/matchups`);
        if (!response.ok) throw new Error("Failed to fetch matchups");
        const data = await response.json();
        setMatchupsByWeek(data);
      } catch (error) {
        console.error("Error fetching matchups:", error);
      }
    };

    fetchMatchups();
  }, [API_URL]);

  useEffect(() => {
    if (!team?._id) {
      setOpponentInfo(null);
      return;
    }

    const weekMap = matchupsByWeek[selectedWeek];
    const opponentId = weekMap?.[team._id];

    if (!opponentId) {
      setOpponentInfo(null);
      return;
    }

    let cancelled = false;

    const loadOpponent = async () => {
      setOpponentLoading(true);
      try {
        const cache = opponentCacheRef.current;
        let cached = cache[opponentId];

        if (!cached) {
          const [opponentTeamRes, opponentPlayersRes] = await Promise.all([
            fetch(`${API_URL}/api/teams/${opponentId}`),
            fetch(`${API_URL}/api/players?teamId=${opponentId}`),
          ]);

          if (!opponentTeamRes.ok) {
            throw new Error("Failed to fetch opponent team");
          }
          if (!opponentPlayersRes.ok) {
            throw new Error("Failed to fetch opponent players");
          }

          const opponentTeamData: Team = await opponentTeamRes.json();
          const opponentPlayersRaw = await opponentPlayersRes.json();
          const opponentRoster: Player[] = Array.isArray(opponentPlayersRaw)
            ? opponentPlayersRaw.map((player: any) => mapServerPlayer(player))
            : [];

          cached = { team: opponentTeamData, players: opponentRoster };
          cache[opponentId] = cached;
        }

        const opponentLineups = mapServerLineups(
          cached.team.lineups,
          cached.players
        );
        const fallbackLineup = mapServerLineup(
          cached.team.lineup,
          cached.players
        );
        let resolvedLineup = pickLineupForWeek(
          opponentLineups,
          fallbackLineup,
          selectedWeek
        );
        if (!resolvedLineup && cached.players.length) {
          resolvedLineup = buildDefaultLineup(cached.players);
        }
        const starterTotal = sumStarterPoints(resolvedLineup, selectedWeek);

        if (!cancelled) {
          setOpponentInfo({
            teamId: opponentId,
            name: cached.team.name,
            starterTotal,
          });
        }
      } catch (error) {
        console.error("Error loading opponent info:", error);
        if (!cancelled) {
          setOpponentInfo(null);
        }
      } finally {
        if (!cancelled) {
          setOpponentLoading(false);
        }
      }
    };

    void loadOpponent();

    return () => {
      cancelled = true;
    };
  }, [API_URL, team?._id, matchupsByWeek, selectedWeek]);

  useEffect(() => {
    setLineupsByWeek((current) => {
      if (current[selectedWeek]) return current;

      const entries = Object.keys(current);
      if (!entries.length) {
        if (!players.length) return current;
        const defaultLineup = buildDefaultLineup(players);
        if (!Object.keys(defaultLineup).length) return current;
        return { ...current, [selectedWeek]: defaultLineup };
      }

      const parseWeekNumber = (value: string): number | null => {
        const parsed = Number.parseInt(value.replace("week", ""), 10);
        return Number.isNaN(parsed) ? null : parsed;
      };

      const targetWeek = parseWeekNumber(selectedWeek);

      const weekEntries = entries
        .map((weekKey) => ({ weekKey, num: parseWeekNumber(weekKey) }))
        .filter(
          (entry): entry is { weekKey: string; num: number } =>
            entry.num !== null
        )
        .sort((a, b) => b.num - a.num);

      const fallbackWeek =
        weekEntries.find((entry) =>
          targetWeek === null ? true : entry.num <= targetWeek
        )?.weekKey ?? weekEntries[0]?.weekKey;

      if (!fallbackWeek) return current;

      const fallbackLineup = current[fallbackWeek];
      if (!fallbackLineup) return current;

      return {
        ...current,
        [selectedWeek]: { ...fallbackLineup },
      };
    });
  }, [selectedWeek, players]);

  if (loading) return null;

  if (!team) {
    return (
      <div className="team-page">
        <div className="team-panel team-panel--empty">
          <h1>Team Not Found</h1>
          <p className="team-empty-copy">
            We couldn&apos;t locate that roster. Head back to fantasy to pick a different squad.
          </p>
          <Link className="scoreboard-back" to="/fantasy">
            Back to Fantasy
          </Link>
        </div>
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

  const starterTotal = Object.values(currentLineup).reduce(
    (sum, player) => sum + (player?.points[selectedWeek] || 0),
    0
  );
  const benchTotal = bench.reduce(
    (sum, player) => sum + (player.points[selectedWeek] || 0),
    0
  );

  const moveToBench = (slot: LineupSlot) => {
    setLineupsByWeek((current) => {
      const existing = current[selectedWeek] ?? {};
      if (!existing[slot]) return current;
      const next = { ...existing };
      delete next[slot];
      const updated = { ...current, [selectedWeek]: next };
      if (editing) void saveLineup(selectedWeek, next);
      return updated;
    });
  };

  const moveToLineup = (player: Player) => {
    setLineupsByWeek((current) => {
      const slot = player.position;
      if (!slot) {
        console.warn(`Cannot move ${player.name} to lineup without a position`);
        return current;
      }
      const existing = current[selectedWeek] ?? {};
      const next = { ...existing, [slot]: player };
      const updated = { ...current, [selectedWeek]: next };
      if (editing) void saveLineup(selectedWeek, next);
      return updated;
    });
  };

  const toggleEditing = () => {
    if (editing) {
      void saveLineup(selectedWeek, currentLineup);
    }
    setEditing((prev) => !prev);
  };

  const weekLabel = formatWeekLabel(selectedWeek);
  const weekResult = team?.record?.[selectedWeek] ?? "-";

  return (
    <div className="team-page">
      <div className="team-panel">
        <header className="team-hero">
          <div className="team-hero__row">
            <span className="team-tag">Team Spotlight</span>
            <span className="team-record-pill">
              {wins}-{losses} overall
            </span>
          </div>
          <h1>{team?.name ?? "Unknown Team"}</h1>
          <div className="team-hero__metrics">
            <div className="metric metric--starter">
              <span className="metric-label">Starter Points</span>
              <span className="metric-value">{starterTotal.toFixed(2)}</span>
            </div>
            <div className="metric metric--opponent">
              <span className="metric-label">Opponent</span>
              <span className="metric-value metric-value--opponent">
                {opponentLoading
                  ? "Loading..."
                  : opponentInfo
                  ? `${opponentInfo.name.toUpperCase()} - ${opponentInfo.starterTotal.toFixed(2)}`
                  : "TBD"}
              </span>
            </div>
            <div className="metric metric--result">
              <span className="metric-label">{weekLabel} Result</span>
              <span className="metric-value">{weekResult}</span>
            </div>
          </div>
          <div className="team-hero__controls">
            <div className="week-summary">
              <span className="week-label">{weekLabel}</span>
              <span className="week-result-note">
                Showing lineup performance and record for this week.
              </span>
            </div>
            <div className="week-selector">
              <label htmlFor="team-week-select">Select week</label>
              <select
                id="team-week-select"
                value={selectedWeek}
                onChange={(event) => setSelectedWeek(event.target.value)}
              >
                {Array.from({ length: 17 }, (_, index) => (
                  <option key={`week${index + 1}`} value={`week${index + 1}`}>
                    {`Week ${index + 1}`}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </header>

        <div className="lineup-grid">
          <section className="lineup-card">
            <header className="lineup-card__header">
              <div>
                <h2>Starters</h2>
                <p>Locked-in starters delivering points for {weekLabel}.</p>
              </div>
              <button
                type="button"
                className="lineup-toggle"
                onClick={toggleEditing}
              >
                {editing ? "Done Editing" : "Edit Lineup"}
              </button>
            </header>
            <ul className="lineup-list">
              {LINEUP_SLOTS.map((slot) => {
                const starter = currentLineup[slot];
                if (!starter) return null;
                return (
                  <li key={slot} className="lineup-item">
                    <div className="lineup-item__info">
                      <span className="lineup-slot">{slot}</span>
                      <div className="lineup-player">
                        <strong>{starter.name}</strong>
                        <span className="lineup-points">
                          {(starter.points[selectedWeek] || 0).toFixed(2)} pts
                        </span>
                      </div>
                    </div>
                    {editing && (
                      <button
                        type="button"
                        className="lineup-action"
                        onClick={() => moveToBench(slot)}
                      >
                        Bench
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
            <div className="lineup-card__footer">
              <span>Total Starter Points</span>
              <strong>{starterTotal.toFixed(2)}</strong>
            </div>
          </section>

          <section className="lineup-card lineup-card--bench">
            <header className="lineup-card__header">
              <div>
                <h2>Bench</h2>
                <p>Ready to step in when you swap the lineup.</p>
              </div>
            </header>
            {bench.length > 0 ? (
              <ul className="lineup-list">
                {bench.map((player) => (
                  <li key={player._id} className="lineup-item lineup-item--bench">
                    <div className="lineup-item__info">
                      <span className="lineup-slot">
                        {player.position ?? "Bench"}
                      </span>
                      <div className="lineup-player">
                        <strong>{player.name}</strong>
                        <span className="lineup-points">
                          {(player.points[selectedWeek] || 0).toFixed(2)} pts
                        </span>
                      </div>
                    </div>
                    {editing && (
                      <button
                        type="button"
                        className="lineup-action"
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
              <p className="lineup-empty">No bench players assigned yet.</p>
            )}
            <div className="lineup-card__footer">
              <span>Total Bench Points</span>
              <strong>{benchTotal.toFixed(2)}</strong>
            </div>
          </section>
        </div>

        <footer className="team-footer">
          <Link className="scoreboard-back" to="/scoreboard">
            View League Scoreboard
          </Link>
        </footer>
      </div>
    </div>
  );
}
