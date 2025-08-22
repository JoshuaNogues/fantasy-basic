// server/index.js
import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const app = express();

// Enable CORS for front-end
app.use(cors({
  origin: "http://localhost:5173", // Vite default port
}));
app.use(express.json());

const PORT = process.env.PORT || 5000;

// ==========================
// Connect to MongoDB
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
// Get all teams
app.get("/api/teams", async (req, res) => {
  try {
    const teams = await Team.find();
    res.json(teams);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get a single team by ID
app.get("/api/teams/:id", async (req, res) => {
  try {
    const team = await Team.findById(req.params.id);
    if (!team) return res.status(404).json({ error: "Team not found" });
    res.json(team);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create a new team
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
// Get all players or filter by teamId
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

// Create a new player
app.post("/api/players", async (req, res) => {
  try {
    const player = new Player(req.body);
    await player.save();
    res.json(player);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update player points
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
  console.log(`Server running on http://localhost:${PORT}`);
});
