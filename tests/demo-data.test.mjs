import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const reports = JSON.parse(await readFile(new URL("../data/demo/reports.json", import.meta.url)));
const users = JSON.parse(await readFile(new URL("../data/demo/users.json", import.meta.url)));

test("all public demo identifiers are visibly synthetic", () => {
  for (const report of reports) {
    assert.match(report.id, /^demo_/);
    assert.match(report.reporterId, /^demo_/);
    if (report.assigneeId) assert.match(report.assigneeId, /^demo_/);
  }
  for (const user of users) assert.match(user.id, /^demo_/);
});

test("demo data has no contact fields", () => {
  for (const item of [...reports, ...users]) {
    assert.equal("phone" in item, false);
    assert.equal("email" in item, false);
    assert.equal("openId" in item, false);
  }
});
