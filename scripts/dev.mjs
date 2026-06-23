/**
 * Reliable local dev startup:
 * - Kills stray Next.js processes on ports 3000–3002 (prevents duplicate servers)
 * - Uses .next-dev so `npm run build` never clobbers the running dev cache
 * - Clears stale dev cache before each start
 */
import { existsSync, rmSync } from "fs";
import { execSync, spawn } from "child_process";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { createRequire } from "module";

const PORTS = [3000, 3001, 3002];
const DEV_DIST = ".next-dev";
const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

function killPorts() {
  for (const port of PORTS) {
    try {
      if (process.platform === "win32") {
        const out = execSync(`netstat -ano | findstr :${port}`, {
          encoding: "utf8",
        });
        const pids = new Set();
        for (const line of out.split(/\r?\n/)) {
          if (!line.includes("LISTENING")) continue;
          const parts = line.trim().split(/\s+/);
          const pid = parts[parts.length - 1];
          if (pid && /^\d+$/.test(pid)) pids.add(pid);
        }
        for (const pid of pids) {
          try {
            execSync(`taskkill /F /PID ${pid}`, { stdio: "ignore" });
          } catch {
            /* already gone */
          }
        }
      } else {
        execSync(`lsof -ti tcp:${port} | xargs kill -9 2>/dev/null`, {
          stdio: "ignore",
        });
      }
    } catch {
      /* nothing listening */
    }
  }
}

function cleanDevCache() {
  const distPath = join(ROOT, DEV_DIST);
  if (existsSync(distPath)) {
    rmSync(distPath, { recursive: true, force: true });
  }
}

killPorts();
cleanDevCache();

console.log(`Starting dev server (cache: ${DEV_DIST})…\n`);

const require = createRequire(import.meta.url);
const nextBin = require.resolve("next/dist/bin/next");

const child = spawn(process.execPath, [nextBin, "dev"], {
  cwd: ROOT,
  stdio: "inherit",
  env: { ...process.env, NEXT_DIST_DIR: DEV_DIST },
});

child.on("exit", (code) => process.exit(code ?? 0));
