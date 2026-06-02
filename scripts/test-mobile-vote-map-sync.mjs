import assert from "node:assert/strict";
import fs from "node:fs";

let nextMobileVoteMapState;
try {
  ({ nextMobileVoteMapState } = await import("../src/components/mobile/mobileVoteMapSync.ts"));
} catch {
  assert.fail("mobile vote map sync helper is missing");
}

assert.deepEqual(
  nextMobileVoteMapState({ vote: null, revision: 0 }, "home"),
  { vote: "home", revision: 1 },
  "saving a home vote refreshes the map and highlights the home side",
);

assert.deepEqual(
  nextMobileVoteMapState({ vote: "home", revision: 4 }, "away"),
  { vote: "away", revision: 5 },
  "switching sides refreshes the map and highlights the away side",
);

const detailsSource = fs.readFileSync(new URL("../src/components/mobile/MobileScheduleDetails.tsx", import.meta.url), "utf8");
assert.match(detailsSource, /onVoteSaved=\{handleVoteSaved\}/, "mobile details must notify the map after a vote is saved");
assert.match(detailsSource, /showCurrentUserMarker/, "mobile details must enable the local map marker");

console.log("mobile vote map sync behavior ok");
