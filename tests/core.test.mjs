import assert from "node:assert/strict";
import test from "node:test";
import {
  REPORT_STATUS,
  calculateDashboard,
  canTransition,
  createReport,
  transitionReport,
} from "../packages/core/src/index.js";

test("creates a report with synthetic defaults", () => {
  const report = createReport({
    title: "演示隐患",
    location: "示例区域",
    riskLevel: "MEDIUM",
    dueAt: "2099-12-31T00:00:00.000Z",
  }, { id: "demo_report_test", at: "2099-01-01T00:00:00.000Z" });
  assert.equal(report.id, "demo_report_test");
  assert.equal(report.status, REPORT_STATUS.OPEN);
  assert.match(report.reporterId, /^demo_/);
});

test("enforces the safety loop transitions", () => {
  assert.equal(canTransition("OPEN", "ASSIGNED"), true);
  assert.equal(canTransition("OPEN", "CLOSED"), false);
  assert.throws(
    () => transitionReport({ status: "OPEN" }, "CLOSED"),
    /Unsupported transition/,
  );
});

test("records the actor without changing the original report", () => {
  const original = { id: "demo_1", status: "VERIFYING", history: [] };
  const updated = transitionReport(original, "CLOSED", {
    actorId: "demo_reviewer",
    at: "2099-01-02T00:00:00.000Z",
  });
  assert.equal(original.status, "VERIFYING");
  assert.equal(updated.status, "CLOSED");
  assert.equal(updated.history[0].actorId, "demo_reviewer");
});

test("calculates dashboard metrics", () => {
  const metrics = calculateDashboard([
    { status: "OPEN", dueAt: "2000-01-01T00:00:00.000Z" },
    { status: "VERIFYING", dueAt: "2099-01-01T00:00:00.000Z" },
    { status: "CLOSED", dueAt: "2099-01-01T00:00:00.000Z" },
  ], new Date("2050-01-01T00:00:00.000Z"));
  assert.deepEqual(metrics, {
    total: 3,
    open: 2,
    overdue: 1,
    verifying: 1,
    closed: 1,
    closeRate: 33,
  });
});
