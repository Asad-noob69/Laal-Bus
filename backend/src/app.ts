import express from "express";
import http from "http";
import { Server, Socket } from "socket.io";
import cors from "cors";
import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

app.use(cors());
app.use(express.json());

// MongoDB connection
const mongoUri = process.env.MONGODB_URI;
if (!mongoUri) {
  throw new Error("MONGODB_URI is not defined in the environment variables");
}
mongoose.connect(mongoUri);

// Driver model
const DriverSchema = new mongoose.Schema({
  socketId: String,
  isActive: Boolean,
});

const Driver = mongoose.model("Driver", DriverSchema);

app.get("/", (req, res) => {
  res.send("WebSocket server is running");
});

// New route for driver login
app.post("/driver/login", async (req, res) => {
  const { password } = req.body;
  if (password === process.env.DRIVER_PASSWORD) {
    res.json({ success: true });
  } else {
    res.status(401).json({ success: false, message: "Invalid password" });
  }
});

// New route to get the number of active drivers
app.get("/drivers/active-count", async (req, res) => {
  try {
    const count = await Driver.countDocuments({ isActive: true });
    res.json({ count });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error" });
  }
});

interface DriverLocation {
  latitude: number;
  longitude: number;
}

interface DriverData {
  id: string;
  position: DriverLocation;
}

const drivers: { [key: string]: DriverLocation } = {};

io.on("connection", (socket: Socket) => {
  console.log("A user connected:", socket.id);

  socket.on("driver-login", async () => {
    await Driver.findOneAndUpdate(
      { socketId: socket.id },
      { socketId: socket.id, isActive: true },
      { upsert: true, new: true }
    );
    io.emit("active-drivers-updated");
  });

  socket.on("updateLocation", (data: DriverData) => {
    console.log("Updated data received from the driver: ", data);

    const { id, position } = data;

    if (!id || !position) {
      console.error("Invalid data received:", data);
      return;
    }

    drivers[id] = position;

    console.log("Driver location stored:", { id, position });

    io.emit("driverLocationUpdate", { id, position });
  });

  socket.on("user-connected", () => {
    socket.emit("driverLocations", drivers);
  });

  socket.on("disconnect", async () => {
    await Driver.findOneAndDelete(
      { socketId: socket.id, isActive: true },
    );
    io.emit("driverCheck", socket.id);
    io.emit("active-drivers-updated");
    delete drivers[socket.id];
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Socket.IO server running on http://localhost:${PORT}`);
});

