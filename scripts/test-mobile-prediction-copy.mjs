import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const install = readFileSync(new URL("../src/components/mobile/MobileInstallPrompt.tsx", import.meta.url), "utf8");
const home = readFileSync(new URL("../src/components/mobile/MobileHome.tsx", import.meta.url), "utf8");
const details = readFileSync(new URL("../src/components/mobile/MobileScheduleDetails.tsx", import.meta.url), "utf8");

for (const [source, expected] of [
  [install, "进入助威"],
  [home, "世界杯助威"],
  [home, "马上预测"],
  [home, "我的预测"],
  [home, "冠军预测"],
  [home, "预测晒单"],
  [home, 'bottomPredict: "预测"'],
  [home, 'odds: "倍率"'],
  [details, "输赢预测"],
  [details, "比分预测"],
  [details, "最低消耗 10K GC"],
  [details, "预测成功"],
  [details, "比分预测成功"],
  [details, "预测失败"],
]) {
  assert.match(source, new RegExp(expected), `Missing mobile display copy: ${expected}`);
}

for (const [source, forbidden] of [
  [install, "进入竞猜"],
  [home, "世界杯竞猜"],
  [home, "赔率和竞猜信息"],
  [home, 'odds: "赔率"'],
  [home, "马上竞猜"],
  [home, "我的竞猜"],
  [home, "冠军竞猜"],
  [home, "竞猜晒单"],
  [home, 'bottomPredict: "竞猜"'],
  [details, "输赢竞猜"],
  [details, "比分竞猜"],
  [details, "最低下注 10K GC"],
  [details, "下注失败"],
]) {
  assert.doesNotMatch(source, new RegExp(forbidden), `Old mobile display copy remains: ${forbidden}`);
}

console.log("mobile prediction copy checks passed");
