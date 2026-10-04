const cats=["OPEN","CCC","EN-D","EN-C","EN-B","EN-A","FEMININ","TANDEM","CLUBURI","100 KM+"];
const API="https://xc-romania.danbrasov77.workers.dev";
let cat="OPEN", openRanking=[], categoryRanking={};
const tabs=document.querySelector("#tabs"),body=document.querySelector("#ranking"),search=document.querySelector("#search");
cats.forEach(c=>{const b=document.createElement("button");b.textContent=c;b.onclick=()=>{cat=c;renderTabs();loadCategory()};tabs.appendChild(b)});
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
 body.innerHTML=a.map(x=>'<tr><td class="rank">'+x.rank+'</td><td class="pilot">'+esc(x.pilot_name)+'</td><td>'+esc(x.gliders||"—")+'</td><td><span class="badge">'+esc(x.wing_classes||cat)+'</span></td><td>—</td><td>'+x.counted_flights+'</td><td>'+Number(x.best_distance_km||0).toFixed(1)+' km</td><td class="points">'+Number(x.total_points||0).toFixed(2)+'</td></tr>').join("")||'<tr><td colspan="8">Nu există rezultate.</td></tr>';
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
search.oninput=render;renderTabs();loadOpen();
