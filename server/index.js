// server/index.js
import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const app = express();

// ==========================
// CORS Configuration
// ==========================
// Allow local dev, Netlify frontend, and Fly.io domain
const allowedOrigins = [
  "http://localhost:5173",              // Vite dev
  "https://veefivefantasy.netlify.app", // Netlify prod
];

app.use(cors({
  origin: (origin, callback) => {
    console.log("Incoming request origin:", origin); // debug
    if (!origin) return callback(null, true);
    if (allowedOrigins.some(o => origin.startsWith(o))) {
      return callback(null, true);
    } else {
      console.warn("Blocked by CORS:", origin);
      return callback(new Error("Not allowed by CORS"));
    }
  }
}));

app.use(express.json());

const PORT = process.env.PORT || 5000;

// ==========================
// Connect to MongoDB Atlas
// ==========================
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB connected ✅"))
  .catch((err) => console.log("MongoDB connection error:", err));

// ==========================
// Mongoose Schemas
// ==========================
const teamSchema = new mongoose.Schema({
  name: { type: String, required: true },
});

const playerSchema = new mongoose.Schema({
  name: { type: String, required: true },
  teamId: { type: mongoose.Schema.Types.ObjectId, ref: "Team" },
  points: { type: Map, of: Number, default: {} },
});

const Team = mongoose.model("Team", teamSchema);
const Player = mongoose.model("Player", playerSchema);

// ==========================
// Routes
// ==========================

// --- TEAMS ---
app.get("/api/teams", async (req, res) => {
  try {
    const teams = await Team.find();
    res.json(teams);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/teams/:id", async (req, res) => {
  try {
    const team = await Team.findById(req.params.id);
    if (!team) return res.status(404).json({ error: "Team not found" });
    res.json(team);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/teams", async (req, res) => {
  try {
    const team = new Team(req.body);
    await team.save();
    res.json(team);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- PLAYERS ---
app.get("/api/players", async (req, res) => {
  try {
    const { teamId } = req.query;
    const query = teamId ? { teamId } : {};
    const players = await Player.find(query);
    res.json(players);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/players", async (req, res) => {
  try {
    const player = new Player(req.body);
    await player.save();
    res.json(player);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.patch("/api/players/:id/points", async (req, res) => {
  try {
    const { id } = req.params;
    const { week, points } = req.body;

    if (!week || typeof points !== "number") {
      return res.status(400).json({ message: "Week and points are required" });
    }

    const player = await Player.findById(id);
    if (!player) return res.status(404).json({ message: "Player not found" });

    player.points.set(week, points);
    await player.save();

    res.json(player);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// ==========================
// Start server
// ==========================
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Backend live! Use your Fly.io URL as the API base for frontend.`);
});
