import cors from "cors";
import express from "express";
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import {
  calculateDashboard,
  createReport,
  transitionReport,
} from "@factory-safety/core";
import { createFeishuAdapter } from "@factory-safety/feishu-adapter";

const app = express();
const port = Number(process.env.PORT || 8787);
const webOrigin = process.env.WEB_ORIGIN || "http://localhost:5173";
const root = fileURLToPath(new URL("../../../", import.meta.url));
const seed = JSON.parse(await readFile(`${root}data/demo/reports.json`, "utf-8"));
const reports = new Map(seed.map((item) => [item.id, item]));
const ssoStates = new Map();

const feishu = createFeishuAdapter({
  mode: process.env.FEISHU_MODE || "mock",
  appId: process.env.FEISHU_APP_ID,
  appSecret: process.env.FEISHU_APP_SECRET,
  redirectUri: process.env.FEISHU_REDIRECT_URI,
});

app.disable("x-powered-by");
app.use(cors({ origin: webOrigin, credentials: true }));
app.use(express.json({ limit: "256kb" }));

app.get("/api/health", (_request, response) => {
  response.json({ ok: true, mode: process.env.APP_MODE || "demo", feishuMode: feishu.mode });
});

app.get("/api/reports", (_request, response) => {
  const items = [...reports.values()];
  response.json({ items, dashboard: calculateDashboard(items) });
});

app.post("/api/reports", (request, response) => {
  try {
    const report = createReport(request.body, {
      id: `demo_report_${randomUUID()}`,
      reporterId: "demo_user_current",
    });
    reports.set(report.id, report);
    response.status(201).json(report);
  } catch (error) {
    response.status(400).json({ error: error.message });
  }
});

app.post("/api/reports/:id/transition", async (request, response) => {
  const current = reports.get(request.params.id);
  if (!current) return response.status(404).json({ error: "Report not found" });
  try {
    const updated = transitionReport(current, request.body.to, {
      actorId: "demo_user_current",
      assigneeId: request.body.assigneeId,
      note: request.body.note,
    });
    reports.set(updated.id, updated);
    response.json(updated);
  } catch (error) {
    response.status(400).json({ error: error.message });
  }
});

app.get("/api/auth/feishu/start", (_request, response) => {
  const now = Date.now();
  for (const [state, expiresAt] of ssoStates) {
    if (expiresAt <= now) ssoStates.delete(state);
  }
  const state = randomUUID();
  ssoStates.set(state, now + 10 * 60 * 1000);
  response.json({ authorizeUrl: feishu.buildAuthorizeUrl(state) });
});

app.get("/api/auth/feishu/callback", async (request, response) => {
  try {
    const state = String(request.query.state || "");
    const expiresAt = ssoStates.get(state);
    ssoStates.delete(state);
    if (!expiresAt || expiresAt <= Date.now()) throw new Error("Invalid or expired SSO state");
    const result = await feishu.exchangeCode(request.query.code);
    response.json({ authenticated: true, user: result.user, mode: feishu.mode });
  } catch (error) {
    response.status(400).json({ authenticated: false, error: error.message });
  }
});

app.post("/api/integrations/feishu/notify", async (request, response) => {
  try {
    const result = await feishu.sendText({
      chatId: process.env.FEISHU_NOTIFICATION_CHAT_ID,
      text: String(request.body.text || "").slice(0, 500),
    });
    response.json({ ok: true, messageId: result.messageId, mode: feishu.mode });
  } catch (error) {
    response.status(400).json({ ok: false, error: error.message });
  }
});

app.use((error, _request, response, _next) => {
  response.status(500).json({ error: "Unexpected server error", requestId: randomUUID() });
  console.error("request_failed", { name: error.name, message: error.message });
});

app.listen(port, () => {
  console.log(`factory-safety api listening on ${port} (${feishu.mode})`);
});
