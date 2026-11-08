import { chromium } from "playwright";
import { mkdirSync } from "node:fs";

// Captures screenshot evidence for PR review: each URL at desktop and mobile
// sizes. Output lands in evidence/ (gitignored). The CLI cannot upload images
// to GitHub, so reference these paths in the PR body and attach them by hand.

const urls = process.argv.slice(2);
if (urls.length === 0) {
  console.error("usage: npm run screenshot -- <url> [url...]");
  process.exit(1);
}

const outDir = process.env.EVIDENCE_DIR ?? "evidence";
mkdirSync(outDir, { recursive: true });

const viewports = {
  desktop: { width: 1280, height: 720 },
  mobile: { width: 390, height: 844 },
};

const browser = await chromium.launch();

for (const url of urls) {
  for (const [name, viewport] of Object.entries(viewports)) {
    const page = await browser.newPage({ viewport });
    await page.goto(url, { waitUntil: "networkidle" });
    const slug =
      url.replace(/[^a-z0-9]+/gi, "-").replace(/^-+|-+$/g, "") || "page";
    const file = `${outDir}/${slug}-${name}.png`;
    await page.screenshot({ path: file, fullPage: true });
    console.log(file);
    await page.close();
  }
}

await browser.close();
