import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("../src/components/matches/MatchFanSection.tsx", import.meta.url), "utf8");

assert.match(
  source,
  /useState<\{ x: number; y: number \} \| null>\(null\)/,
  "The mobile location marker must start hidden until geolocation resolves",
);
assert.match(
  source,
  /showCurrentUserMarker && userMapPos && \(userVote === "home" \|\| userVote === "away"\)/,
  "The mobile location marker must render only after a real position is available",
);
assert.match(
  source,
  /onClick=\{requestUserLocation\}/,
  "The mobile map must offer a location retry action",
);
assert.match(
  source,
  /if \(!showCurrentUserMarker\) return;/,
  "Desktop maps must not request geolocation when the mobile marker is disabled",
);
assert.match(
  source,
  /navigator\.geolocation\.watchPosition\(/,
  "The mobile map must keep the phone position updated while it is open",
);
assert.match(
  source,
  /enableHighAccuracy: true/,
  "The mobile map must request a high-accuracy phone position",
);
assert.match(
  source,
  /navigator\.geolocation\.clearWatch\(locationWatchRef\.current\)/,
  "The mobile map must stop watching the position when it closes",
);

console.log("mobile map location checks passed");
