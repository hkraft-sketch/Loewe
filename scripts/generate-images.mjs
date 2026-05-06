#!/usr/bin/env node
/*
 * Generate Löwe-Container product imagery via kie.ai (Nano Banana / Gemini 2.5 Flash Image).
 *
 * Usage:
 *   export KIE_API_KEY=sk-...           # required
 *   node scripts/generate-images.mjs    # generates everything missing in /images
 *   node scripts/generate-images.mjs hero abrollcontainer
 *                                       # only specific slugs
 *   FORCE=1 node scripts/generate-images.mjs
 *                                       # regenerate even if file exists
 *
 * Requires Node 18+ (uses global fetch).
 */

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const IMAGES_DIR = path.join(ROOT, "images");
const PROMPTS_FILE = path.join(__dirname, "prompts.json");

const API_BASE = "https://api.kie.ai/api/v1/jobs";
const MODEL = "google/nano-banana";
const POLL_INTERVAL_MS = 5_000;
const POLL_TIMEOUT_MS = 12 * 60 * 1000; // 12 min hard cap per image

const API_KEY = process.env.KIE_API_KEY;
if (!API_KEY) {
  console.error("✗ KIE_API_KEY ist nicht gesetzt.\n  export KIE_API_KEY=sk-...");
  process.exit(1);
}

const force = process.env.FORCE === "1";
const onlySlugs = new Set(process.argv.slice(2));

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  await fs.mkdir(IMAGES_DIR, { recursive: true });

  const cfg = JSON.parse(await fs.readFile(PROMPTS_FILE, "utf8"));
  const tasks = cfg.images.filter((img) =>
    onlySlugs.size === 0 ? true : onlySlugs.has(img.slug)
  );

  if (tasks.length === 0) {
    console.error("✗ Keine passenden Slugs gefunden.");
    process.exit(1);
  }

  console.log(`→ ${tasks.length} Bild(er) werden geprüft.\n`);

  let made = 0;
  let skipped = 0;
  let failed = 0;

  for (const item of tasks) {
    const outFile = path.join(IMAGES_DIR, `${item.slug}.png`);
    const exists = await fileExists(outFile);

    if (exists && !force) {
      console.log(`· ${item.slug}: existiert, überspringe.`);
      skipped++;
      continue;
    }

    const fullPrompt = `${item.prompt}\n\nStyle: ${cfg.style}`;
    process.stdout.write(`▶ ${item.slug} (${item.ratio}) … `);

    try {
      const taskId = await createTask(fullPrompt, item.ratio);
      const url = await pollUntilReady(taskId);
      await downloadTo(url, outFile);
      console.log("✓");
      made++;
    } catch (err) {
      console.log(`✗ ${err.message}`);
      failed++;
    }
  }

  console.log(
    `\nFertig. ${made} erzeugt · ${skipped} übersprungen · ${failed} fehlgeschlagen.`
  );
  if (failed > 0) process.exit(1);
}

async function createTask(prompt, ratio) {
  const res = await fetch(`${API_BASE}/createTask`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: MODEL,
      input: {
        prompt,
        output_format: "png",
        image_size: ratio,
      },
    }),
  });

  if (!res.ok) {
    throw new Error(`createTask HTTP ${res.status}: ${await res.text()}`);
  }
  const data = await res.json();
  const taskId = data?.data?.taskId ?? data?.taskId;
  if (!taskId) throw new Error(`Antwort ohne taskId: ${JSON.stringify(data)}`);
  return taskId;
}

async function pollUntilReady(taskId) {
  const start = Date.now();
  while (Date.now() - start < POLL_TIMEOUT_MS) {
    await sleep(POLL_INTERVAL_MS);
    const res = await fetch(
      `${API_BASE}/recordInfo?taskId=${encodeURIComponent(taskId)}`,
      { headers: { Authorization: `Bearer ${API_KEY}` } }
    );
    if (!res.ok) {
      // Transient errors: keep polling unless 4xx auth-style
      if (res.status >= 400 && res.status < 500 && res.status !== 429) {
        throw new Error(`recordInfo HTTP ${res.status}: ${await res.text()}`);
      }
      continue;
    }
    const data = await res.json();
    const job = data?.data ?? data;
    const state = job?.state;
    if (state === "success") {
      const result = parseResult(job.resultJson);
      const url = result?.resultUrls?.[0] ?? result?.imageUrl;
      if (!url) throw new Error("Kein Bild-URL in resultJson");
      return url;
    }
    if (state === "fail") {
      throw new Error(job?.failMsg || job?.failCode || "Task fehlgeschlagen");
    }
    // states: queuing, generating, processing -> continue polling
  }
  throw new Error("Timeout beim Warten auf Bild");
}

function parseResult(resultJson) {
  if (!resultJson) return null;
  if (typeof resultJson === "string") {
    try {
      return JSON.parse(resultJson);
    } catch {
      return null;
    }
  }
  return resultJson;
}

async function downloadTo(url, dest) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Download HTTP ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  await fs.writeFile(dest, buf);
}

async function fileExists(p) {
  try {
    await fs.stat(p);
    return true;
  } catch {
    return false;
  }
}

main().catch((err) => {
  console.error("✗ Fataler Fehler:", err);
  process.exit(1);
});
