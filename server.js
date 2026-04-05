import dotenv from "dotenv";
import { createServer } from "http";
import { Server } from "socket.io";
import app from "./src/app.js";
import connectDB from "./src/config/db.js";
import NotificationService from "./src/services/notificationService.js";
import { setNotificationService } from "./src/services/ActivityLogService.js";
import jwt from "jsonwebtoken";

// Load environment variables
dotenv.config();

// Handle uncaught exceptions
process.on("uncaughtException", (err) => {
  console.error("UNCAUGHT EXCEPTION! 💥 Shutting down...");
  console.error(err.name, err.message);
  console.error(err.stack);
  process.exit(1);
});

// Start server
const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    await connectDB();

    // Create HTTP server from Express app
    const httpServer = createServer(app);

    // Initialize Socket.IO
    const io = new Server(httpServer, {
      cors: {
        origin: [
          process.env.DASHBOARD_URL,
          process.env.PUBLIC_URL,
          "http://localhost:5173",
          "http://localhost:3000",
          "http://localhost:5174",
        ].filter(Boolean),
        credentials: true,
        methods: ["GET", "POST"],
      },
      transports: ["websocket", "polling"],
    });

    // Initialize notification service
    const notificationService = new NotificationService(io);
    setNotificationService(notificationService);

    // Socket.IO authentication middleware
    io.use(async (socket, next) => {
      try {
        // Extract token from handshake auth or query
        const token =
          socket.handshake.auth.token || socket.handshake.query.token;

        if (!token) {
          return next(new Error("Authentication required"));
        }

        // Verify JWT token
        const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);

        // Attach admin info to socket
        socket.adminId = decoded.id;
        socket.adminRole = decoded.role;
        next();
      } catch (error) {
        console.error("Socket authentication error:", error.message);
        next(new Error("Invalid token"));
      }
    });

    // Socket.IO connection handling
    io.on("connection", (socket) => {
      console.log(`🔌 Admin connected: ${socket.adminId}`);

      // Register admin connection
      notificationService.initializeAdminConnection(socket.adminId, socket.id);

      // Send initial unread count
      (async () => {
        try {
          const { getUnreadNotificationCount } =
            await import("./src/services/ActivityLogService.js");
          const count = await getUnreadNotificationCount(socket.adminId);
          socket.emit("notification-count", { count });
        } catch (error) {
          console.error("Error sending initial unread count:", error);
        }
      })();

      // Handle join room for specific notifications
      socket.on("join-room", (room) => {
        socket.join(room);
        console.log(`Admin ${socket.adminId} joined room: ${room}`);
      });

      // Handle leave room
      socket.on("leave-room", (room) => {
        socket.leave(room);
        console.log(`Admin ${socket.adminId} left room: ${room}`);
      });

      // Handle mark as read via socket
      socket.on("mark-notification-read", async (notificationId) => {
        try {
          const { markNotificationAsRead } =
            await import("./src/services/ActivityLogService.js");
          await markNotificationAsRead(notificationId, socket.adminId);

          // Update unread count
          const { getUnreadNotificationCount } =
            await import("./src/services/ActivityLogService.js");
          const count = await getUnreadNotificationCount(socket.adminId);
          socket.emit("notification-count", { count });
        } catch (error) {
          console.error("Error marking notification as read:", error);
        }
      });

      // Handle ping/pong for connection health check
      socket.on("ping", (callback) => {
        if (typeof callback === "function") {
          callback({ status: "ok", timestamp: new Date().toISOString() });
        }
      });

      // Handle disconnect
      socket.on("disconnect", () => {
        notificationService.removeAdminConnection(socket.adminId);
        console.log(`🔌 Admin disconnected: ${socket.adminId}`);
      });
    });

    // Start server with Socket.IO support
    httpServer.listen(PORT, () => {
      console.log(`✅ Server running on port ${PORT}`);
      console.log(`✅ Environment: ${process.env.NODE_ENV}`);
      console.log(`✅ API Version: ${process.env.API_VERSION || "v1"}`);
      console.log(`✅ WebSocket enabled for real-time notifications`);
    });

    // Handle unhandled rejections
    process.on("unhandledRejection", (err) => {
      console.error("UNHANDLED REJECTION! 💥 Shutting down...");
      console.error(err.name, err.message);
      httpServer.close(() => {
        process.exit(1);
      });
    });

    // Graceful shutdown
    process.on("SIGTERM", () => {
      console.log("👋 SIGTERM received. Shutting down gracefully...");
      httpServer.close(() => {
        console.log("💥 Process terminated!");
      });
    });
  } catch (error) {
    console.error("❌ Failed to start server:", error);
    process.exit(1);
  }
};

startServer();
