import { copyFileSync, cpSync, existsSync, mkdirSync, rmSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.resolve(__dirname, "dist");
const publicDir = path.resolve(__dirname, "..", "..", "public");

// Remove existing public directory if it exists
if (existsSync(publicDir)) {
  rmSync(publicDir, { recursive: true, force: true });
}

// Create public directory
mkdirSync(publicDir, { recursive: true });

// Copy dist contents to public
cpSync(distDir, publicDir, { recursive: true });

// Remove dist directory
rmSync(distDir, { recursive: true, force: true });

console.log("Copied build output to public folder");
