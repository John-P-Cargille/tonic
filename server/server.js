import express from "express";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PUBLIC_DIR = path.join(__dirname, "..", "public");
const NOTES_DIR  = path.join(__dirname, "assets", "notes");

// Serve static site
app.use(express.static(PUBLIC_DIR));

// serve notes:
app.use("/api/assets/notes", express.static(path.join(__dirname, "assets", "notes")));

// for future misc files
app.use("/api/assets", express.static(path.join(__dirname, "assets")));


// (Optional) SPA fallback; comment out while debugging bad paths
app.get("*", (_req, res) => res.sendFile(path.join(PUBLIC_DIR, "index.html")));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Melodic Dictation at http://localhost:${PORT}`);
});
