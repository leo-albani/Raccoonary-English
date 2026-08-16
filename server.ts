import "dotenv/config";
import path from "path";
import express from "express";
import { app } from "./api/index.ts";

const PORT = 3000;

export async function startServer() {
  // Vite middleware setup for local development
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server Raccoonary running on http://localhost:${PORT}`);
  });
}

// Auto-start server in standalone Node.js environment
startServer();

export { app };
export default app;
