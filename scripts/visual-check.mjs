import { chromium } from "playwright";

const baseUrl = process.env.PREVIEW_URL ?? "http://127.0.0.1:5173";
const viewports = [
  { name: "320", width: 320, height: 900 },
  { name: "375", width: 375, height: 900 },
  { name: "414", width: 414, height: 900 },
  { name: "768", width: 768, height: 1024 },
  { name: "1440", width: 1440, height: 1000 },
];
const trackedVideo = {
  episodeId: "eea81242-94cf-4e9d-bdee-aad2eb6d5ca6",
  bunnyVideoId: "598b0a87-c9ec-4bf1-90f8-4e2228cf3713",
  videoIngestionStatus: "ready",
  thumbnailFilename: null,
  durationMs: 562300,
  width: 1080,
  height: 1920,
  availableResolutions: ["360p", "720p", "1080p"],
  playbackUrl: "https://video.example.test/playlist.m3u8",
  thumbnailUrl: null,
};

const browser = await chromium.launch({ headless: true });
const results = [];

try {
  for (const viewport of viewports) {
    const page = await browser.newPage({ viewport });
    const consoleErrors = [];
    page.on("console", (message) => {
      if (message.type() === "error") consoleErrors.push(message.text());
    });
    page.on("pageerror", (error) => consoleErrors.push(error.message));
    await page.addInitScript((video) => {
      window.localStorage.setItem("drama-dashboard:last-upload:v1", JSON.stringify(video));
    }, trackedVideo);
    await page.goto(`${baseUrl}/?preview=dashboard`, { waitUntil: "networkidle" });
    await page.evaluate(() => document.fonts.ready);

    if (viewport.name === "320") {
      await page.getByText("Paid", { exact: true }).click();
      const coinPriceEnabled = await page.getByLabel("Coin price").isEnabled();
      if (!coinPriceEnabled) throw new Error("Paid access did not enable the coin price field.");
      await page.getByText("Free", { exact: true }).click();
    }

    const checks = await page.evaluate(() => {
      const root = document.documentElement;
      const interactive = [...document.querySelectorAll("button, a")]
        .filter((element) => element.textContent?.trim())
        .map((element) => ({
          text: element.textContent?.trim(),
          whiteSpace: getComputedStyle(element).whiteSpace,
        }));
      return {
        hasHorizontalOverflow: root.scrollWidth > root.clientWidth,
        width: root.clientWidth,
        scrollWidth: root.scrollWidth,
        wrappedAffordances: interactive.filter((item) => item.whiteSpace !== "nowrap"),
      };
    });
    if (checks.hasHorizontalOverflow) {
      throw new Error(`${viewport.name}px viewport overflows: ${checks.scrollWidth}px content.`);
    }
    if (checks.wrappedAffordances.length > 0) {
      throw new Error(`${viewport.name}px has wrappable affordances: ${JSON.stringify(checks.wrappedAffordances)}`);
    }
    if (consoleErrors.length > 0) {
      throw new Error(`${viewport.name}px emitted console errors: ${consoleErrors.join(" | ")}`);
    }

    if (viewport.name === "1440") {
      const contrast = await page.evaluate(() => {
        const styles = getComputedStyle(document.documentElement);
        const canvas = document.createElement("canvas");
        canvas.width = 1;
        canvas.height = 1;
        const context = canvas.getContext("2d", { willReadFrequently: true });
        if (!context) throw new Error("Canvas colour conversion is unavailable.");
        const rgb = (token) => {
          context.clearRect(0, 0, 1, 1);
          context.fillStyle = styles.getPropertyValue(token).trim();
          context.fillRect(0, 0, 1, 1);
          return [...context.getImageData(0, 0, 1, 1).data.slice(0, 3)];
        };
        const luminance = ([red, green, blue]) => {
          const channels = [red, green, blue].map((channel) => {
            const value = channel / 255;
            return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
          });
          return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
        };
        const ratio = (foreground, background) => {
          const a = luminance(rgb(foreground));
          const b = luminance(rgb(background));
          return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
        };
        return {
          inkOnPaper: ratio("--color-ink", "--color-paper"),
          neutralOnPaper: ratio("--color-neutral", "--color-paper"),
          mutedOnPaper3: ratio("--color-muted", "--color-paper-3"),
          errorOnPaper: ratio("--color-error", "--color-paper"),
          focusOnPaper: ratio("--color-focus", "--color-paper"),
          focusOnInk: ratio("--color-focus", "--color-ink"),
          controlOnPaper: ratio("--color-rule-2", "--color-paper"),
          accentInkOnInk: ratio("--color-accent-ink", "--color-ink"),
        };
      });
      const bodyPairs = [contrast.inkOnPaper, contrast.neutralOnPaper, contrast.mutedOnPaper3, contrast.errorOnPaper, contrast.accentInkOnInk];
      const nonTextPairs = [contrast.focusOnPaper, contrast.focusOnInk, contrast.controlOnPaper];
      if (bodyPairs.some((ratio) => ratio < 4.5) || nonTextPairs.some((ratio) => ratio < 3)) {
        throw new Error(`Contrast check failed: ${JSON.stringify(contrast)}`);
      }
      checks.contrast = contrast;
    }

    const screenshot = `/tmp/drama-dashboard-${viewport.name}.png`;
    await page.screenshot({ path: screenshot, fullPage: true });
    results.push({ viewport: viewport.name, screenshot, ...checks });
    await page.close();
  }

  const setupPage = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  await setupPage.goto(baseUrl, { waitUntil: "networkidle" });
  await setupPage.evaluate(() => document.fonts.ready);
  const setupScreenshot = "/tmp/drama-dashboard-setup.png";
  await setupPage.screenshot({ path: setupScreenshot, fullPage: true });
  results.push({ viewport: "setup", screenshot: setupScreenshot });
  await setupPage.close();

  const signInPage = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  await signInPage.goto(`${baseUrl}/?preview=sign-in`, { waitUntil: "networkidle" });
  await signInPage.evaluate(() => document.fonts.ready);
  await signInPage.keyboard.press("Tab");
  const focusOutline = await signInPage.locator(":focus").evaluate((element) => getComputedStyle(element).outlineStyle);
  if (focusOutline === "none") throw new Error("The sign-in view lost its keyboard focus indicator.");
  const signInScreenshot = "/tmp/drama-dashboard-sign-in.png";
  await signInPage.screenshot({ path: signInScreenshot, fullPage: true });
  results.push({ viewport: "sign-in", screenshot: signInScreenshot, focusOutline });
  await signInPage.close();
} finally {
  await browser.close();
}

console.log(JSON.stringify(results, null, 2));
