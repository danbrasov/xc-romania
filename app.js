const cats=["OPEN","CCC","EN-D","EN-C","EN-B","EN-A","FEMININ","TANDEM","CLUBURI","100 KM+"];
const demo=[
{name:"Andrei Popescu",wing:"Advance Omega ULS",cls:"EN-D",club:"Brașov XC",n:6,best:184.3,pts:812.4,sex:"M"},
{name:"Mihai Ionescu",wing:"Advance TAU DLS",cls:"EN-D",club:"Transylvania XC",n:6,best:176.8,pts:788.1,sex:"M"},
{name:"Elena Marin",wing:"Ozone Photon",cls:"EN-C",club:"Sky Club",n:6,best:151.2,pts:704.7,sex:"F"},
{name:"Radu Stan",wing:"Gin Bonanza 3",cls:"EN-C",club:"Brașov XC",n:5,best:139.6,pts:651.3,sex:"M"},
{name:"Ioana Pavel",wing:"Ozone Rush",cls:"EN-B",club:"Carpathian Flyers",n:6,best:112.5,pts:580.9,sex:"F"},
{name:"Alex Dinu",wing:"Nova Mentor",cls:"EN-B",club:"Sky Club",n:4,best:96.4,pts:431.8,sex:"M"},
{name:"Maria Luca",wing:"Advance Epsilon",cls:"EN-B",club:"Brașov XC",n:5,best:88.2,pts:409.2,sex:"F"},
{name:"Dan Mureșan",wing:"Nova Aonic",cls:"EN-A",club:"Carpathian Flyers",n:3,best:61.1,pts:245.5,sex:"M"}];
let cat="OPEN";
const tabs=document.querySelector("#tabs"),body=document.querySelector("#ranking"),search=document.querySelector("#search");
cats.forEach(c=>{let b=document.createElement("button");b.textContent=c;b.onclick=()=>{cat=c;renderTabs();render()};tabs.appendChild(b)});
function renderTabs(){[...tabs.children].forEach(b=>b.classList.toggle("active",b.textContent===cat))}
function filtered(){let q=search.value.toLowerCase();return demo.filter(x=>(cat==="OPEN"||cat==="CLUBURI"||cat==="100 KM+"&&x.best>=100||cat==="FEMININ"&&x.sex==="F"||cat===x.cls)&&(x.name+" "+x.wing+" "+x.club).toLowerCase().includes(q))}
function render(){let a=filtered().sort((a,b)=>b.pts-a.pts);document.querySelector("#title").textContent=cat==="OPEN"?"Open":cat;document.querySelector("#subtitle").textContent=cat==="OPEN"?"Toți piloții • toate clasele de parapantă • cele mai bune 6 zboruri":"Clasament sezon 2027";document.querySelector("#pilots").textContent=a.length;document.querySelector("#flights").textContent=a.reduce((s,x)=>s+x.n,0);document.querySelector("#km").textContent=Math.round(a.reduce((s,x)=>s+x.best,0))+" km";body.innerHTML=a.map((x,i)=>'<tr><td class="rank">'+(i+1)+'</td><td class="pilot">'+x.name+'</td><td>'+x.wing+'</td><td><span class="badge">'+x.cls+'</span></td><td>'+x.club+'</td><td>'+x.n+'</td><td>'+x.best.toFixed(1)+' km</td><td class="points">'+x.pts.toFixed(1)+'</td></tr>').join("")||'<tr><td colspan="8">Nu există rezultate.</td></tr>'}
search.oninput=render;renderTabs();render();