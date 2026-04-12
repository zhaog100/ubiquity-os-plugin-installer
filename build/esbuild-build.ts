import * as dotenv from "dotenv";
import esbuild, { BuildOptions } from "esbuild";
import MINIMAL_PREDEFINED_CONFIG from "../static/minimal-predefined.json";
import openSourceProject from "../static/premade-configs/open-source-project.json";
import bountyHunter from "../static/premade-configs/bounty-hunter.json";
import minimalStarter from "../static/premade-configs/minimal-starter.json";

const PREMADE_CONFIGS = {
  "open-source-project": openSourceProject,
  "bounty-hunter": bountyHunter,
  "minimal-starter": minimalStarter,
};

dotenv.config();

const ENTRY_POINTS = {
  typescript: ["static/main.ts"],
  css: ["static/manifest-gui.css"],
};

const DATA_URL_LOADERS = [".png", ".woff", ".woff2", ".eot", ".ttf", ".svg"];

export const esbuildOptions: BuildOptions = {
  sourcemap: true,
  entryPoints: [...ENTRY_POINTS.typescript, ...ENTRY_POINTS.css],
  bundle: true,
  minify: false,
  loader: Object.fromEntries(DATA_URL_LOADERS.map((ext) => [ext, "dataurl"])),
  outdir: "static/dist",
  define: createEnvDefines([], {
    MINIMAL_PREDEFINED_CONFIG: JSON.stringify(MINIMAL_PREDEFINED_CONFIG),
    PREMADE_CONFIGS: JSON.stringify(PREMADE_CONFIGS),
    SUPABASE_STORAGE_KEY: generateSupabaseStorageKey(),
    NODE_ENV: process.env.NODE_ENV || "development",
    SUPABASE_URL: process.env.SUPABASE_URL || "https://wfzpewmlyiozupulbuur.supabase.co",
    SUPABASE_ANON_KEY:
      process.env.SUPABASE_ANON_KEY ||
      /* cspell:disable-next-line */
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndmenBld21seWlvenVwdWxidXVyIiwicm9sZSI6ImFub24iLCJpYXQiOjE2OTU2NzQzMzksImV4cCI6MjAxMTI1MDMzOX0.SKIL3Q0NOBaMehH0ekFspwgcu3afp3Dl9EDzPqs1nKs",
  }),
};

async function runBuild() {
  try {
    await esbuild.build(esbuildOptions);
    console.log("\tesbuild complete");
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

void runBuild();

function createEnvDefines(environmentVariables: string[], generatedAtBuild: Record<string, unknown>): Record<string, string> {
  const defines: Record<string, string> = {};
  for (const name of environmentVariables) {
    const envVar = process.env[name];
    if (envVar !== undefined) {
      defines[name] = JSON.stringify(envVar);
    } else {
      throw new Error(`Missing environment variable: ${name}`);
    }
  }
  for (const key of Object.keys(generatedAtBuild)) {
    if (Object.prototype.hasOwnProperty.call(generatedAtBuild, key)) {
      defines[key] = JSON.stringify(generatedAtBuild[key]);
    }
  }
  return defines;
}

export function generateSupabaseStorageKey(): string | null {
  const SUPABASE_URL = process.env.SUPABASE_URL || "https://wfzpewmlyiozupulbuur.supabase.co";
  if (!SUPABASE_URL) {
    console.error("SUPABASE_URL environment variable is not set");
    return null;
  }

  const urlParts = SUPABASE_URL.split(".");
  if (urlParts.length === 0) {
    console.error("Invalid SUPABASE_URL environment variable");
    return null;
  }

  const domain = urlParts[0];
  const lastSlashIndex = domain.lastIndexOf("/");
  if (lastSlashIndex === -1) {
    console.error("Invalid SUPABASE_URL format");
    return null;
  }

  return domain.substring(lastSlashIndex + 1);
}
