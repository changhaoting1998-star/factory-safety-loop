const API_ORIGIN = "https://open.feishu.cn";
const PLACEHOLDER_PREFIX = "replace_with_";

function assertConfigured(value, field) {
  if (!value || String(value).startsWith(PLACEHOLDER_PREFIX)) {
    throw new Error(`${field} is not configured`);
  }
}

async function parseResponse(response) {
  const payload = await response.json();
  if (!response.ok || payload.code) {
    throw new Error(`Feishu request failed (${response.status}/${payload.code ?? "unknown"})`);
  }
  return payload.data;
}

export function createMockFeishuAdapter() {
  return {
    mode: "mock",
    buildAuthorizeUrl(state) {
      const query = new URLSearchParams({
        code: "demo_authorization_code",
        state: state || "demo_state",
      });
      return `/api/auth/feishu/callback?${query}`;
    },
    async exchangeCode() {
      return {
        accessToken: "demo_access_token_not_for_external_use",
        user: {
          id: "demo_user_feishu",
          name: "飞书演示用户",
        },
      };
    },
    async sendText({ text }) {
      return { messageId: "demo_message_id", preview: String(text).slice(0, 30) };
    },
  };
}

export function createFeishuAdapter(config) {
  if ((config.mode || "mock") === "mock") return createMockFeishuAdapter();

  const appId = config.appId;
  const appSecret = config.appSecret;
  const redirectUri = config.redirectUri;
  assertConfigured(appId, "FEISHU_APP_ID");
  assertConfigured(appSecret, "FEISHU_APP_SECRET");
  assertConfigured(redirectUri, "FEISHU_REDIRECT_URI");

  async function getTenantToken() {
    const response = await fetch(`${API_ORIGIN}/open-apis/auth/v3/tenant_access_token/internal`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ app_id: appId, app_secret: appSecret }),
    });
    const data = await parseResponse(response);
    return data.tenant_access_token;
  }

  return {
    mode: "live",
    buildAuthorizeUrl(state) {
      const url = new URL(`${API_ORIGIN}/open-apis/authen/v1/authorize`);
      url.searchParams.set("app_id", appId);
      url.searchParams.set("redirect_uri", redirectUri);
      if (state) url.searchParams.set("state", state);
      return url.toString();
    },
    async exchangeCode(code) {
      assertConfigured(code, "authorization code");
      const tenantToken = await getTenantToken();
      const response = await fetch(`${API_ORIGIN}/open-apis/authen/v1/oidc/access_token`, {
        method: "POST",
        headers: {
          authorization: `Bearer ${tenantToken}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({ grant_type: "authorization_code", code }),
      });
      const data = await parseResponse(response);
      return {
        accessToken: data.access_token,
        user: {
          id: data.open_id,
          name: data.name,
        },
      };
    },
    async sendText({ chatId, text }) {
      assertConfigured(chatId, "Feishu chat ID");
      const tenantToken = await getTenantToken();
      const response = await fetch(
        `${API_ORIGIN}/open-apis/im/v1/messages?receive_id_type=chat_id`,
        {
          method: "POST",
          headers: {
            authorization: `Bearer ${tenantToken}`,
            "content-type": "application/json; charset=utf-8",
          },
          body: JSON.stringify({
            receive_id: chatId,
            msg_type: "text",
            content: JSON.stringify({ text }),
          }),
        },
      );
      const data = await parseResponse(response);
      return { messageId: data.message_id };
    },
  };
}
