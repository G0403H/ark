import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";

const OUT_DIR = path.resolve("screenshots");
if (!fs.existsSync(OUT_DIR)) {
  fs.mkdirSync(OUT_DIR, { recursive: true });
}

async function run() {
  console.log("Launching browser to capture showcase screenshots...");
  const browser = await chromium.launch({
    headless: true,
    executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const context = await browser.newContext({
    viewport: { width: 1280, height: 900 },
    deviceScaleFactor: 2, // HiDPI Retina crispness
  });

  const page = await context.newPage();

  const pagesToCapture = [
    {
      name: "01-stalker-pda-dashboard.png",
      url: "http://localhost:8080/",
      waitSelector: ".topbar",
    },
    {
      name: "02-military-drone-defense.png",
      url: "http://localhost:8080/read/wartime-drone-protection",
      waitSelector: "article, main",
    },
    {
      name: "03-offline-compendiums-reader.png",
      url: "http://localhost:8080/libraries",
      waitSelector: ".doc-card",
    },
    {
      name: "04-morse-transceiver-telegraph.png",
      url: "http://localhost:8080/morse",
      waitSelector: "#morse-key-text-input",
    },
    {
      name: "05-womens-health-cycle.png",
      url: "http://localhost:8080/cycle",
      waitSelector: "main",
    },
    {
      name: "06-bitchat-mesh-radio.png",
      url: "http://localhost:8080/chat",
      waitSelector: "main",
    },
    {
      name: "07-field-medical-tools.png",
      url: "http://localhost:8080/shelves/pomosh",
      waitSelector: ".chip",
    },
    {
      name: "08-offline-ai-assistant.png",
      url: "http://localhost:8080/assistant",
      waitSelector: "#ask",
    },
    {
      name: "09-offline-tactical-atlas.png",
      url: "http://localhost:8080/atlas",
      waitSelector: "main",
    },
  ];

  for (const item of pagesToCapture) {
    try {
      console.log(`Navigating to ${item.url}...`);
      await page.goto(item.url, { waitUntil: "networkidle", timeout: 15000 });
      if (item.waitSelector) {
        await page.waitForSelector(item.waitSelector, { timeout: 10000 }).catch(() => {});
      }
      // Small pause to allow CSS animations and charts to settle
      await page.waitForTimeout(1000);
      const outPath = path.join(OUT_DIR, item.name);
      await page.screenshot({ path: outPath, fullPage: false });
      console.log(`Saved screenshot: ${item.name} (${fs.statSync(outPath).size} bytes)`);
    } catch (err) {
      console.error(`Failed to capture ${item.name}:`, err.message);
    }
  }

  await browser.close();
  console.log("All showcase screenshots captured successfully.");
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
