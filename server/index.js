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

// ==========================
// Routes
// ==========================

// TEAMS
app.get("/api/teams", async (req, res) => {
  try {
    const teams = await Team.find();
    res.json(
      teams.map((t) => ({
        ...t.toObject(),
        record: serializeRecord(t.record),
        lineup: serializeLineup(t.lineup),
      }))
    );
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/teams/:id", async (req, res) => {
  try {
    const team = await Team.findById(req.params.id);
    if (!team) return res.status(404).json({ error: "Team not found" });

    res.json({
      ...team.toObject(),
      record: serializeRecord(team.record),
      lineup: serializeLineup(team.lineup),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/teams", async (req, res) => {
  try {
    const team = new Team(req.body);
    await team.save();
    res.json({
      ...team.toObject(),
      record: serializeRecord(team.record),
      lineup: serializeLineup(team.lineup),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// UPDATE TEAM LINEUP
app.patch("/api/teams/:id/lineup", async (req, res) => {
  try {
    const { id } = req.params;
    const { lineup } = req.body;

    const team = await Team.findById(id);
    if (!team) return res.status(404).json({ message: "Team not found" });

    if (lineup && typeof lineup === "object") {
      const nextLineup = {};
      LINEUP_SLOTS.forEach((slot) => {
        const raw = lineup[slot];
        if (typeof raw === "string" && raw.trim()) {
          nextLineup[slot] = raw.trim();
        }
      });
      team.lineup = nextLineup;
      team.markModified("lineup");
    } else {
      team.lineup = {};
      team.markModified("lineup");
    }

    await team.save();

    res.json({
      ...team.toObject(),
      record: serializeRecord(team.record),
      lineup: serializeLineup(team.lineup),
    });
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

    res.json({
      ...team.toObject(),
      record: serializeRecord(team.record),
      lineup: serializeLineup(team.lineup),
    });
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

