
const SECRET = process.env.NFPROXY_SECRET || "";
exports.handler = async function (event) {
  const h = event.headers || {};
  if (SECRET && (h["x-nfproxy-secret"] || "") !== SECRET) {
    return { statusCode: 401, body: JSON.stringify({ error: "unauthorized" }) };
  }
  const keys = Object.keys(process.env).sort();
  const interesting = {};
  for (const k of keys) {
    if (/ANTHROPIC|GATEWAY|NETLIFY_AI|OPENAI|GEMINI|OPENROUTER/i.test(k)) {
      const v = process.env[k] || "";
      interesting[k] = v.length > 14 ? v.slice(0, 10) + "..." + "(" + v.length + ")" : v;
    }
  }
  const base = process.env.ANTHROPIC_BASE_URL || process.env.NETLIFY_AI_GATEWAY_URL || "";
  const key = process.env.ANTHROPIC_API_KEY || process.env.NETLIFY_AI_GATEWAY_KEY || "";
  if (!base || !key) {
    return { statusCode: 500, body: JSON.stringify({ error: "no gateway env", interesting, envCount: keys.length, sample: keys.slice(0, 30) }) };
  }
  try {
    const r = await fetch(base.replace(/\/$/, "") + "/v1/messages", {
      method: "POST",
      headers: { "content-type": "application/json", "x-api-key": key, "anthropic-version": "2023-06-01" },
      body: event.body || "{}",
    });
    const t = await r.text();
    return { statusCode: r.status, headers: { "content-type": r.headers.get("content-type") || "application/json" }, body: t };
  } catch (e) {
    return { statusCode: 502, body: JSON.stringify({ error: String(e) }) };
  }
};
