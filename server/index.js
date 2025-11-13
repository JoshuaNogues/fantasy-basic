import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const app = express();

// ==========================
// CORS Configuration
// ==========================
const allowedOrigins = [
  "http://localhost:5173",
  "https://veefivefantasy.netlify.app",
];

// app.use(cors({
//   origin: (origin, callback) => {
//     console.log("Incoming request origin:", origin);
//     if (!origin) return callback(null, true); // allow non-browser requests
//     if (allowedOrigins.includes(origin)) {
//       return callback(null, true);
//     } else {
//       console.warn("Blocked by CORS:", origin);
//       return callback(new Error("Not allowed by CORS"));
//     }
//   }
// }));

app.use(cors({ origin: true }));

app.use(express.json());

const PORT = process.env.PORT || 8080;
const HOST = "0.0.0.0";

// ==========================
// Connect to MongoDB Atlas
// ==========================
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB connected ✅"))
  .catch((err) => console.log("MongoDB connection error:", err));

// ==========================
// Mongoose Schemas
// ==========================
const LINEUP_SLOTS = ["Passing", "Rushing", "Receiving", "Defense", "Kicking"];

const teamSchema = new mongoose.Schema({
  name: { type: String, required: true },
  lineup: {
    type: Map,
    of: String,
    default: {},
  },
  lineups: {
    type: Map,
    of: mongoose.Schema.Types.Mixed,
    default: {},
  },
  record: {
    type: Map,
    of: String,
    default: {},
  },
});

const playerSchema = new mongoose.Schema({
  name: { type: String, required: true },
  teamId: { type: mongoose.Schema.Types.ObjectId, ref: "Team" },
  points: { type: Map, of: Number, default: {} },
  position: { type: String, enum: LINEUP_SLOTS },
});

const Team = mongoose.model("Team", teamSchema);
const Player = mongoose.model("Player", playerSchema);

const settingsSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true },
  value: { type: mongoose.Schema.Types.Mixed, default: null },
});

settingsSchema.index({ key: 1 }, { unique: true });

const Setting = mongoose.model("Setting", settingsSchema);
const CURRENT_WEEK_KEY = "currentWeek";
const DEFAULT_WEEK = "week1";
const MATCHUPS_KEY = "matchups";

const serializeLineup = (lineup) => {
  if (!lineup) return {};
  const result = {};
  LINEUP_SLOTS.forEach((slot) => {
    const value =
      typeof lineup.get === "function" ? lineup.get(slot) : lineup?.[slot];
    if (value) result[slot] = value.toString();
  });
  return result;
};

const serializeRecord = (record) =>
  record ? Object.fromEntries(record) : {};

const serializeLineups = (lineups) => {
  if (!lineups) return {};
  const result = {};
  const entries =
    typeof lineups.entries === "function"
      ? Array.from(lineups.entries())
      : Object.entries(lineups);

  entries.forEach(([week, lineup]) => {
    const serialized = serializeLineup(lineup);
    if (Object.keys(serialized).length) {
      result[week] = serialized;
    }
  });

  return result;
};

const sanitizeLineup = (lineup) => {
  if (!lineup || typeof lineup !== "object") return {};
  const nextLineup = {};
  LINEUP_SLOTS.forEach((slot) => {
    const raw =
      typeof lineup.get === "function" ? lineup.get(slot) : lineup?.[slot];
    if (typeof raw === "string" && raw.trim()) {
      nextLineup[slot] = raw.trim();
    }
  });
  return nextLineup;
};

const normalizeWeekKey = (week) => {
  if (typeof week !== "string") return null;
  const trimmed = week.trim().toLowerCase();
  if (!/^week\d+$/.test(trimmed)) return null;
  return trimmed;
};

const getCurrentWeek = async () => {
  const setting = await Setting.findOne({ key: CURRENT_WEEK_KEY });
  const storedWeek = normalizeWeekKey(setting?.value);
  return storedWeek ?? DEFAULT_WEEK;
};

const setCurrentWeek = async (week) => {
  const normalized = normalizeWeekKey(week);
  if (!normalized) throw new Error("Invalid week value");

  const updated = await Setting.findOneAndUpdate(
    { key: CURRENT_WEEK_KEY },
    { value: normalized },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  return normalizeWeekKey(updated.value) ?? DEFAULT_WEEK;
};

const ensureMatchupsSetting = async () => {
  let setting = await Setting.findOne({ key: MATCHUPS_KEY });
  if (!setting) {
    setting = new Setting({ key: MATCHUPS_KEY, value: {} });
    await setting.save();
  }
  if (!setting.value || typeof setting.value !== "object") {
    setting.value = {};
  }
  return setting;
};

const normalizeMatchupsValue = (value) => {
  if (!value || typeof value !== "object") return {};
  return Object.entries(value).reduce((acc, [weekKey, pairings]) => {
    const normalizedWeek = normalizeWeekKey(weekKey);
    if (!normalizedWeek) return acc;
    if (!pairings || typeof pairings !== "object") {
      acc[normalizedWeek] = {};
      return acc;
    }
    const cleaned = {};
    Object.entries(pairings).forEach(([teamId, opponentId]) => {
      if (
        typeof teamId === "string" &&
        typeof opponentId === "string" &&
        teamId &&
        opponentId
      ) {
        cleaned[teamId] = opponentId;
      }
    });
    acc[normalizedWeek] = cleaned;
    return acc;
  }, {});
};

const getMatchupsMap = async () => {
  const setting = await ensureMatchupsSetting();
  return normalizeMatchupsValue(setting.value);
};

const saveMatchupsMap = async (nextValue) => {
  const setting = await ensureMatchupsSetting();
  setting.value = nextValue;
  await setting.save();
  return normalizeMatchupsValue(setting.value);
};

const formatTeam = (team) => {
  const plain = team.toObject();
  const serializedLineups = serializeLineups(team.lineups ?? plain.lineups);

  let serializedLineup = serializeLineup(team.lineup ?? plain.lineup);
  if (!Object.keys(serializedLineup).length) {
    const firstEntry = Object.entries(serializedLineups)[0];
    if (firstEntry) {
      serializedLineup = firstEntry[1];
    }
  }
  if (!Object.keys(serializedLineups).length && Object.keys(serializedLineup).length) {
    serializedLineups["week1"] = serializedLineup;
  }

  return {
    ...plain,
    record: serializeRecord(team.record ?? plain.record),
    lineup: serializedLineup,
    lineups: serializedLineups,
  };
};

// ==========================
// Routes
// ==========================

// SETTINGS
app.get("/api/settings/current-week", async (req, res) => {
  try {
    const currentWeek = await getCurrentWeek();
    res.json({ currentWeek });
  } catch (err) {
    console.error("Error fetching current week:", err);
    res.status(500).json({ message: "Server error" });
  }
});

app.patch("/api/settings/current-week", async (req, res) => {
  try {
    const { week } = req.body;
    if (!week) {
      return res.status(400).json({ message: "Week value is required" });
    }

    let normalizedWeek;
    try {
      normalizedWeek = await setCurrentWeek(week);
    } catch (error) {
      return res.status(400).json({ message: "Invalid week format" });
    }

    res.json({ currentWeek: normalizedWeek });
  } catch (err) {
    console.error("Error updating current week:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// MATCHUPS
app.get("/api/matchups", async (req, res) => {
  try {
    const matchups = await getMatchupsMap();
    res.json(matchups);
  } catch (err) {
    console.error("Error fetching matchups:", err);
    res.status(500).json({ message: "Server error" });
  }
});

app.get("/api/matchups/:week", async (req, res) => {
  try {
    const weekKey = normalizeWeekKey(req.params.week);
    if (!weekKey) {
      return res.status(400).json({ message: "Invalid week parameter" });
    }
    const matchups = await getMatchupsMap();
    res.json(matchups[weekKey] ?? {});
  } catch (err) {
    console.error("Error fetching weekly matchups:", err);
    res.status(500).json({ message: "Server error" });
  }
});

app.put("/api/matchups/:week", async (req, res) => {
  try {
    const weekKey = normalizeWeekKey(req.params.week);
    if (!weekKey) {
      return res.status(400).json({ message: "Invalid week parameter" });
    }

    const { pairings } = req.body;
    if (!Array.isArray(pairings)) {
      return res
        .status(400)
        .json({ message: "Pairings array is required to set matchups" });
    }

    const cleanedPairs = pairings
      .map((pair) => ({
        teamA:
          typeof pair.teamA === "string" ? pair.teamA.trim() : "",
        teamB:
          typeof pair.teamB === "string" ? pair.teamB.trim() : "",
      }))
      .filter((pair) => pair.teamA && pair.teamB);

    const assigned = new Set();
    const weekMatchups = {};

    for (const { teamA, teamB } of cleanedPairs) {
      if (teamA === teamB) {
        return res
          .status(400)
          .json({ message: "A team cannot be matched against itself" });
      }
      if (assigned.has(teamA) || assigned.has(teamB)) {
        return res
          .status(400)
          .json({ message: "Each team can only appear in one matchup per week" });
      }
      assigned.add(teamA);
      assigned.add(teamB);
      weekMatchups[teamA] = teamB;
      weekMatchups[teamB] = teamA;
    }

    const existing = await getMatchupsMap();
    if (Object.keys(weekMatchups).length) {
      existing[weekKey] = weekMatchups;
    } else {
      delete existing[weekKey];
    }

    const persisted = await saveMatchupsMap(existing);
    res.json(persisted[weekKey] ?? {});
  } catch (err) {
    console.error("Error saving matchups:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// TEAMS
app.get("/api/teams", async (req, res) => {
  try {
    const teams = await Team.find();
    res.json(teams.map((team) => formatTeam(team)));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/teams/:id", async (req, res) => {
  try {
    const team = await Team.findById(req.params.id);
    if (!team) return res.status(404).json({ error: "Team not found" });

    res.json(formatTeam(team));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/teams", async (req, res) => {
  try {
    const team = new Team(req.body);
    await team.save();
    res.json(formatTeam(team));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// UPDATE TEAM LINEUP
app.patch("/api/teams/:id/lineup", async (req, res) => {
  try {
    const { id } = req.params;
    const { lineup, week } = req.body;

    const team = await Team.findById(id);
    if (!team) return res.status(404).json({ message: "Team not found" });

    const weekKey =
      typeof week === "string" && week.trim() ? week.trim() : "week1";

    const nextLineup = sanitizeLineup(lineup);
    const hasLineupEntries = Object.keys(nextLineup).length > 0;

    let lineupsMap;
    if (team.lineups instanceof Map) {
      lineupsMap = team.lineups;
    } else {
      lineupsMap = new Map(
        team.lineups ? Object.entries(team.lineups) : []
      );
      team.lineups = lineupsMap;
    }

    if (hasLineupEntries) {
      lineupsMap.set(weekKey, nextLineup);
    } else {
      lineupsMap.delete(weekKey);
    }
    team.markModified("lineups");

    team.lineup = nextLineup;
    team.markModified("lineup");

    await team.save();

    res.json(formatTeam(team));
  } catch (err) {
    console.error("Error updating lineup:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// UPDATE TEAM RECORD
app.patch("/api/teams/:id/record", async (req, res) => {
  try {
    const { id } = req.params;
    const { week, result } = req.body;

    if (!week || !["W", "L"].includes(result)) {
      return res
        .status(400)
        .json({ message: "Valid week and result ('W' or 'L') required" });
    }

    const team = await Team.findById(id);
    if (!team) return res.status(404).json({ message: "Team not found" });

    team.record.set(week, result);
    await team.save();

    res.json(formatTeam(team));
  } catch (err) {
    console.error("Error updating record:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// PLAYERS
app.get("/api/players", async (req, res) => {
  try {
    const { teamId } = req.query;
    const query = teamId ? { teamId } : {};
    const players = await Player.find(query);
    res.json(
      players.map((p) => ({
        ...p.toObject(),
        points: Object.fromEntries(p.points),
      }))
    );
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/players", async (req, res) => {
  try {
    const payload = {
      ...req.body,
      position: req.body.position || undefined,
    };
    const player = new Player(payload);
    await player.save();
    res.json({
      ...player.toObject(),
      points: Object.fromEntries(player.points),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.patch("/api/players/:id/points", async (req, res) => {
  try {
    const { id } = req.params;
    const { week, points } = req.body;

    if (!week || typeof points !== "number") {
      return res
        .status(400)
        .json({ message: "Week and points are required" });
    }

    const player = await Player.findById(id);
    if (!player) return res.status(404).json({ message: "Player not found" });

    player.points.set(week, points);
    await player.save();

    res.json({
      ...player.toObject(),
      points: Object.fromEntries(player.points),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// ==========================
// Start server
// ==========================
app.listen(PORT, HOST, () => {
  console.log(`Server running on http://${HOST}:${PORT}`);
});

