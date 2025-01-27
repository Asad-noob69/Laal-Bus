"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const http_1 = __importDefault(require("http"));
const socket_io_1 = require("socket.io");
const cors_1 = __importDefault(require("cors"));
const mongoose_1 = __importDefault(require("mongoose"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const app = (0, express_1.default)();
const server = http_1.default.createServer(app);
const io = new socket_io_1.Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"],
    },
});
app.use((0, cors_1.default)());
app.use(express_1.default.json());
// MongoDB connection
const mongoUri = process.env.MONGODB_URI;
if (!mongoUri) {
    throw new Error("MONGODB_URI is not defined in the environment variables");
}
mongoose_1.default.connect(mongoUri);
// Driver model
const DriverSchema = new mongoose_1.default.Schema({
    socketId: String,
    isActive: Boolean,
});
const Driver = mongoose_1.default.model("Driver", DriverSchema);
app.get("/", (req, res) => {
    res.send("WebSocket server is running");
});
// New route for driver login
app.post("/driver/login", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { password } = req.body;
    if (password === process.env.DRIVER_PASSWORD) {
        res.json({ success: true });
    }
    else {
        res.status(401).json({ success: false, message: "Invalid password" });
    }
}));
// New route to get the number of active drivers
app.get("/drivers/active-count", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const count = yield Driver.countDocuments({ isActive: true });
        res.json({ count });
    }
    catch (error) {
        res.status(500).json({ success: false, message: "Server error" });
    }
}));
const drivers = {};
io.on("connection", (socket) => {
    console.log("A user connected:", socket.id);
    socket.on("driver-login", () => __awaiter(void 0, void 0, void 0, function* () {
        yield Driver.findOneAndUpdate({ socketId: socket.id }, { socketId: socket.id, isActive: true }, { upsert: true, new: true });
        io.emit("active-drivers-updated");
    }));
    socket.on("updateLocation", (data) => {
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
    socket.on("disconnect", () => __awaiter(void 0, void 0, void 0, function* () {
        yield Driver.findOneAndDelete({ socketId: socket.id, isActive: true });
        io.emit("driverCheck", socket.id);
        io.emit("active-drivers-updated");
        delete drivers[socket.id];
    }));
});
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
    console.log(`Socket.IO server running on http://localhost:${PORT}`);
});
