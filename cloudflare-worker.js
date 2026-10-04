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
const DANIEL_URL = "https://www.xcontest.org/world/en/flights/detail:DDirjan/3.10.2026/14:02";

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
    const usage=["/test","/test/raw","/test/rss","/test/detail","/test/daniel","/test/map","/test/data","/test/apijs","/test/apijs/raw","/test/modules","/test/contest","/test/contest-meta","/test/unpack","/test/romania","/test/static-map","/test/static-image","/test/meta","/test/flights-list","/test/flights-raw","/test/flights-module","/test/daily-score","/test/daily-date"];
    if(!usage.includes(u.pathname)) return json({ok:true,service:"XC Romania XContest test",usage});

    if(u.pathname==="/test/unpack"){
      try{
        const url="https://d393ilck4xazzy.cloudfront.net/api/js/2.6.36/contest.js";
        const r=await get(url,"application/javascript,text/javascript,*/*;q=0.8"); const js=await r.text();
        const tail=js.slice(-12000);
        const marker=".split('.')))";
        const p=tail.lastIndexOf(marker);
        let dictText="", words=[];
        if(p>=0){
          const before=tail.slice(0,p);
          const q=before.lastIndexOf("'");
          const q2=q>0?before.lastIndexOf("'",q-1):-1;
          if(q2>=0){dictText=before.slice(q2+1,q); words=dictText.split(".");}
        }
        return json({ok:r.ok,status:r.status,bytes:js.length,dictionaryFound:words.length>0,dictionaryWords:words.length,dictionaryHead:words.slice(0,80),dictionaryTail:words.slice(-80),head:js.slice(0,2500),tail:tail.slice(-2500)});
      }catch(e){return json({ok:false,stage:"unpack-inspection",error:String(e)},502);}
    }

    if(u.pathname==="/test/contest-meta"){
      try{
        const url="https://d393ilck4xazzy.cloudfront.net/api/js/2.6.36/contest.js";
        const r=await get(url,"application/javascript,text/javascript,*/*;q=0.8"); const js=await r.text();
        const tail=js.slice(-5000), head=js.slice(0,5000);
        const sm=tail.match(/sourceMappingURL\s*=\s*([^\s*]+)/i)?.[1]||null;
        let sourceMap=null;
        if(sm){
          const smUrl=new URL(sm,url).href;
          const mr=await get(smUrl,"application/json,text/plain,*/*;q=0.8");
          const mt=await mr.text();
          sourceMap={url:smUrl,status:mr.status,bytes:mt.length,head:mt.slice(0,2000)};
        }
        return json({ok:r.ok,status:r.status,url,bytes:js.length,sourceMappingURL:sm,head,tail,sourceMap});
      }catch(e){return json({ok:false,stage:"contest-meta",error:String(e)},502);}
    }

    if(u.pathname==="/test/contest"){
      try{
        const url="https://d393ilck4xazzy.cloudfront.net/api/js/2.6.36/contest.js";
        const r=await get(url,"application/javascript,text/javascript,*/*;q=0.8"); const js=await r.text();
        const needles=["ticket","initSI","getSeedUrl","authSeed","md5","requestResponse"];
        const hits={};
        for(const n of needles){
          const arr=[]; let from=0;
          while(arr.length<4){
            const i=js.indexOf(n,from); if(i<0) break;
            arr.push(js.slice(Math.max(0,i-700),Math.min(js.length,i+1400)).replace(/\s+/g," "));
            from=i+n.length;
          }
          hits[n]=arr;
        }
        return json({ok:r.ok,status:r.status,url,bytes:js.length,hits});
      }catch(e){return json({ok:false,stage:"contest-inspection",error:String(e)},502);}
    }

    if(u.pathname==="/test/modules"){
      try{
        const mods={contest:"2.6.36",flight:"2.6.36",map:"2.6.36"};
        const result={};
        for(const [name,ver] of Object.entries(mods)){
          const url="https://d393ilck4xazzy.cloudfront.net/api/js/"+ver+"/"+name+".js";
          const r=await get(url,"application/javascript,text/javascript,*/*;q=0.8"); const js=await r.text();
          result[name]={status:r.status,url,bytes:js.length,signals:{ticket:/ticket/i.test(js),xTicket:/X-Ticket/i.test(js),response:/response/i.test(js),crypto:/crypto/i.test(js),hash:/hash|sha|md5/i.test(js)},contexts:[...js.matchAll(/.{0,500}(?:ticket|X-Ticket|X-Ticket-Response|challenge|response|crypto|hash|sha|md5|data\/ticket).{0,1000}/gis)].map(m=>m[0].replace(/\s+/g," ").slice(0,1500)).slice(0,25)};
        }
        return json({ok:true,modules:result});
      }catch(e){return json({ok:false,stage:"module-inspection",error:String(e)},502);}
    }

    if(u.pathname==="/test/apijs/raw"){
      try{
        const dr=await get(DANIEL_URL); const html=await dr.text();
        const apiJsUrl=html.match(/https:\/\/www\.xcontest\.org\/api\/js\/\?key=[^"'<>\\s]+/i)?.[0];
        if(!apiJsUrl) return new Response("api/js URL not found",{status:502,headers:{"content-type":"text/plain; charset=utf-8"}});
        const ar=await get(apiJsUrl,"application/javascript,text/javascript,*/*;q=0.8"); const js=await ar.text();
        return new Response(js,{status:ar.status,headers:{"content-type":"text/plain; charset=utf-8","cache-control":"no-store"}});
      }catch(e){return new Response(String(e),{status:502,headers:{"content-type":"text/plain; charset=utf-8"}});}
    }

    if(u.pathname==="/test/apijs"){
      try{
        const dr=await get(DANIEL_URL); const html=await dr.text();
        const apiJsUrl=html.match(/https:\/\/www\.xcontest\.org\/api\/js\/\?key=[^"'<>\\s]+/i)?.[0];
        if(!apiJsUrl) return json({ok:false,stage:"find-api-js"},502);
        const ar=await get(apiJsUrl,"application/javascript,text/javascript,*/*;q=0.8"); const js=await ar.text();
        const contexts=[...js.matchAll(/.{0,600}(?:ticket|X-Ticket|response|challenge|crypto|hash|sha|md5|fetch|data\/ticket).{0,1200}/gis)]
          .map(m=>m[0].replace(/\s+/g," ").slice(0,1800)).slice(0,40);
        const funcs=[...js.matchAll(/(?:function\s+[A-Za-z_$][\w$]*\s*\([^)]*\)|(?:const|let|var)\s+[A-Za-z_$][\w$]*\s*=\s*(?:async\s*)?\([^)]*\)\s*=>)[\s\S]{0,1200}/g)]
          .map(m=>m[0]).filter(x=>/ticket|response|hash|crypto|sha|fetch/i.test(x)).slice(0,20);
        return json({ok:ar.ok,apiJsStatus:ar.status,apiJsUrl,bytes:js.length,signals:{ticket:/ticket/i.test(js),xTicket:/X-Ticket/i.test(js),crypto:/crypto/i.test(js),subtle:/subtle/i.test(js),sha:/sha-?1|sha-?256/i.test(js)},contexts,functions:funcs});
      }catch(e){return json({ok:false,stage:"api-js-inspection",error:String(e)},502);}
    }

    if(u.pathname==="/test/data"){
      try{
        const dr=await get(DANIEL_URL); const html=await dr.text();
        const key=html.match(/https:\/\/www\.xcontest\.org\/api\/js\/\?key=([^"'&<]+)/i)?.[1];
        const source=html.match(/source\s*:\s*\{\s*league\s*:\s*['"]([^'"]+)['"]\s*,\s*volume\s*:\s*['"]([^'"]+)['"]/i);
        const item=html.match(/item\s*:\s*['"]([^'"]+)['"]/i)?.[1] || "DDirjan/3.10.2026/14:02";
        if(!key||!source) return json({ok:false,stage:"parse-page-config",detailStatus:dr.status,keyFound:!!key,sourceFound:!!source,item},502);
        const league=source[1], volume=source[2];
        const ticketUrl="https://www.xcontest.org/api/data/ticket/?key="+encodeURIComponent(key);
        const tr=await get(ticketUrl,"application/json,*/*;q=0.8"); const ticketText=await tr.text();
        let ticketJson=null; try{ticketJson=JSON.parse(ticketText)}catch{}
        const ticket=ticketJson?.ticket;
        const out={ok:false,detailStatus:dr.status,keyFound:true,league,volume,item,ticketStatus:tr.status,ticketUrl,ticketResponse:ticketJson||ticketText.slice(0,1000)};
        if(!tr.ok||!ticket){return json(out,502);}
        // The public widget computes a challenge response in browser JS before the data request.
        // This route intentionally stops here; it does not bypass user verification.
        out.ok=true; out.next="Public ticket obtained. Browser widget still computes X-Ticket-Response before /api/data flight fetch.";
        return json(out);
      }catch(e){return json({ok:false,stage:"data-inspection",error:String(e)},502);}
    }

    if(u.pathname==="/test/daily-date"){
      try{
        const url="https://www.xcontest.org/world/en/flights/daily-score-pg/";
        const r=await get(url); const html=await r.text();
        const apiJs=(html.match(/<script[^>]+src=['"]([^'"]*\/api\/js\/\?key=[^'"]+)['"]/i)||[])[1]||null;
        const key=apiJs ? (apiJs.match(/[?&]key=([^&]+)/)||[])[1] : null;
        const config=(html.match(/XContest\.run\(['"]flights['"]\s*,\s*\{[\s\S]*?\n\s*\}\);/i)||[])[0]||null;
        const dateSignals=[];
        for(const term of ["date : 'last'","FilterHashGET","hashGET","HGET_filter","date_from","t_date_from","startItemIndex","getRequestUrl","getDataUrl"]){
          dateSignals.push({term,found:html.includes(term)});
        }
        return json({
          ok:r.ok,status:r.status,url:r.url,targetDate:"03.10.2026",
          apiJs,key,
          note:"Inspection only: identify the public date/list request shape; no user-verification token is generated or bypassed.",
          config:config?config.slice(0,12000):null,
          dateSignals
        });
      }catch(e){return json({ok:false,stage:"daily-date-inspection",error:String(e)},502);}
    }

    if(u.pathname==="/test/daily-score"){
      try{
        const url="https://www.xcontest.org/world/en/flights/daily-score-pg/";
        const r=await get(url); const html=await r.text();
        const lines=html.split(/\r?\n/);
        const interesting=lines.filter(x=>/XContest\.run|daily|score|date|source|volume|sortBy|filterVars|joinList|verifyToken|userVerify|cData|2027/i.test(x)).map(x=>x.trim()).filter(Boolean).slice(0,220);
        const scripts=[...html.matchAll(new RegExp("<script\\b[^>]*>[\\s\\S]*?</script>","gi"))].map(m=>m[0]).filter(x=>/XContest\.run|daily|score|date|source|volume|verifyToken|userVerify/i.test(x)).map(x=>x.slice(0,16000)).slice(0,20);
        const hrefs=[...html.matchAll(/href=["']([^"']+)["']/gi)].map(m=>m[1].replace(/&amp;/g,"&")).filter(x=>/daily|score|date|day|flights/i.test(x)).filter((v,i,a)=>a.indexOf(v)===i).slice(0,120);
        return json({ok:r.ok,status:r.status,url:r.url,bytes:html.length,interesting,hrefs,scripts});
      }catch(e){return json({ok:false,stage:"daily-score-pg-inspection",error:String(e)},502);}
    }

    if(u.pathname==="/test/flights-module"){
      try{
        const url="https://d393ilck4xazzy.cloudfront.net/api/js/2.6.36/contest.js";
        const r=await get(url,"application/javascript,text/javascript,*/*;q=0.8"); const js=await r.text();
        const terms=["flights","filterVars","joinList","time_claim","detail_glider_catg","subcontest","pager","pagination","pageSize","offset","limit","verifyToken"];
        const hits={};
        for(const term of terms){
          const out=[]; let from=0;
          while(out.length<8){
            const p=js.indexOf(term,from); if(p<0) break;
            out.push(js.slice(Math.max(0,p-500),Math.min(js.length,p+1000)));
            from=p+term.length;
          }
          hits[term]=out;
        }
        return json({ok:r.ok,status:r.status,url,bytes:js.length,hits});
      }catch(e){return json({ok:false,stage:"flights-module-inspection",error:String(e)},502);}
    }

    if(u.pathname==="/test/flights-raw"){
      try{
        const url="https://www.xcontest.org/world/en/flights/";
        const r=await get(url); const html=await r.text();
        const lines=html.split(/\r?\n/);
        const interesting=lines.filter(x=>/XContest|run\s*\(|gadget|contest|flight|pager|page|offset|limit|sort|source|volume|2027/i.test(x)).map(x=>x.trim()).filter(Boolean).slice(0,180);
        return json({ok:r.ok,status:r.status,url:r.url,bytes:html.length,interesting,tail:html.slice(-12000)});
      }catch(e){return json({ok:false,stage:"public-flights-raw",error:String(e)},502);}
    }

    if(u.pathname==="/test/flights-list"){
      try{
        const url="https://www.xcontest.org/world/en/flights/";
        const r=await get(url); const html=await r.text();
        const forms=[...html.matchAll(new RegExp("<form\\\\b[\\\\s\\\\S]*?</form>","gi"))].map(m=>m[0]).filter(x=>/filter|flight|page|sort|date/i.test(x)).map(x=>x.slice(0,12000)).slice(0,12);
        const hrefs=[...html.matchAll(/href=["']([^"']+)["']/gi)].map(m=>m[1].replace(/&amp;/g,"&")).filter(x=>/flights|page|sort|filter|start|offset|list/i.test(x)).filter((v,i,a)=>a.indexOf(v)===i).slice(0,150);
        const scripts=[...html.matchAll(new RegExp("<script\\\\b[^>]*>[\\\\s\\\\S]*?</script>","gi"))].map(m=>m[0]).filter(x=>/pagination|pager|offset|filter|flights|ajax|XContest\\.run|contest/i.test(x)).map(x=>x.slice(0,10000)).slice(0,20);
        const inputs=[...html.matchAll(/<(?:input|select|option)\\b[^>]*>/gi)].map(m=>m[0]).filter(x=>/page|sort|filter|date|country|takeoff|limit|offset/i.test(x)).slice(0,150);
        return json({ok:r.ok,status:r.status,url:r.url,bytes:html.length,forms,hrefs,inputs,scripts});
      }catch(e){return json({ok:false,stage:"public-flights-list-inspection",error:String(e)},502);}
    }

    if(u.pathname==="/test/meta"){
      try{
        const dr=await get(DANIEL_URL); const html=await dr.text();
        const metas=[...html.matchAll(/<meta\b[^>]*>/gi)].map(m=>m[0]).filter(x=>/og:|twitter:|image|url|description|flight|map/i.test(x)).slice(0,80);
        const links=[...html.matchAll(/<link\b[^>]*>/gi)].map(m=>m[0]).filter(x=>/canonical|alternate|image|preload|flight|map/i.test(x)).slice(0,80);
        const scripts=[...html.matchAll(/<script\b[^>]*>[\s\S]*?<\/script>/gi)].map(m=>m[0]).filter(x=>/application\/ld\+json|flightId|flight_id|item\s*:|DDirjan|flight\.thumbs|og:image/i.test(x)).map(x=>x.slice(0,4000)).slice(0,30);
        const ids=[...html.matchAll(/(?:flight(?:Id|_id|id)|fl)\s*[:=]\s*['"]?([A-Za-z0-9_:\/-]{3,120})/gi)].map(m=>m[1]).filter((v,i,a)=>a.indexOf(v)===i).slice(0,50);
        const urls=[...html.matchAll(/https?:\/\/[^"'<>\\s]+/gi)].map(m=>m[0].replace(/&amp;/g,"&")).filter(x=>/flight|map|thumb|image|api|DDirjan/i.test(x)).filter((v,i,a)=>a.indexOf(v)===i).slice(0,80);
        return json({ok:dr.ok,detailStatus:dr.status,detailUrl:dr.url,meta:metas,links,scripts,possibleIds:ids,interestingUrls:urls});
      }catch(e){return json({ok:false,stage:"public-meta-inspection",error:String(e)},502);}
    }

    if(u.pathname==="/test/static-image"){
      try{
        const dr=await get(DANIEL_URL); const html=await dr.text();
        const imgs=[...html.matchAll(/<img[^>]+src=["']([^"']*flight\.thumbs[^"']*)["']/gi)].map(m=>m[1].replace(/&amp;/g,"&"));
        const resolved=imgs.map(x=>new URL(x,dr.url).href);
        const results=[];
        for(const url of resolved.slice(0,4)){
          const r=await get(url,"image/avif,image/webp,image/png,image/jpeg,*/*;q=0.8");
          results.push({url,status:r.status,contentType:r.headers.get("content-type"),contentLength:r.headers.get("content-length")});
        }
        return json({ok:dr.ok,detailStatus:dr.status,detailUrl:dr.url,imageCount:resolved.length,images:results});
      }catch(e){return json({ok:false,stage:"static-image-public-flow",error:String(e)},502);}
    }

    if(u.pathname==="/test/static-map"){
      try{
        const dr=await get(DANIEL_URL); const html=await dr.text();
        const item=html.match(/item\s*:\s*['"]([^'"]+)['"]/i)?.[1]||null;
        const league=html.match(/league\s*:\s*['"]([^'"]+)['"]/i)?.[1]||null;
        const volume=html.match(/volume\s*:\s*['"]([^'"]+)['"]/i)?.[1]||null;
        const bundleUrl=html.match(/https?:\/\/[^"'<>\\s]+\/widget\/flight-map\/[^"'<>\\s]+\/bundle\.js/i)?.[0]||null;
        const staticContext=html.split(/\r?\n/).filter(x=>/loadFlightMapStatic|Static map|addFlight|adjustToFlightBounds|setApi|item\s*:|league\s*:|volume\s*:/i.test(x)).map(x=>x.trim()).slice(0,40);
        return json({ok:dr.ok,detailStatus:dr.status,detailUrl:dr.url,item,league,volume,bundleUrl,staticContext});
      }catch(e){return json({ok:false,stage:"static-map-public-flow",error:String(e)},502);}
    }

    if(u.pathname==="/test/map"){
      try{
        const dr=await get(DANIEL_URL); const html=await dr.text();
        const bundleUrl=html.match(/https?:\/\/[^"'<>\\s]+\/widget\/flight-map\/[^"'<>\\s]+\/bundle\.js/i)?.[0];
        const jwtContext=[...html.matchAll(/.{0,500}(?:jwt|loadFlightMap|startMap).{0,1000}/gis)].map(m=>m[0].replace(/\s+/g," ").slice(0,1600)).slice(0,12);
        if(!bundleUrl) return json({ok:false,stage:"find-bundle",detailStatus:dr.status,jwtContext},502);
        const br=await get(bundleUrl,"application/javascript,text/javascript,*/*;q=0.8"); const js=await br.text();
        const urls=[...js.matchAll(/https?:\/\/[^"'\\s)]+/gi)].map(m=>m[0]).filter((v,i,a)=>a.indexOf(v)===i).slice(0,100);
        const paths=[...js.matchAll(/["'`](\/[^"'\`\\s]{2,180})["'`]/g)].map(m=>m[1]).filter(x=>/api|flight|track|map|igc|item|token|jwt/i.test(x)).filter((v,i,a)=>a.indexOf(v)===i).slice(0,100);
        const contexts=[...js.matchAll(/.{0,300}(?:fetch\(|axios|XMLHttpRequest|Authorization|Bearer|jwt|token|flight|track|igc).{0,600}/gis)].map(m=>m[0].replace(/\s+/g," ").slice(0,1000)).slice(0,30);
        return json({ok:dr.ok&&br.ok,detailStatus:dr.status,bundleStatus:br.status,bundleUrl,bundleBytes:js.length,jwtContext,urls,interestingPaths:paths,bundleContexts:contexts});
      }catch(e){return json({ok:false,stage:"map-inspection",error:String(e)},502);}
    }

    if(u.pathname==="/test/daniel"){
      try{
        const dr=await get(DANIEL_URL); const html=await dr.text(); const body=textOnly(html);
        const lines=html.split(/\r?\n/).filter(line=>/DDirjan|Daniel|Bunloc|Romania|takeoff|launch|glider|wing|igc|lat|lon|coord|map|track|6\.75|9\.44/i.test(line)).map(line=>textOnly(line).slice(0,800)).filter(Boolean).slice(0,80);
        const coords=[]; const re=/(-?\d{1,2}\.\d{4,8})[^\d-]{1,20}(-?\d{1,3}\.\d{4,8})/g; let m;
        while((m=re.exec(html))!==null){const a=Number(m[1]),b=Number(m[2]);if(a>=40&&a<=50&&b>=20&&b<=30)coords.push([a,b]);if(coords.length>=30)break;}
        return json({ok:dr.ok,detailStatus:dr.status,detailUrl:dr.url,bytes:html.length,title:(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]||"").trim(),cloudflareChallenge:/cf-turnstile|Just a moment|challenge-platform|cf-chl-/i.test(html),unauthorized:/authorized users only|ERROR\s*401/i.test(body),signals:{daniel:/Daniel\s+Dirjan|DDirjan/i.test(html),bunloc:/Bunloc/i.test(html),romania:/Romania|România/i.test(html),igc:/\.igc\b|IGC/i.test(html),glider:/glider|wing/i.test(html),map:/map|leaflet|openlayers|mapy/i.test(html),track:/track|polyline|flightPath/i.test(html)},coordPairs:coords,interestingLines:lines,textPreview:body.slice(0,3500)},dr.ok?200:502);
      }catch(e){return json({ok:false,stage:"daniel-detail-fetch",error:String(e)},502);}
    }

    if(u.pathname==="/test/romania"){
      try{
        const rr=await get(RSS_URL,"application/rss+xml,application/xml,text/xml;q=0.9,*/*;q=0.8");
        const xml=await rr.text(); const items=parseRss(xml);
        const sample=items.slice(0,5).map(x=>({title:x.title||null,link:x.link||null,date:x.pubDate||x.date||null}));
        return json({ok:rr.ok,rssStatus:rr.status,itemCount:items.length,note:"Lightweight test: RSS only; detail pages are fetched one at a time by /test/detail.",sample});
      }catch(e){return json({ok:false,stage:"romania-rss",error:String(e)},502);}
    }

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
