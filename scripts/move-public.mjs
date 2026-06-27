import { cpSync, existsSync, rmSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const sourceDir = path.resolve(__dirname, "..", "artifacts", "proctor-ai", "public");
const targetDir = path.resolve(__dirname, "..", "public");

// Remove existing public directory at root if it exists
if (existsSync(targetDir)) {
  rmSync(targetDir, { recursive: true, force: true });
}

// Copy artifacts/proctor-ai/public to root public
cpSync(sourceDir, targetDir, { recursive: true });

console.log("Moved public folder to project root");
