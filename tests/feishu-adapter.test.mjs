import assert from "node:assert/strict";
import test from "node:test";
import {
  createFeishuAdapter,
  createMockFeishuAdapter,
} from "../packages/feishu-adapter/src/index.js";

test("mock adapter preserves the SSO state without external calls", () => {
  const adapter = createMockFeishuAdapter();
  const url = new URL(adapter.buildAuthorizeUrl("demo_state_123"), "http://localhost");
  assert.equal(adapter.mode, "mock");
  assert.equal(url.searchParams.get("state"), "demo_state_123");
  assert.equal(url.searchParams.get("code"), "demo_authorization_code");
});

test("live adapter rejects placeholder credentials", () => {
  assert.throws(() => createFeishuAdapter({
    mode: "live",
    appId: "replace_with_your_app_id",
    appSecret: "replace_with_your_app_secret",
    redirectUri: "http://localhost/callback",
  }), /not configured/);
});
