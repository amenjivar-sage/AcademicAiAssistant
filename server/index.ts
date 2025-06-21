import express, { type Request, Response, NextFunction } from "express";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import { pool } from "./db";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { seedDatabase } from "./seed-database";
import { runMigrations } from "./migrate";

const app = express();
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: false, limit: '10mb' }));

// Database-backed session store for production multi-user support
const PgSession = connectPgSimple(session);

const sessionStore = new PgSession({
  pool: pool,
  tableName: 'user_sessions',
  createTableIfMissing: true,
  ttl: 7 * 24 * 60 * 60, // 7 days in seconds
  disableTouch: false
});

// Add session store error handling
sessionStore.on('error', (error) => {
  console.error('Session store error:', error);
});

app.use(session({
  store: sessionStore,
  secret: process.env.SESSION_SECRET || 'sage-demo-secret-key-2025',
  resave: true,  // Force session resaving
  saveUninitialized: true,
  rolling: true,
  name: 'sage-session',
  cookie: { 
    secure: false,
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    httpOnly: true,
    sameSite: 'lax',
    domain: undefined // Let it auto-detect
  }
}));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  // Initialize database tables
  await runMigrations();
  
  // Seed the database with initial data
  // await seedDatabase(); // Disabled to start with authentic data only
  
  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on port 5000
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = 5000;
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port} - role-based routing fix v9 deployed`);
  });
})();
