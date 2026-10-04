/**
 * XC Romania - XContest public-source tests
 * Routes:
 *   /test         -> protected flights-search diagnostic
 *   /test/raw     -> protected search response, first 12 KB
 *   /test/rss     -> parse official WORLD RSS (last 20 submissions)
 *   /test/detail  -> fetch first flight detail linked by RSS
 */

const XCONTEST_URL =
  "https://www.xcontest.org/2026/world/en/flights-search/?" +
  "filter%5Bpoint%5D=25.507357%2B45.75098&filter%5Bradius%5D=200000&" +
  "filter%5Bmode%5D=START&filter%5Bdate_mode%5D=dmy&filter%5Bdate%5D=2026&" +
  "filter%5Bvalue_mode%5D=dst&filter%5Bmin_value_dst%5D=&filter%5Bcatg%5D=&" +
  "filter%5Broute_types%5D=&filter%5Bavg%5D=&filter%5Bpilot%5D=&" +
  "list%5Bsort%5D=pts&list%5Bdir%5D=down";

const RSS_URL = "https://www.xcontest.org/rss/flights/?world";

function decodeEntities(s) {
  return s.replace(/&nbsp;/gi," ").replace(/&amp;/gi,"&").replace(/&quot;/gi,'"')
    .replace(/&#39;|&apos;/gi,"'").replace(/&lt;/gi,"<").replace(/&gt;/gi,">");
}
function textOnly(html) {
  return decodeEntities(html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi," ")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi," ").replace(/<[^>]+>/g," ")
    .replace(/\s+/g," ")).trim();
}
function tag(xml, name) {
  return decodeEntities((xml.match(new RegExp("<"+name+"[^>]*>([\\s\\S]*?)<\\/"+name+">","i"))?.[1] || "").trim());
}
function parseRss(xml) {
  const items=[]; const re=/<item\b[^>]*>([\s\S]*?)<\/item>/gi; let m;
  while ((m=re.exec(xml))!==null) {
    const title=tag(m[1],"title"), link=tag(m[1],"link"), pubDate=tag(m[1],"pubDate");
    const p=title.match(/^(\d{2}\.\d{2}\.\d{2})\s+\[([\d.]+)\s*km\s*::\s*([^:]+?)\s*::\s*([\d.]+)\s*p\]\s*(.+)$/i);
    items.push({title,link,pubDate,date:p?.[1]||null,distanceKm:p?Number(p[2]):null,routeType:p?.[3]?.trim()||null,points:p?Number(p[4]):null,pilot:p?.[5]?.trim()||null});
  }
  return items;
}
function extractRows(html) {
  const rows=[]; const rowRe=/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi; let m;
  while((m=rowRe.exec(html))!==null){const cells=[];const cr=/<t[dh]\b[^>]*>([\s\S]*?)<\/t[dh]>/gi;let c;
    while((c=cr.exec(m[1]))!==null){const v=textOnly(c[1]);if(v)cells.push(v);}
    const t=cells.join(" | "); if(cells.length>=3&&(/\b\d+(?:[.,]\d+)?\s*km\b/i.test(t)||/\b\d+(?:[.,]\d+)?\s*p\.?\b/i.test(t)||/Bunloc/i.test(t)))rows.push(cells);
  } return rows.slice(0,50);
}
function json(data,status=200){return new Response(JSON.stringify(data,null,2),{status,headers:{"content-type":"application/json; charset=utf-8","access-control-allow-origin":"*","cache-control":"no-store"}});}
async function get(url, accept="text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"){
  return fetch(url,{method:"GET",redirect:"follow",headers:{accept,"accept-language":"en-US,en;q=0.9","user-agent":"XC-Romania/0.2 (+public ranking prototype)"}});
}

export default {
  async fetch(request) {
    const u=new URL(request.url);
    const usage=["/test","/test/raw","/test/rss","/test/detail"];
    if(!usage.includes(u.pathname)) return json({ok:true,service:"XC Romania XContest test",usage});

    if(u.pathname==="/test/rss" || u.pathname==="/test/detail"){
      try{
        const rr=await get(RSS_URL,"application/rss+xml,application/xml,text/xml;q=0.9,*/*;q=0.8");
        const xml=await rr.text(); const items=parseRss(xml);
        if(u.pathname==="/test/rss") return json({ok:rr.ok,rssStatus:rr.status,finalUrl:rr.url,bytes:xml.length,itemCount:items.length,items},rr.ok?200:502);
        if(!items[0]?.link) return json({ok:false,stage:"rss-parse",rssStatus:rr.status,itemCount:items.length},502);
        const dr=await get(items[0].link); const html=await dr.text(); const body=textOnly(html);
        return json({
          ok:dr.ok,rssStatus:rr.status,detailStatus:dr.status,detailUrl:dr.url,sourceItem:items[0],bytes:html.length,
          title:(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]||"").trim(),
          cloudflareChallenge:/cf-turnstile|Just a moment|challenge-platform|cf-chl-/i.test(html),
          unauthorized:/authorized users only|ERROR\s*401/i.test(body),
          signals:{romania:/Romania|România/i.test(body),bunloc:/Bunloc/i.test(body),takeoff:/takeoff|start place|launch/i.test(body),glider:/glider|wing/i.test(body),igc:/\.igc\b|IGC/i.test(body)},
          textPreview:body.slice(0,2500)
        },dr.ok?200:502);
      }catch(e){return json({ok:false,stage:"rss/detail-fetch",error:String(e)},502);}
    }

    let r; try{r=await get(XCONTEST_URL);}catch(e){return json({ok:false,stage:"fetch",error:String(e)},502);}
    const html=await r.text();
    if(u.pathname==="/test/raw") return new Response(html.slice(0,12000),{status:r.status,headers:{"content-type":"text/plain; charset=utf-8","cache-control":"no-store"}});
    const rows=extractRows(html), body=textOnly(html);
    return json({ok:r.ok,xcontestStatus:r.status,finalUrl:r.url,bytes:html.length,title:(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]||"").trim(),cloudflareChallenge:/cf-turnstile|Just a moment|challenge-platform|cf-chl-/i.test(html),containsBunloc:/Bunloc/i.test(html),containsDanielDirjan:/Daniel\s+Dirjan/i.test(body),detectedRows:rows.length,rows},r.ok?200:502);
  }
};
