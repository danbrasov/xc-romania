/**
 * XC Romania - XContest World connectivity test
 * Cloudflare Worker. No D1 yet.
 *
 * Routes:
 *   /test        -> compact JSON diagnostics + detected flight-like rows
 *   /test/raw    -> first 12 KB of returned HTML (debug only)
 */

const XCONTEST_URL =
  "https://www.xcontest.org/2026/world/en/flights-search/?" +
  "filter%5Bpoint%5D=25.507357%2B45.75098&" +
  "filter%5Bradius%5D=200000&" +
  "filter%5Bmode%5D=START&" +
  "filter%5Bdate_mode%5D=dmy&" +
  "filter%5Bdate%5D=2026&" +
  "filter%5Bvalue_mode%5D=dst&" +
  "filter%5Bmin_value_dst%5D=&" +
  "filter%5Bcatg%5D=&" +
  "filter%5Broute_types%5D=&" +
  "filter%5Bavg%5D=&" +
  "filter%5Bpilot%5D=&" +
  "list%5Bsort%5D=pts&" +
  "list%5Bdir%5D=down";

function decodeEntities(s) {
  return s
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">");
}

function textOnly(html) {
  return decodeEntities(
    html
      .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
      .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
  ).trim();
}

function extractRows(html) {
  const rows = [];
  const rowRe = /<tr\b[^>]*>([\s\S]*?)<\/tr>/gi;
  let m;
  while ((m = rowRe.exec(html)) !== null) {
    const rowHtml = m[1];
    const cells = [];
    const cellRe = /<t[dh]\b[^>]*>([\s\S]*?)<\/t[dh]>/gi;
    let c;
    while ((c = cellRe.exec(rowHtml)) !== null) {
      const value = textOnly(c[1]);
      if (value) cells.push(value);
    }
    const rowText = cells.join(" | ");
    if (
      cells.length >= 3 &&
      (/\b\d+(?:[.,]\d+)?\s*km\b/i.test(rowText) ||
       /\b\d+(?:[.,]\d+)?\s*p\.?\b/i.test(rowText) ||
       /Bunloc/i.test(rowText))
    ) {
      rows.push(cells);
    }
  }
  return rows.slice(0, 50);
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "access-control-allow-origin": "*",
      "cache-control": "no-store"
    }
  });
}

export default {
  async fetch(request) {
    const u = new URL(request.url);
    if (u.pathname !== "/test" && u.pathname !== "/test/raw") {
      return json({
        ok: true,
        service: "XC Romania XContest test",
        usage: ["/test", "/test/raw"]
      });
    }

    let r;
    try {
      r = await fetch(XCONTEST_URL, {
        method: "GET",
        redirect: "follow",
        headers: {
          "accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "accept-language": "en-US,en;q=0.9",
          "user-agent": "XC-Romania/0.1 (+public ranking prototype)"
        }
      });
    } catch (e) {
      return json({ ok: false, stage: "fetch", error: String(e) }, 502);
    }

    const html = await r.text();

    if (u.pathname === "/test/raw") {
      return new Response(html.slice(0, 12000), {
        status: r.status,
        headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" }
      });
    }

    const rows = extractRows(html);
    const bodyText = textOnly(html);
    return json({
      ok: r.ok,
      xcontestStatus: r.status,
      finalUrl: r.url,
      bytes: html.length,
      title: (html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] || "").trim(),
      cloudflareChallenge:
        /cf-turnstile|Just a moment|challenge-platform|cf-chl-/i.test(html),
      containsBunloc: /Bunloc/i.test(html),
      containsDanielDirjan: /Daniel\s+Dirjan/i.test(bodyText),
      detectedRows: rows.length,
      rows
    }, r.ok ? 200 : 502);
  }
};
