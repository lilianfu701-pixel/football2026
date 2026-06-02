import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("../src/components/mobile/MobileHome.tsx", import.meta.url), "utf8");
const header = source.slice(source.indexOf("function AppHeader("), source.indexOf("function HomeView("));

assert.match(
  source,
  /<AppHeader[^>]*onOpenView=\{openView\}/,
  "Mobile AppHeader must receive the same navigation handler as the bottom navigation",
);
assert.match(
  header,
  /onClick=\{\(\) => onOpenView\("mine"\)\}/,
  "Clicking the logged-in mobile header account must open the mobile Mine view",
);
assert.doesNotMatch(
  header,
  /`\/\$\{locale\}\/profile`/,
  "Mobile header account must not navigate to the PC profile page",
);

console.log("mobile header Mine navigation checks passed");
