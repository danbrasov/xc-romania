const cats=["OPEN","CCC","EN-D","EN-C","EN-B","EN-A","FEMININ","TANDEM","CLUBURI","100 KM+"];
const API="https://xc-romania.danbrasov77.workers.dev";
let cat="OPEN", openRanking=[], categoryRanking={}, page=1;
const tabs=document.querySelector("#tabs"),body=document.querySelector("#ranking"),search=document.querySelector("#search");
cats.forEach(c=>{const b=document.createElement("button");b.textContent=c;b.onclick=()=>{cat=c;page=1;renderTabs();loadCategory()};tabs.appendChild(b)});
function renderTabs(){[...tabs.children].forEach(b=>b.classList.toggle("active",b.textContent===cat))}
function esc(v){return String(v??"—").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
function render(){
 document.querySelector("#title").textContent=cat==="OPEN"?"Open":cat;
 document.querySelector("#subtitle").textContent="Cele mai bune 6 zboruri • sezon 2027";
 let src=cat==="OPEN"?openRanking:(categoryRanking[cat]||[]);
 if(["TANDEM","CLUBURI","100 KM+"].includes(cat)){body.innerHTML='<tr><td colspan="8">Categoria va fi conectată în etapa următoare.</td></tr>';document.querySelector("#pilots").textContent="—";document.querySelector("#flights").textContent="—";document.querySelector("#km").textContent="—";return}
 const q=search.value.trim().toLowerCase();
 const a=src.filter(x=>(x.pilot_name+" "+(x.pilot_username||"")+" "+(x.gliders||"")).toLowerCase().includes(q));
 document.querySelector("#pilots").textContent=a.length;
 document.querySelector("#flights").textContent=a.reduce((n,x)=>n+Number(x.counted_flights||0),0);
 document.querySelector("#km").textContent=Math.round(a.reduce((n,x)=>n+Number(x.best_distance_km||0),0))+" km";
 const size=Number(document.querySelector("#pageSize")?.value||20), pages=Math.max(1,Math.ceil(a.length/size)); if(page>pages)page=pages;
 const shown=a.slice((page-1)*size,page*size);
 body.innerHTML=shown.map(x=>'<tr><td class="rank">'+x.rank+'</td><td class="pilot">'+esc(x.pilot_name)+'</td><td>'+esc(x.gliders||"—")+'</td><td><span class="badge">'+esc(x.wing_classes||cat)+'</span></td><td>—</td><td>'+x.counted_flights+'</td><td>'+Number(x.best_distance_km||0).toFixed(1)+' km</td><td class="points">'+Number(x.total_points||0).toFixed(2)+'</td></tr>').join("")||'<tr><td colspan="8">Nu există rezultate.</td></tr>';
 const p=document.querySelector("#pagination");
 if(p) p.innerHTML=pages>1?'<button id="prevPage" '+(page===1?'disabled':'')+'>‹ Anterior</button><span>Pagina '+page+' / '+pages+'</span><button id="nextPage" '+(page===pages?'disabled':'')+'>Următor ›</button>':'';
 if(document.querySelector("#prevPage"))document.querySelector("#prevPage").onclick=()=>{page--;render();window.scrollTo({top:300,behavior:"smooth"})};
 if(document.querySelector("#nextPage"))document.querySelector("#nextPage").onclick=()=>{page++;render();window.scrollTo({top:300,behavior:"smooth"})};
}
async function loadOpen(){
 body.innerHTML='<tr><td colspan="8">Se încarcă clasamentul…</td></tr>';
 try{const r=await fetch(API+"/api/ranking/open");if(!r.ok)throw new Error("HTTP "+r.status);const d=await r.json();if(!d.ok)throw new Error(d.error||"API error");openRanking=d.ranking||[];render()}
 catch(e){body.innerHTML='<tr><td colspan="8">Nu am putut încărca clasamentul: '+esc(e.message)+'</td></tr>'}
}
async function loadCategory(){
 if(cat==="OPEN"){render();return}
 if(["TANDEM","CLUBURI","100 KM+"].includes(cat)){render();return}
 if(categoryRanking[cat]){render();return}
 body.innerHTML='<tr><td colspan="8">Se încarcă clasamentul…</td></tr>';
 try{const r=await fetch(API+"/api/ranking/category?cat="+encodeURIComponent(cat));const d=await r.json();if(!r.ok||!d.ok)throw new Error(d.error||"API error");categoryRanking[cat]=d.ranking||[];render()}
 catch(e){body.innerHTML='<tr><td colspan="8">Nu am putut încărca clasamentul: '+esc(e.message)+'</td></tr>'}
}
async function loadStats(){
 try{
  const r=await fetch(API+"/api/stats"),d=await r.json();if(!d.ok)return;
  const bf=d.bestFlight, fai=d.bestFAI;
  if(bf){document.querySelector("#stat-flight b").textContent=bf.pilot_name+" • "+Number(bf.distance_km).toFixed(1)+" km";document.querySelector("#stat-flight p").textContent=bf.takeoff_name+" • "+Number(bf.points).toFixed(2)+" pct • "+bf.glider_name}
  if(fai){document.querySelector("#stat-fai b").textContent=fai.pilot_name+" • "+Number(fai.distance_km).toFixed(1)+" km";document.querySelector("#stat-fai p").textContent=fai.takeoff_name+" • "+Number(fai.points).toFixed(2)+" pct"}
  const t=d.topTakeoffs||[];if(t.length){document.querySelector("#stat-takeoffs b").textContent=t[0].takeoff_name+" • "+t[0].flights+" zboruri";document.querySelector("#stat-takeoffs p").textContent=t.slice(1,4).map((x,i)=>(i+2)+". "+x.takeoff_name+" ("+x.flights+")").join(" • ")}
  const w=d.topWings||[];if(w.length){document.querySelector("#stat-wings b").textContent=w[0].glider_name+" • "+w[0].flights+" zboruri";document.querySelector("#stat-wings p").textContent=w.slice(1,4).map((x,i)=>(i+2)+". "+x.glider_name+" ("+x.flights+")").join(" • ")}
 }catch(e){}
}
search.oninput=()=>{page=1;render()};document.querySelector("#pageSize").onchange=()=>{page=1;render()};renderTabs();loadOpen();loadStats();
