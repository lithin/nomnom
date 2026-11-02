// Installs Expo Go for the project's SDK on a simulator: node install-expo-go.mjs <udid>
//
// `expo start --ios` would do this, but it requires Simulator.app, which Xcode
// 27 replaced with Device Hub. Maestro opens the project itself (see
// flows/common/launch-app.yaml), so Expo Go being installed is all we need.
// Reuses the Expo CLI's own downloader, which caches the app in ~/.expo.
import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";

const udid = process.argv[2];
if (!udid) {
  console.error("Usage: node install-expo-go.mjs <simulator-udid>");
  process.exit(1);
}

const require = createRequire(new URL("../package.json", import.meta.url));
const { downloadExpoGoAsync } = require("@expo/cli/build/src/utils/downloadExpoGoAsync");
const expoMajor = require("expo/package.json").version.split(".")[0];

const appPath = await downloadExpoGoAsync("ios", { sdkVersion: `${expoMajor}.0.0` });
execFileSync("xcrun", ["simctl", "install", udid, appPath], { stdio: "inherit" });
console.log(`Installed Expo Go (SDK ${expoMajor}) on ${udid}`);
