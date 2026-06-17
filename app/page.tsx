"use client";
import React, { useEffect, useMemo, useState } from "react";

type Trade={id:string;date:string;dir:"BUY"|"SELL";sl:number;slHit:boolean;exit:number;mfe:number;notes:string};
type Tools={atr:string;baseline:string;c1:string;c2:string;volume:string;exit:string;continuation:string;notes:string};
type Pair={id:string;name:string;created:number;trades:Trade[]};
type Sys={id:string;name:string;created:number;tools:Tools;pairs:Pair[]};

const RR=[1,2,3,4,5,6];
const PILLARS:[keyof Tools,string][]=[["atr","ATR / Volatility"],["baseline","Baseline"],["c1","Confirmation 1"],["c2","Confirmation 2"],["volume","Volume"],["exit","Exit"],["continuation","Continuation"],["notes","System notes"]];
const emptyTools=():Tools=>({atr:"",baseline:"",c1:"",c2:"",volume:"",exit:"",continuation:"",notes:""});
const SECTIONS:{id:string;key?:string;label:string;hint:string;sc?:"pair"|"system"}[]=[
 {id:"sec-all",label:"All systems combined",hint:"overview totals scorecard"},
 {id:"sec-tools",label:"System tools",hint:"rename indicators pillars settings"},
 {id:"sec-pairs",label:"Pairs",hint:"switch pairs list"},
 {id:"sec-dashboard",label:"Dashboard",hint:"stats equity win rate expectancy drawdown"},
 {id:"sec-activity",key:"activity",label:"Trade activity",hint:"frequency cadence trades per week per month busiest how many"},
 {id:"sec-time",key:"perf",label:"Performance over time",hint:"monthly quarterly yearly trades per month"},
 {id:"sec-activity",key:"activity",label:"Trades per week / month (all pairs)",hint:"all pairs combined frequency cadence how many trades per week per month",sc:"system"},
 {id:"sec-season",key:"season",label:"Seasonality",hint:"day of week month of year"},
 {id:"sec-rmult",key:"hist",label:"R-multiple distribution",hint:"histogram shape of edge"},
 {id:"sec-montecarlo",key:"mc",label:"Monte Carlo",hint:"simulation luck range robust"},
 {id:"sec-optimizer",key:"opt",label:"TP2 optimizer",hint:"reward to risk take profit"},
 {id:"sec-import",key:"import",label:"Bulk import CSV",hint:"paste upload trades"},
 {id:"sec-trades",key:"trades",label:"Trades log",hint:"filter sort edit delete"},
];
const uid=()=>Math.random().toString(36).slice(2,9);
const f1=(n:number)=>(Math.round((isFinite(n)?n:0)*10)/10).toLocaleString();
const f2=(n:number)=>(isFinite(n)?n:0).toFixed(2);
const pc=(n:number)=>(isFinite(n)?n*100:0).toFixed(0)+"%";
const pct=(arr:number[],p:number)=>arr.length?arr[Math.min(arr.length-1,Math.max(0,Math.round(p*(arr.length-1))))]:0;

const SAMPLE:Omit<Trade,"id">[]=[
 {date:"2024-01-19",dir:"BUY",sl:41,slHit:false,exit:113,mfe:325,notes:""},
 {date:"2024-03-05",dir:"BUY",sl:35,slHit:true,exit:0,mfe:0,notes:""},
 {date:"2025-06-09",dir:"BUY",sl:52,slHit:false,exit:346,mfe:516,notes:""},
];

function deriveTrade(t:Trade,slMult:number,riskUSD:number){const tp1=t.sl/slMult;const e1=t.slHit?-t.sl:tp1;const e2=t.slHit?-t.sl:(t.exit||0);const net=e1+e2;const r=t.sl?net/(2*t.sl):0;const usd=t.sl?(net/t.sl)*riskUSD:0;return{tp1,e1,e2,net,r,usd};}
function streakOf(arr:Trade[]){let s=0,ms=0;arr.forEach(t=>{if(t.slHit){s++;ms=Math.max(ms,s);}else s=0;});return ms;}
function computeStats(trades:Trade[],slMult:number,riskUSD:number){
  const sum=(a:number[])=>a.reduce((x,y)=>x+y,0);
  const wins=trades.filter(t=>!t.slHit),losses=trades.filter(t=>t.slHit),total=trades.length;
  const ds=trades.map(t=>deriveTrade(t,slMult,riskUSD));const Rs=ds.map(d=>d.r);
  let cum=0,peak=0,maxdd=0;const eq:number[]=[];
  ds.forEach(d=>{cum+=d.r;eq.push(cum);peak=Math.max(peak,cum);maxdd=Math.min(maxdd,cum-peak);});
  const wMFE=wins.map(t=>t.mfe);
  return{total,wins:wins.length,losses:losses.length,winRate:total?wins.length/total:0,
    netPips:sum(ds.map(d=>d.net)),netR:sum(Rs),exp:total?sum(Rs)/total:0,usd:sum(ds.map(d=>d.usd)),
    best:Rs.length?Math.max(...Rs):0,worst:Rs.length?Math.min(...Rs):0,maxdd,
    avgMFE:wMFE.length?sum(wMFE)/wMFE.length:0,maxMFE:wMFE.length?Math.max(...wMFE):0,
    mfeR:wins.length?sum(wins.map(t=>t.sl?t.mfe/t.sl:0))/wins.length:0,Rs,eq};
}
function computeOpt(trades:Trade[],slMult:number){
  const wins=trades.filter(t=>!t.slHit),losses=trades.filter(t=>t.slHit),total=trades.length,L=losses.length;
  const lossSL=losses.reduce((a,t)=>a+t.sl,0),winTP1=wins.reduce((a,t)=>a+t.sl/slMult,0);
  const e1R=wins.length*(1/slMult)-L;
  const list=RR.map(R=>{let hits=0,e2p=0;wins.forEach(t=>{const tg=R*t.sl;if(t.mfe>=tg){hits++;e2p+=tg;}});
    const e2R=hits*R-L,combR=(e1R+e2R)/2;
    return{R,hits,hitPct:wins.length?hits/wins.length:0,e2exp:total?e2R/total:0,combR,exp:total?combR/total:0,netpips:(winTP1-lossSL)+(e2p-lossSL)};});
  return{list,bestExp:list.length?Math.max(...list.map(x=>x.exp)):0};
}
function groupStats(trades:Trade[],slMult:number,riskUSD:number,keyOf:(t:Trade)=>string){
  const g:{[k:string]:Trade[]}={};trades.forEach(t=>{if(!t.date)return;const k=keyOf(t);(g[k]=g[k]||[]).push(t);});
  return Object.keys(g).sort().map(k=>{const arr=g[k].slice().sort((a,b)=>a.date<b.date?-1:1);const st=computeStats(arr,slMult,riskUSD);
    return{k,count:arr.length,wins:st.wins,losses:st.losses,winRate:st.winRate,netR:st.netR,netPips:st.netPips,exp:st.exp,streak:streakOf(arr)};});
}
function computeHist(Rs:number[],bw:number){
  if(!Rs.length)return{bins:[] as {lo:number;hi:number;count:number}[],maxCount:0};
  const lo=Math.floor(Math.min(...Rs)/bw)*bw;let hi=Math.ceil(Math.max(...Rs)/bw)*bw;if(hi<=lo)hi=lo+bw;
  const nb=Math.min(40,Math.max(1,Math.round((hi-lo)/bw)));
  const bins=Array.from({length:nb},(_,i)=>({lo:lo+i*bw,hi:lo+(i+1)*bw,count:0}));
  Rs.forEach(r=>{let idx=Math.floor((r-lo)/bw);if(idx>=nb)idx=nb-1;if(idx<0)idx=0;bins[idx].count++;});
  return{bins,maxCount:Math.max(1,...bins.map(b=>b.count))};
}
function computeMC(Rs:number[],runs:number){
  const n=Rs.length;if(!n)return null;
  const finals:number[]=[],dds:number[]=[],paths:number[][]=[];
  const shuffle=(a:number[])=>{const x=a.slice();for(let i=x.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));const t=x[i];x[i]=x[j];x[j]=t;}return x;};
  for(let k=0;k<runs;k++){const s=shuffle(Rs);let cum=0,peak=0,mdd=0;const path:number[]=[];
    for(let i=0;i<s.length;i++){cum+=s[i];path.push(cum);peak=Math.max(peak,cum);mdd=Math.min(mdd,cum-peak);}
    finals.push(cum);dds.push(mdd);if(k<40)paths.push(path);}
  finals.sort((a,b)=>a-b);dds.sort((a,b)=>a-b);
  return{n,runs,finals,dds,paths,pPos:finals.filter(x=>x>0).length/runs};
}
function weekKey(d:string){const dt=new Date(d+"T00:00:00");if(isNaN(dt.getTime()))return "";const off=(dt.getDay()+6)%7;dt.setDate(dt.getDate()-off);return dt.toISOString().slice(0,10);}
function computeBuckets(trades:Trade[],slMult:number,riskUSD:number,labels:string[],idxFn:(t:Trade)=>number){
  const groups:Trade[][]=labels.map(()=>[]);
  trades.forEach(t=>{if(!t.date)return;const i=idxFn(t);if(i>=0&&i<labels.length)groups[i].push(t);});
  return labels.map((label,i)=>{const arr=groups[i];const st=computeStats(arr,slMult,riskUSD);return{label,count:arr.length,winRate:st.winRate,netR:st.netR,exp:st.exp,streak:streakOf(arr)};});
}
function buildEq(e:number[]){const w=600,h=130,p=8;if(!e.length)return{path:"",zero:h-p};const mn=Math.min(0,...e),mx=Math.max(0,...e),rng=(mx-mn)||1;
  const X=(i:number)=>e.length<2?w/2:p+(i/(e.length-1))*(w-2*p);const Y=(v:number)=>h-p-((v-mn)/rng)*(h-2*p);
  return{path:e.map((v,i)=>(i?"L":"M")+X(i).toFixed(1)+" "+Y(v).toFixed(1)).join(" "),zero:Y(0)};}

function CountUp({text}:{text:string}){
  const m=text.match(/^([^\d-]*-?)([\d,]*\.?\d+)(.*)$/);
  const target=m?parseFloat(m[2].replace(/,/g,"")):0;
  const [val,setVal]=useState(0);
  useEffect(()=>{
    if(!m)return;
    if(typeof window!=="undefined"&&window.matchMedia&&window.matchMedia("(prefers-reduced-motion: reduce)").matches){setVal(target);return;}
    let raf=0;const dur=700;const t0=performance.now();const ease=(t:number)=>1-Math.pow(1-t,3);
    const tick=(now:number)=>{const p=Math.min(1,(now-t0)/dur);setVal(target*ease(p));if(p<1)raf=requestAnimationFrame(tick);};
    raf=requestAnimationFrame(tick);
    return ()=>cancelAnimationFrame(raf);
  },[target]);
  if(!m)return <>{text}</>;
  const numStr=m[2];const decimals=(numStr.split(".")[1]||"").length;const hasComma=numStr.includes(",");
  const shown=hasComma?Math.round(val).toLocaleString():val.toFixed(decimals);
  return <>{m[1]}{shown}{m[3]}</>;
}
export default function Page(){
  const [systems,setSystems]=useState<Sys[]>([]);
  const [sysId,setSysId]=useState("");const [pairId,setPairId]=useState("");
  const [sysOv,setSysOv]=useState(false);const [pairOv,setPairOv]=useState(false);const [scope,setScope]=useState<"pair"|"system">("pair");
  const [allOpen,setAllOpen]=useState(true);const [moveTarget,setMoveTarget]=useState("");const [mergeSource,setMergeSource]=useState("");
  const [collapsed,setCollapsed]=useState<{[k:string]:boolean}>({import:true,perf:true,season:true,hist:true,mc:true,opt:true});
  const [tDir,setTDir]=useState("all");const [tRes,setTRes]=useState("all");const [tYear,setTYear]=useState("all");const [tSortKey,setTSortKey]=useState("");const [tSortDir,setTSortDir]=useState(1);
  const [mc,setMc]=useState<ReturnType<typeof computeMC>>(null);const [importText,setImportText]=useState("");const [lastBackup,setLastBackup]=useState(0);const [q,setQ]=useState("");
  const [slMult,setSlMult]=useState(1.5);const [riskPct,setRiskPct]=useState(1);const [balance,setBalance]=useState(10000);
  const blank={date:"",dir:"BUY",sl:"",slHit:"No",exit:"0",mfe:"",notes:""};
  const [form,setForm]=useState<any>(blank);const [editId,setEditId]=useState<string|null>(null);const [loaded,setLoaded]=useState(false);

  useEffect(()=>{try{
    const s=localStorage.getItem("tr2r_set");if(s){const o=JSON.parse(s);setSlMult(o.slMult);setRiskPct(o.riskPct);setBalance(o.balance);}const lb=localStorage.getItem("tr2r_lastbackup");if(lb)setLastBackup(parseInt(lb,10)||0);
    const sv=localStorage.getItem("tr2r_systems");
    if(sv){const arr=JSON.parse(sv) as Sys[];setSystems(arr);const a=arr[0];setSysId(a?a.id:"");setPairId(a&&a.pairs[0]?a.pairs[0].id:"");}
    else{const sys:Sys={id:uid(),name:"My system",created:Date.now(),tools:emptyTools(),pairs:[]};setSystems([sys]);setSysId(sys.id);setPairId("");}
  }catch(e){}setLoaded(true);},[]);
  useEffect(()=>{if(loaded)localStorage.setItem("tr2r_systems",JSON.stringify(systems));},[systems,loaded]);
  useEffect(()=>{if(loaded)localStorage.setItem("tr2r_set",JSON.stringify({slMult,riskPct,balance}));},[slMult,riskPct,balance,loaded]);
  useEffect(()=>{if(loaded)localStorage.setItem("tr2r_lastbackup",String(lastBackup));},[lastBackup,loaded]);

  const riskUSD=(riskPct/100)*balance;
  const activeSys=useMemo(()=>systems.find(s=>s.id===sysId)||null,[systems,sysId]);
  const activePair=useMemo(()=>activeSys?activeSys.pairs.find(p=>p.id===pairId)||null:null,[activeSys,pairId]);
  const scopeLabel=scope==="system"?(activeSys?"all pairs in "+activeSys.name:""):(activePair?activePair.name:"");

  const allTrades=useMemo(()=>{const a=systems.reduce((acc,s)=>acc.concat(s.pairs.reduce((x,p)=>x.concat(p.trades),[] as Trade[])),[] as Trade[]);return a.slice().sort((x,y)=>(x.date||"")<(y.date||"")?-1:(x.date||"")>(y.date||"")?1:0);},[systems]);
  const newSinceBackup=Math.max(0,allTrades.length-lastBackup);const needBackup=allTrades.length>0&&newSinceBackup>=12;
  const issues=useMemo(()=>{if(!activePair)return [] as {t:Trade;i:number;msg:string}[];const out:{t:Trade;i:number;msg:string}[]=[];activePair.trades.forEach((t,i)=>{if(!t.date)out.push({t,i,msg:"No date - this trade is left out of monthly, quarterly and seasonality views"});if(!(t.sl>0))out.push({t,i,msg:"Stop loss is zero or missing"});if(!t.slHit){if(t.exit>0&&t.mfe>0&&t.mfe<t.exit)out.push({t,i,msg:"MFE is below the exit - price cannot exit beyond a peak it never reached"});else if(t.exit>0&&!(t.mfe>0))out.push({t,i,msg:"Exit is recorded but MFE is 0 - add the furthest price ran"});if(t.exit<0)out.push({t,i,msg:"Negative exit on a trade that did not hit stop"});}});return out;},[activePair]);
  const allStats=useMemo(()=>computeStats(allTrades,slMult,riskUSD),[allTrades,slMult,riskUSD]);
  const allPairCount=useMemo(()=>systems.reduce((a,s)=>a+s.pairs.length,0),[systems]);

  const vTrades=useMemo(()=>{const base=scope==="system"&&activeSys?activeSys.pairs.reduce((a,p)=>a.concat(p.trades),[] as Trade[]):(activePair?activePair.trades:[]);return base.slice().sort((a,b)=>(a.date||"")<(b.date||"")?-1:(a.date||"")>(b.date||"")?1:0);},[scope,activeSys,activePair]);
  const vstats=useMemo(()=>computeStats(vTrades,slMult,riskUSD),[vTrades,slMult,riskUSD]);
  const vopt=useMemo(()=>computeOpt(vTrades,slMult),[vTrades,slMult]);
  const vhist=useMemo(()=>computeHist(vstats.Rs,0.5),[vstats]);
  const monthly=useMemo(()=>groupStats(vTrades,slMult,riskUSD,t=>t.date.slice(0,7)),[vTrades,slMult,riskUSD]);
  const weekly=useMemo(()=>{const g:{[k:string]:number}={};vTrades.forEach(t=>{const k=weekKey(t.date);if(!k)return;g[k]=(g[k]||0)+1;});return Object.keys(g).sort().map(k=>({k,count:g[k]}));},[vTrades]);
  const activity=useMemo(()=>{const dated=vTrades.filter(t=>t.date);const total=dated.length;if(!total)return null;
    const first=dated[0].date,last=dated[dated.length-1].date;
    const days=Math.max(1,Math.round((new Date(last+"T00:00:00").getTime()-new Date(first+"T00:00:00").getTime())/86400000)+1);
    const bm=monthly.reduce((a,m)=>m.count>a.count?m:a,{k:"-",count:0});const bw=weekly.reduce((a,w)=>w.count>a.count?w:a,{k:"-",count:0});
    return{total,first,last,avgWk:total/Math.max(1,days/7),avgMo:total/Math.max(1,days/30.44),busiestMonth:bm,busiestWeek:bw,weeks:weekly.length,months:monthly.length};},[vTrades,monthly,weekly]);
  const quarterly=useMemo(()=>groupStats(vTrades,slMult,riskUSD,t=>t.date.slice(0,4)+" Q"+(Math.floor(((parseInt(t.date.slice(5,7),10)||1)-1)/3)+1)),[vTrades,slMult,riskUSD]);
  const yearly=useMemo(()=>groupStats(vTrades,slMult,riskUSD,t=>t.date.slice(0,4)),[vTrades,slMult,riskUSD]);

  const pairYears=useMemo(()=>Array.from(new Set((activePair?activePair.trades:[]).map(t=>t.date.slice(0,4)).filter(Boolean))).sort(),[activePair]);
  const viewTrades=useMemo(()=>{if(!activePair)return [] as {t:Trade;i:number;d:ReturnType<typeof deriveTrade>}[];
    let arr=activePair.trades.map((t,i)=>({t,i,d:deriveTrade(t,slMult,riskUSD)}));
    if(tDir!=="all")arr=arr.filter(x=>x.t.dir===tDir);
    if(tRes!=="all")arr=arr.filter(x=>tRes==="win"?!x.t.slHit:x.t.slHit);
    if(tYear!=="all")arr=arr.filter(x=>x.t.date.slice(0,4)===tYear);
    if(tSortKey){const g=(x:any)=>tSortKey==="date"?x.t.date:tSortKey==="sl"?x.t.sl:tSortKey==="r"?x.d.r:tSortKey==="net"?x.d.net:tSortKey==="usd"?x.d.usd:x.i;
      arr=arr.slice().sort((a,b)=>{const av=g(a),bv=g(b);return (av<bv?-1:av>bv?1:0)*tSortDir;});}
    return arr;
  },[activePair,tDir,tRes,tYear,tSortKey,tSortDir,slMult,riskUSD]);

  const sysRows=useMemo(()=>systems.map(s=>{const all=s.pairs.reduce((a,p)=>a.concat(p.trades),[] as Trade[]);const st=computeStats(all,slMult,riskUSD);
    let bp="-",bpe=-Infinity;s.pairs.forEach(p=>{if(p.trades.length){const ps=computeStats(p.trades,slMult,riskUSD);if(ps.exp>bpe){bpe=ps.exp;bp=p.name;}}});
    return{s,st,bestPair:bp,bestPairExp:isFinite(bpe)?bpe:0};}),[systems,slMult,riskUSD]);
  const pairRows=useMemo(()=>activeSys?activeSys.pairs.map(p=>{const st=computeStats(p.trades,slMult,riskUSD);const op=computeOpt(p.trades,slMult);
    let bk=op.list[0];op.list.forEach(o=>{if(bk&&o.exp>bk.exp)bk=o;});return{p,st,bestR:bk?bk.R:0,bestExp:bk?bk.exp:0};}):[],[activeSys,slMult,riskUSD]);

  const updateSys=(fn:(s:Sys)=>Sys)=>setSystems(prev=>prev.map(s=>s.id===sysId?fn(s):s));
  const updatePair=(fn:(p:Pair)=>Pair)=>updateSys(s=>({...s,pairs:s.pairs.map(p=>p.id===pairId?fn(p):p)}));
  const openSys=(s:Sys)=>{setSysId(s.id);setSysOv(false);setPairOv(false);setPairId(s.pairs[0]?s.pairs[0].id:"");setEditId(null);setForm(blank);setMoveTarget("");};
  const newSystem=()=>{const name=prompt("New system name (e.g. System 1, My NNFX v2)");if(!name)return;const sys:Sys={id:uid(),name:name.trim()||"SYSTEM",created:Date.now(),tools:emptyTools(),pairs:[]};setSystems(prev=>[...prev,sys]);setSysId(sys.id);setPairId("");setSysOv(false);setPairOv(false);};
  const deleteSystem=()=>{if(!activeSys)return;if(!confirm("Delete the whole system "+activeSys.name+"?"))return;const id=activeSys.id;setSystems(prev=>{const rest=prev.filter(s=>s.id!==id);const a=rest[0];setSysId(a?a.id:"");setPairId(a&&a.pairs[0]?a.pairs[0].id:"");return rest;});};
  const setTool=(k:keyof Tools,v:string)=>updateSys(s=>({...s,tools:{...s.tools,[k]:v}}));
  const newPair=()=>{if(!activeSys)return;const name=prompt("New pair name (e.g. EURUSD)");if(!name)return;const p:Pair={id:uid(),name:name.trim()||"PAIR",created:Date.now(),trades:[]};updateSys(s=>({...s,pairs:[...s.pairs,p]}));setPairId(p.id);setPairOv(false);setEditId(null);setForm(blank);};
  const renamePair=()=>{if(!activePair)return;const name=prompt("Rename pair",activePair.name);if(!name)return;updatePair(p=>({...p,name:name.trim()||p.name}));};
  const deletePair=()=>{if(!activePair||!activeSys)return;if(!confirm("Delete pair "+activePair.name+"?"))return;const id=activePair.id;updateSys(s=>({...s,pairs:s.pairs.filter(p=>p.id!==id)}));const rest=activeSys.pairs.filter(p=>p.id!==id);setPairId(rest[0]?rest[0].id:"");};
  const transferPair=(targetId:string,mode:"move"|"copy")=>{
    if(!activePair||!activeSys)return;
    if(!targetId){alert("Choose a destination system first.");return;}
    if(targetId===activeSys.id){alert("That is the same system this pair is already in.");return;}
    const src=activePair;const srcName=activeSys.name;const destName=(systems.find(s=>s.id===targetId)||{name:"the system"}).name;
    if(mode==="move"&&!confirm("Move "+src.name+" ("+src.trades.length+" trades) from "+srcName+" to "+destName+"? It will be removed from "+srcName+"."))return;
    const clone:Pair=mode==="copy"?{id:uid(),name:src.name,created:Date.now(),trades:src.trades.map(t=>({...t,id:uid()}))}:{id:src.id,name:src.name,created:src.created,trades:src.trades};
    const remaining=activeSys.pairs.filter(p=>p.id!==src.id);
    setSystems(prev=>prev.map(s=>{if(s.id===targetId)return{...s,pairs:[...s.pairs,clone]};if(mode==="move"&&s.id===activeSys.id)return{...s,pairs:s.pairs.filter(p=>p.id!==src.id)};return s;}));
    if(mode==="move")setPairId(remaining[0]?remaining[0].id:"");
    setMoveTarget("");
    alert((mode==="copy"?"Copied ":"Moved ")+src.name+" to "+destName+(mode==="move"?" (removed from "+srcName+")":" (a copy stays in "+srcName+")")+".");
  };
  const mergePair=(sourceId:string)=>{
    if(!activePair||!activeSys)return;
    if(!sourceId){alert("Choose a pair to merge in.");return;}
    if(sourceId===activePair.id){alert("Pick a different pair than the one open.");return;}
    const tgt=activePair;const srcP=activeSys.pairs.find(p=>p.id===sourceId);if(!srcP)return;
    if(!confirm("Merge "+srcP.name+" ("+srcP.trades.length+" trades) INTO "+tgt.name+"? "+srcP.name+" will then be deleted and its trades added to "+tgt.name+"."))return;
    const add=srcP.trades.map(t=>({...t,id:uid()}));
    updateSys(s=>({...s,pairs:s.pairs.filter(p=>p.id!==sourceId).map(p=>p.id===tgt.id?{...p,trades:[...p.trades,...add]}:p)}));
    setMergeSource("");
    alert("Merged "+srcP.name+" into "+tgt.name+". Check the Trades table and delete any duplicate rows if needed.");
  };
  const isOpen=(k:string)=>collapsed[k]!==true;
  const toggle=(k:string)=>setCollapsed(c=>({...c,[k]:!c[k]}));
  const collapseAll=(v:boolean)=>{setCollapsed({import:v,perf:v,season:v,hist:v,mc:v,opt:v,trades:v,issues:v});setAllOpen(!v);};
  const goSection=(id:string,key?:string,sc?:"pair"|"system")=>{if(key)setCollapsed(c=>({...c,[key]:false}));if(id==="sec-all")setAllOpen(true);if(sc)setScope(sc);setQ("");setTimeout(()=>{const el=document.getElementById(id);if(el)el.scrollIntoView({behavior:"smooth",block:"start"});},70);};
  const goSys=(s:Sys)=>{openSys(s);setQ("");setTimeout(()=>window.scrollTo({top:0,behavior:"smooth"}),60);};
  const goPair=(s:Sys,p:Pair)=>{setSysId(s.id);setPairId(p.id);setSysOv(false);setPairOv(false);setEditId(null);setForm(blank);setQ("");setTimeout(()=>{const el=document.getElementById("sec-dashboard");if(el)el.scrollIntoView({behavior:"smooth",block:"start"});},90);};
  const sortBy=(k:string)=>{if(tSortKey===k){setTSortDir(d=>-d);}else{setTSortKey(k);setTSortDir(1);}};
  const arrow=(k:string)=>tSortKey===k?(tSortDir>0?" \u2191":" \u2193"):"";
  const parseCSV=(text:string)=>{
    const lines=text.split(/\r?\n/).map(l=>l.trim()).filter(Boolean);const out:Trade[]=[];let bad=0;
    lines.forEach((line,idx)=>{
      if(idx===0&&/date/i.test(line)&&/dir/i.test(line))return;
      const parts=line.split(",");if(parts.length<3){bad++;return;}
      const date=(parts[0]||"").trim();const dir:"BUY"|"SELL"=(parts[1]||"").trim().toUpperCase()==="SELL"?"SELL":"BUY";
      const sl=parseFloat(parts[2]);if(!isFinite(sl)||sl<=0){bad++;return;}
      const slHit=/^(y|t|1)/i.test((parts[3]||"").trim());
      const exit=slHit?0:(parseFloat(parts[4])||0);const mfe=slHit?0:(parseFloat(parts[5])||0);
      const notes=parts.slice(6).join(",").trim();
      out.push({id:uid(),date,dir,sl,slHit,exit,mfe,notes});
    });
    return {trades:out,ok:out.length,bad};
  };
  const importFile=(e:React.ChangeEvent<HTMLInputElement>)=>{const file=e.target.files&&e.target.files[0];if(!file)return;const fr=new FileReader();fr.onload=()=>setImportText(String(fr.result||""));fr.readAsText(file);e.target.value="";};
  const runImport=()=>{if(!activePair)return;const r=parseCSV(importText);if(!r.ok){alert("No valid rows found. Each line needs at least date,dir,sl - check the format.");return;}updatePair(p=>({...p,trades:[...p.trades,...r.trades]}));setImportText("");alert("Imported "+r.ok+" trade(s)"+(r.bad?(" - skipped "+r.bad+" line(s) that could not be read"):"")+" into "+activePair.name+".");};
  const set=(k:string,v:any)=>setForm((p:any)=>({...p,[k]:v}));
  const submit=()=>{if(!activePair){alert("Create a pair first.");return;}const sl=parseFloat(form.sl)||0;if(!sl){alert("Enter the SL in pips.");return;}
    const t:Trade={id:editId||uid(),date:form.date,dir:form.dir==="SELL"?"SELL":"BUY",sl,slHit:form.slHit==="Yes",exit:parseFloat(form.exit)||0,mfe:parseFloat(form.mfe)||0,notes:form.notes||""};
    updatePair(p=>({...p,trades:editId?p.trades.map(x=>x.id===editId?t:x):[...p.trades,t]}));setEditId(null);setForm({...blank,dir:form.dir});};
  const edit=(t:Trade)=>{setEditId(t.id);setForm({date:t.date,dir:t.dir,sl:String(t.sl),slHit:t.slHit?"Yes":"No",exit:String(t.exit),mfe:String(t.mfe),notes:t.notes});window.scrollTo({top:0,behavior:"smooth"});};
  const del=(id:string)=>updatePair(p=>({...p,trades:p.trades.filter(x=>x.id!==id)}));
  const exportCSV=()=>{if(!activePair)return;const head=["date","dir","sl_pips","sl_hit","exit_tp2","mfe","notes"];
    const rows=activePair.trades.map(t=>[t.date,t.dir,t.sl,t.slHit?"Yes":"No",t.exit,t.mfe,(t.notes||"").replace(/[\r\n,]/g," ")]);
    const csv=[head.join(","),...rows.map(r=>r.join(","))].join("\n");
    const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([csv],{type:"text/csv"}));a.download=activePair.name+"_trades.csv";a.click();};
  const backup=()=>{const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([JSON.stringify({systems,set:{slMult,riskPct,balance}},null,2)],{type:"application/json"}));a.download="trade2retire_backup.json";a.click();setLastBackup(allTrades.length);};
  const restore=(e:React.ChangeEvent<HTMLInputElement>)=>{const file=e.target.files&&e.target.files[0];if(!file)return;const fr=new FileReader();fr.onload=()=>{try{const o=JSON.parse(String(fr.result));if(o.systems){setSystems(o.systems);const a=o.systems[0];setSysId(a?a.id:"");setPairId(a&&a.pairs[0]?a.pairs[0].id:"");}if(o.set){setSlMult(o.set.slMult);setRiskPct(o.set.riskPct);setBalance(o.set.balance);}setSysOv(false);setPairOv(false);}catch(err){alert("Invalid backup file.");}};fr.readAsText(file);e.target.value="";};

  const tiles=(st:ReturnType<typeof computeStats>):[string,string,number?][]=>[
    ["Total trades",String(st.total)],["Win rate",pc(st.winRate)],["Wins",String(st.wins)],["SL losses",String(st.losses)],
    ["Net pips",f1(st.netPips),st.netPips],["Net R",f2(st.netR),st.netR],["Expectancy R",f2(st.exp),st.exp],
    ["Account P&L","$"+Math.round(st.usd).toLocaleString(),st.usd],["Best trade R",f2(st.best),st.best],["Worst trade R",f2(st.worst),st.worst],
    ["Max drawdown R",f2(st.maxdd),st.maxdd],["Avg MFE (win)",f1(st.avgMFE)+"p"],["Largest MFE",f1(st.maxMFE)+"p"],["Avg MFE (R)",f2(st.mfeR)+"R"],
  ];
  const periodRow=(o:any)=>(<tr key={o.k}><td className="l">{o.k}</td><td>{o.count}</td><td className="win">{o.wins}</td><td className="loss">{o.losses}</td><td>{pc(o.winRate)}</td><td className={o.netR>=0?"win":"loss"}>{f2(o.netR)}</td><td className={o.netPips>=0?"win":"loss"}>{f1(o.netPips)}</td><td className={o.exp>=0?"win":"loss"}>{f2(o.exp)}</td><td className={o.streak>=3?"loss":""}>{o.streak}</td></tr>);
  const barChart=(arr:any[])=>{const vals=arr.map(m=>m.netR);if(!vals.length)return null;const w=600,h=90,mid=h/2,n=vals.length,maxAbs=Math.max(1,...vals.map(v=>Math.abs(v))),bw=Math.max(2,(w/n)-3);
    return(<svg className="eq" viewBox={"0 0 "+w+" "+h} preserveAspectRatio="none" style={{height:90}}><line x1="0" y1={mid} x2={w} y2={mid} stroke="#283349" strokeWidth="1"/>
      {vals.map((v,i)=>{const x=(i/n)*w+1.5,bh=(Math.abs(v)/maxAbs)*(mid-4),y=v>=0?mid-bh:mid;return(<rect key={i} x={x} y={y} width={bw} height={bh} fill={v>=0?"#22c55e":"#ef4444"} rx="1"/>);})}</svg>);};
  const sortTh=(k:string,label:string)=>(<th style={{cursor:"pointer"}} onClick={()=>sortBy(k)}>{label}{arrow(k)}</th>);
  const countChart=(rows:{k:string;count:number}[],labels:boolean)=>{const vals=rows.map(r=>r.count);if(!vals.length)return null;const w=600,h=100,p=labels?16:6,mx=Math.max(1,...vals),n=rows.length,bw=Math.max(2,w/n);
    return(<svg className="eq" viewBox={"0 0 "+w+" "+h} preserveAspectRatio="none" style={{height:100}}>{rows.map((r,i)=>{const x=i*bw,bh=(r.count/mx)*(h-p-12),y=h-p-bh;return(<g key={i}><rect x={x+bw*0.12} y={y} width={Math.max(1,bw*0.76)} height={bh} fill="#22d3ee" rx="1"/>{labels&&n<=14&&<text x={x+bw/2} y={h-4} fill="#6b7a90" fontSize="8" textAnchor="middle">{r.k.slice(2)}</text>}</g>);})}</svg>);};
  const seasonChart=(rows:{label:string;netR:number}[])=>{const vals=rows.map(r=>r.netR);if(!vals.length)return null;const w=600,h=110,mid=h/2-8,n=rows.length,maxAbs=Math.max(1,...vals.map(v=>Math.abs(v))),bw=w/n;
    return(<svg className="eq" viewBox={"0 0 "+w+" "+h} preserveAspectRatio="none" style={{height:110}}><line x1="0" y1={mid} x2={w} y2={mid} stroke="#283349" strokeWidth="1"/>
      {rows.map((r,i)=>{const v=r.netR,x=i*bw,bh=(Math.abs(v)/maxAbs)*(mid-6),y=v>=0?mid-bh:mid;return(<g key={i}><rect x={x+bw*0.18} y={y} width={bw*0.64} height={bh} fill={v>=0?"#22c55e":"#ef4444"} rx="1"/><text x={x+bw/2} y={h-3} fill="#6b7a90" fontSize="9" textAnchor="middle">{r.label}</text></g>);})}</svg>);};

  return (
  <div className="wrap">
    <div className="topbar">
      <div className="brand"><h1>Trade2Retire Academy <span className="tag">Backtester</span></h1>
        <p>Systems and pairs - all-pairs and all-systems dashboards - sortable trades - R-multiple histogram - Monte Carlo - TP2 optimizer</p></div>
      <div className="row" style={{flex:"1 1 320px",justifyContent:"flex-end"}}>
        <div className="search" style={{position:"relative",flex:"1 1 200px",maxWidth:340}}>
          <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search sections, systems, pairs..." />
          {q.trim()&&(()=>{const ql=q.trim().toLowerCase();
            const secHits=SECTIONS.filter(s=>(s.label+" "+s.hint).toLowerCase().includes(ql)).slice(0,6);
            const sysHits=systems.filter(s=>s.name.toLowerCase().includes(ql)).slice(0,4);
            const pairHits=systems.flatMap(s=>s.pairs.map(p=>({s,p}))).filter(o=>o.p.name.toLowerCase().includes(ql)).slice(0,5);
            if(!secHits.length&&!sysHits.length&&!pairHits.length)return(<div className="results"><div className="ritem mut">No matches</div></div>);
            return(<div className="results">
              {secHits.map((s,i)=>(<div key={"x"+i} className="ritem" onClick={()=>goSection(s.id,s.key,s.sc)}><span>{s.label}</span><span className="rk">section</span></div>))}
              {sysHits.map(s=>(<div key={s.id} className="ritem" onClick={()=>goSys(s)}><span>{s.name}</span><span className="rk">system</span></div>))}
              {pairHits.map(o=>(<div key={o.p.id} className="ritem" onClick={()=>goPair(o.s,o.p)}><span>{o.p.name} <span className="mut">in {o.s.name}</span></span><span className="rk">pair</span></div>))}
            </div>);})()}
        </div>
        <button className="btn" onClick={()=>collapseAll(true)}>Collapse</button>
        <button className="btn" onClick={()=>collapseAll(false)}>Expand</button>
        <button className="btn" onClick={newSystem}>+ System</button>
        <button className="btn" onClick={backup}>Backup</button>
        <label className="btn" style={{display:"inline-flex"}}>Restore<input type="file" accept=".json" onChange={restore} style={{display:"none"}}/></label>
      </div>
    </div>

    {needBackup&&<div className="banner"><div><strong>{newSinceBackup} new trades</strong> since your last backup. Your data lives in this browser only, so export a copy - a cleared cache would otherwise erase it.</div><div className="row" style={{flex:"0 0 auto"}}><button className="btn primary" onClick={backup}>Back up now</button><button className="btn" onClick={()=>setLastBackup(allTrades.length)}>Later</button></div></div>}
    <div id="sec-all" className="panel"><h2 style={{display:"flex",alignItems:"center",gap:10}}>All systems combined <button className="iconbtn" onClick={()=>setAllOpen(!allOpen)}>{allOpen?"hide":"show"}</button></h2>
      {allOpen&&<>
        <div className="grid">{([["Systems",String(systems.length)],["Pairs",String(allPairCount)],["Total trades",String(allStats.total)],["Win rate",pc(allStats.winRate)],["Net R",f2(allStats.netR),allStats.netR],["Expectancy R",f2(allStats.exp),allStats.exp],["Account P&L","$"+Math.round(allStats.usd).toLocaleString(),allStats.usd],["Max drawdown R",f2(allStats.maxdd),allStats.maxdd]] as [string,string,number?][]).map(([k,v,c])=>(<div className="tile" key={k}><div className="k">{k}</div><div className={"v"+(typeof c==="number"?(c>=0?" green":" red"):"")}><CountUp text={v}/></div></div>))}</div>
        {(()=>{const e=buildEq(allStats.eq);return(<svg className="eq" viewBox="0 0 600 130" preserveAspectRatio="none"><line x1="0" y1={e.zero} x2="600" y2={e.zero} stroke="#283349" strokeWidth="1"/><path d={e.path} fill="none" stroke="#3b82f6" strokeWidth="2"/></svg>);})()}
        <div className="note">Everything you have ever recorded, every system and pair, in date order.</div>
      </>}
    </div>

    <div className="panel"><h2>Systems</h2>
      <div className="row">
        {systems.map(s=>(<button key={s.id} className={"btn"+((s.id===sysId&&!sysOv)?" primary":"")} onClick={()=>openSys(s)}>{s.name} <span style={{opacity:.6}}>({s.pairs.length})</span></button>))}
        <div className="spacer"></div>
        <button className={"btn"+(sysOv?" primary":"")} onClick={()=>setSysOv(true)}>Compare systems</button>
      </div>
    </div>

    {sysOv ? (
      <div className="panel"><h2>Compare systems</h2>
        <div className="scroll"><table className="tbl">
          <thead><tr><th className="l">System</th><th>Pairs</th><th>Trades</th><th>Win %</th><th>Net R</th><th>Expectancy R</th><th className="l">Best pair</th><th>Best exp</th><th className="l"></th></tr></thead>
          <tbody>{sysRows.map(({s,st,bestPair,bestPairExp})=>(<tr key={s.id}>
            <td className="l">{s.name}</td><td>{s.pairs.length}</td><td>{st.total}</td><td>{pc(st.winRate)}</td>
            <td className={st.netR>=0?"win":"loss"}>{f2(st.netR)}</td><td className={st.exp>=0?"win":"loss"}>{f2(st.exp)}</td>
            <td className="l">{bestPair}</td><td className="win">{f2(bestPairExp)}</td>
            <td className="l"><button className="iconbtn" onClick={()=>openSys(s)}>open</button></td></tr>))}</tbody>
        </table></div>
      </div>
    ) : !activeSys ? (
      <div className="panel"><h2>No system selected</h2><div className="note">Click "+ New system" to start.</div></div>
    ) : (
    <>
    <div className="panel"><h2>Settings (apply to every system)</h2>
      <div className="row">
        <div className="field sm"><label>SL div (=ATR)</label><input type="number" step="0.1" value={slMult} onChange={e=>setSlMult(parseFloat(e.target.value)||1.5)}/></div>
        <div className="field sm"><label>Risk % / entry</label><input type="number" step="0.1" value={riskPct} onChange={e=>setRiskPct(parseFloat(e.target.value)||0)}/></div>
        <div className="field sm"><label>Balance ($)</label><input type="number" value={balance} onChange={e=>setBalance(parseFloat(e.target.value)||0)}/></div>
      </div>
      <div className="note">TP1 = SL / {slMult} = 1xATR. A 1:R TP2 target = R times your stop. 1R = risk% x balance = ${f1(riskUSD)} per entry.</div>
    </div>

    <div id="sec-tools" className="panel"><h2>System name and tools</h2>
      <div className="field" style={{marginBottom:10}}><label>System name (type to edit)</label><input value={activeSys.name} onChange={e=>updateSys(s=>({...s,name:e.target.value}))} placeholder="System name"/></div>
      <div className="row">{PILLARS.map(([k,label])=>(<div className="field" key={k}><label>{label}</label><input value={activeSys.tools[k]} onChange={e=>setTool(k,e.target.value)} placeholder={label}/></div>))}</div>
      <div className="row" style={{marginTop:10}}><button className="btn danger" onClick={deleteSystem}>Delete this system</button></div>
    </div>

    <div id="sec-pairs" className="panel"><h2>Pairs in {activeSys.name}</h2>
      <div className="row">
        {activeSys.pairs.map(p=>(<button key={p.id} className={"btn"+((p.id===pairId&&!pairOv)?" primary":"")} onClick={()=>{setPairId(p.id);setPairOv(false);setEditId(null);setForm(blank);setMoveTarget("");setMc(null);}}>{p.name} <span style={{opacity:.6}}>({p.trades.length})</span></button>))}
        <button className="btn" onClick={newPair}>+ New pair</button>
        <div className="spacer"></div>
        <button className={"btn"+(pairOv?" primary":"")} onClick={()=>setPairOv(true)}>All pairs overview</button>
      </div>
    </div>

    {pairOv ? (
      <div className="panel"><h2>Pairs overview - {activeSys.name}</h2>
        <div className="scroll"><table className="tbl">
          <thead><tr><th className="l">Pair</th><th>Trades</th><th>Win %</th><th>Net R</th><th>Expectancy R</th><th>Best TP2</th><th>Best exp</th><th className="l"></th></tr></thead>
          <tbody>{pairRows.map(({p,st,bestR,bestExp})=>(<tr key={p.id}>
            <td className="l">{p.name}</td><td>{st.total}</td><td>{pc(st.winRate)}</td>
            <td className={st.netR>=0?"win":"loss"}>{f2(st.netR)}</td><td className={st.exp>=0?"win":"loss"}>{f2(st.exp)}</td>
            <td>1 : {bestR}</td><td className="win">{f2(bestExp)}</td>
            <td className="l"><button className="iconbtn" onClick={()=>{setPairId(p.id);setPairOv(false);}}>open</button></td></tr>))}</tbody>
        </table></div>
      </div>
    ) : !activePair ? (
      <div className="panel"><h2>No pairs yet</h2><div className="note">Click "+ New pair" to start backtesting under {activeSys.name}.</div></div>
    ) : (
    <>
    <div className="panel"><h2>{editId?"Edit trade":"Add trade"} - {activePair.name}</h2>
      <div className="row">
        <div className="field"><label>Date</label><input type="date" value={form.date} onChange={e=>set("date",e.target.value)}/></div>
        <div className="field sm"><label>Dir</label><select value={form.dir} onChange={e=>set("dir",e.target.value)}><option>BUY</option><option>SELL</option></select></div>
        <div className="field sm"><label>SL (pips)</label><input type="number" value={form.sl} onChange={e=>set("sl",e.target.value)}/></div>
        <div className="field sm"><label>SL hit?</label><select value={form.slHit} onChange={e=>set("slHit",e.target.value)}><option>No</option><option>Yes</option></select></div>
        <div className="field sm"><label>Exit/TP2</label><input type="number" value={form.exit} disabled={form.slHit==="Yes"} onChange={e=>set("exit",e.target.value)}/></div>
        <div className="field sm"><label>MFE/TP3</label><input type="number" value={form.mfe} disabled={form.slHit==="Yes"} onChange={e=>set("mfe",e.target.value)}/></div>
        <div className="field"><label>Notes</label><input value={form.notes} onChange={e=>set("notes",e.target.value)}/></div>
        <button className="btn primary" onClick={submit}>{editId?"Update":"Add"}</button>
        {editId&&<button className="btn" onClick={()=>{setEditId(null);setForm(blank);}}>Cancel</button>}
      </div>
      <div className="row" style={{marginTop:10}}><button className="btn" onClick={renamePair}>Rename pair</button><button className="btn" onClick={exportCSV}>Export CSV</button><button className="btn danger" onClick={deletePair}>Delete pair</button></div>
      <div className="note">SL hit = Yes means both entries lose the full SL. Exit/TP2 = 0 means Entry 2 ended at breakeven. MFE/TP3 = furthest price ran.</div>
    </div>

    <div id="sec-import" className="panel"><h2 style={{display:"flex",alignItems:"center",gap:10}}>Bulk import trades (CSV) <button className="iconbtn" onClick={()=>toggle("import")}>{isOpen("import")?"hide":"show"}</button></h2>
      <div style={{display:isOpen("import")?"block":"none"}}>
        <div className="note" style={{marginTop:0}}>Paste one trade per line as: date,dir,sl,sl_hit,exit,mfe,notes - example: 2025-04-10,BUY,40,No,120,300,clean signal. A header row is fine (it is skipped). sl_hit uses Yes or No. Matches the Export CSV format so you can round-trip.</div>
        <textarea value={importText} onChange={e=>setImportText(e.target.value)} placeholder={"2025-04-10,BUY,40,No,120,300,clean trend\n2025-04-22,SELL,55,Yes,0,0,stopped out"} style={{width:"100%",minHeight:120,background:"#0b1424",border:"1px solid #283349",borderRadius:8,color:"#e6edf6",padding:10,fontFamily:"monospace",fontSize:13,boxSizing:"border-box"}}/>
        <div className="row" style={{marginTop:10}}>
          <label className="btn" style={{display:"inline-flex"}}>Choose CSV file<input type="file" accept=".csv,.txt" onChange={importFile} style={{display:"none"}}/></label>
          <button className="btn primary" onClick={runImport}>Add rows to {activePair.name}</button>
        </div>
      </div>
    </div>

    {activeSys.pairs.length>=2&&<div className="panel"><h2>Merge two pairs into one</h2>
      <div className="row">
        <div className="field"><label>Merge a pair into {activePair.name}</label>
          <select value={mergeSource} onChange={e=>setMergeSource(e.target.value)}>
            <option value="">Choose a pair to absorb...</option>
            {activeSys.pairs.filter(p=>p.id!==pairId).map(p=>(<option key={p.id} value={p.id}>{p.name} ({p.trades.length})</option>))}
          </select></div>
        <button className="btn primary" onClick={()=>mergePair(mergeSource)}>Merge into {activePair.name}</button>
      </div>
      <div className="note">Recorded the same instrument twice? Pick the duplicate pair to absorb - all its trades move into {activePair.name} and the duplicate is deleted.</div>
    </div>}

    <div className="panel"><h2>Move or copy {activePair.name} to another system</h2>
      {systems.length<2 ? <div className="note">Create a second system first (+ New system, top left), then you can move pairs between them.</div> : <>
        <div className="row">
          <div className="field"><label>Destination system</label>
            <select value={moveTarget} onChange={e=>setMoveTarget(e.target.value)}>
              <option value="">Choose a system...</option>
              {systems.filter(s=>s.id!==sysId).map(s=>(<option key={s.id} value={s.id}>{s.name}</option>))}
            </select></div>
          <button className="btn" onClick={()=>transferPair(moveTarget,"copy")}>Copy there (keep here too)</button>
          <button className="btn primary" onClick={()=>transferPair(moveTarget,"move")}>Move there (remove from here)</button>
        </div>
        <div className="note">Recorded this pair under the wrong system? Pick the right one and Move it - all its trades go with it.</div>
      </>}
    </div>

    <div className="panel"><h2>Results view</h2>
      <div className="row">
        <button className={"btn"+(scope==="pair"?" primary":"")} onClick={()=>setScope("pair")}>This pair ({activePair.name})</button>
        <button className={"btn"+(scope==="system"?" primary":"")} onClick={()=>setScope("system")}>All pairs combined ({activeSys.name})</button>
      </div>
      <div className="note">Dashboard, breakdown, histogram, Monte Carlo and optimizer below show {scope==="system"?"all pairs in this system, combined":"just this pair"}. Add Trade and the Trades table always target the open pair.</div>
    </div>

    <div id="sec-dashboard" className="panel"><h2>Dashboard - {scopeLabel}</h2>
      <div className="grid">{tiles(vstats).map(([k,v,c])=>(<div className="tile" key={k}><div className="k">{k}</div><div className={"v"+(typeof c==="number"?(c>=0?" green":" red"):"")}><CountUp text={v}/></div></div>))}</div>
      {(()=>{const e=buildEq(vstats.eq);return(<svg className="eq" viewBox="0 0 600 130" preserveAspectRatio="none"><line x1="0" y1={e.zero} x2="600" y2={e.zero} stroke="#283349" strokeWidth="1"/><path d={e.path} fill="none" stroke="#3b82f6" strokeWidth="2"/></svg>);})()}
      <div className="note">Equity curve - cumulative R in date order{scope==="system"?" across all pairs in this system":""}.</div>
    </div>

    {activity&&<div id="sec-activity" className="panel"><h2 style={{display:"flex",alignItems:"center",gap:10}}>Trade activity - {scopeLabel} <button className="iconbtn" onClick={()=>toggle("activity")}>{isOpen("activity")?"hide":"show"}</button></h2>
      <div style={{display:isOpen("activity")?"block":"none"}}>
        <div className="note" style={{marginTop:0,marginBottom:10}}>{scope==="system"?"All pairs in "+activeSys.name+", combined.":"For "+activePair.name+" only - switch Results view to All pairs combined to count every pair together."}</div>
        <div className="grid">{([["Dated trades",String(activity.total)],["Avg trades / week",activity.avgWk.toFixed(1)],["Avg trades / month",activity.avgMo.toFixed(1)],["Busiest month",activity.busiestMonth.count+" in "+activity.busiestMonth.k],["Busiest week",activity.busiestWeek.count+" (wk "+activity.busiestWeek.k+")"],["Active weeks",String(activity.weeks)],["Active months",String(activity.months)]] as [string,string][]).map(([k,v])=>(<div className="tile" key={k}><div className="k">{k}</div><div className="v" style={{fontSize:18}}>{v}</div></div>))}</div>
        <div style={{fontSize:11,textTransform:"uppercase",letterSpacing:".1em",color:"#93a1b8",margin:"14px 0 6px"}}>Trades per month</div>
        {countChart(monthly,true)}
        <div style={{fontSize:11,textTransform:"uppercase",letterSpacing:".1em",color:"#93a1b8",margin:"16px 0 6px"}}>Trades per week</div>
        {countChart(weekly,false)}
        <div className="note">How many trades the system produced each month and each week. With several pairs under one system, Whole system shows your true workload - the number of setups the whole basket gave you per week and per month.</div>
      </div>
    </div>}
    {monthly.length>0&&<div id="sec-time" className="panel"><h2 style={{display:"flex",alignItems:"center",gap:10}}>Performance over time - {scopeLabel} <button className="iconbtn" onClick={()=>toggle("perf")}>{isOpen("perf")?"hide":"show"}</button></h2>
      <div style={{display:isOpen("perf")?"block":"none"}}>
      <div className="note" style={{marginTop:0,marginBottom:8}}>{(()=>{const c=monthly.reduce((a,x)=>a+x.count,0);return c+" dated trades - "+monthly.length+" months, "+quarterly.length+" quarters, "+yearly.length+" years.";})()}</div>
      <div style={{fontSize:11,textTransform:"uppercase",letterSpacing:".1em",color:"#93a1b8",margin:"4px 0 6px"}}>Net R by month</div>
      {barChart(monthly)}
      <div style={{fontSize:11,textTransform:"uppercase",letterSpacing:".1em",color:"#93a1b8",margin:"16px 0 6px"}}>Net R by quarter</div>
      {barChart(quarterly)}
      <div style={{fontSize:11,textTransform:"uppercase",letterSpacing:".1em",color:"#93a1b8",margin:"16px 0 6px"}}>Quarterly table</div>
      <div className="scroll" style={{maxHeight:240}}><table className="tbl">
        <thead><tr><th className="l">Quarter</th><th>Trades</th><th>W</th><th>L</th><th>Win %</th><th>Net R</th><th>Net pips</th><th>Expectancy R</th><th>Worst streak</th></tr></thead>
        <tbody>{quarterly.map(periodRow)}</tbody>
      </table></div>
      <div style={{fontSize:11,textTransform:"uppercase",letterSpacing:".1em",color:"#93a1b8",margin:"16px 0 6px"}}>Monthly (with year totals)</div>
      <div className="scroll"><table className="tbl">
        <thead><tr><th className="l">Period</th><th>Trades</th><th>W</th><th>L</th><th>Win %</th><th>Net R</th><th>Net pips</th><th>Expectancy R</th><th>Worst streak</th></tr></thead>
        <tbody>{yearly.map(yr=>(<React.Fragment key={yr.k}>
          {monthly.filter(m=>m.k.slice(0,4)===yr.k).map(periodRow)}
          <tr style={{background:"#10223a",fontWeight:700}}>
            <td className="l">{yr.k} TOTAL</td><td>{yr.count}</td><td className="win">{yr.wins}</td><td className="loss">{yr.losses}</td><td>{pc(yr.winRate)}</td>
            <td className={yr.netR>=0?"win":"loss"}>{f2(yr.netR)}</td><td className={yr.netPips>=0?"win":"loss"}>{f1(yr.netPips)}</td><td className={yr.exp>=0?"win":"loss"}>{f2(yr.exp)}</td>
            <td className={yr.streak>=3?"loss":""}>{yr.streak}</td></tr>
        </React.Fragment>))}</tbody>
      </table></div>
      <div className="note">Bold rows are full-year totals. Worst streak = most losses in a row in that period.</div>
      </div>
    </div>}

    {vstats.total>0&&<div id="sec-season" className="panel"><h2 style={{display:"flex",alignItems:"center",gap:10}}>Seasonality - {scopeLabel} <button className="iconbtn" onClick={()=>toggle("season")}>{isOpen("season")?"hide":"show"}</button></h2>
      <div style={{display:isOpen("season")?"block":"none"}}>
      {(()=>{const wk=computeBuckets(vTrades,slMult,riskUSD,["Mon","Tue","Wed","Thu","Fri","Sat","Sun"],t=>(new Date(t.date+"T00:00:00").getDay()+6)%7);
        const mo=computeBuckets(vTrades,slMult,riskUSD,["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"],t=>(parseInt(t.date.slice(5,7),10)||1)-1);
        return(<>
          <div style={{fontSize:11,textTransform:"uppercase",letterSpacing:".1em",color:"#93a1b8",margin:"4px 0 6px"}}>Net R by day of week</div>
          {seasonChart(wk)}
          <div className="scroll"><table className="tbl"><thead><tr><th className="l">Day</th><th>Trades</th><th>Win %</th><th>Net R</th><th>Expectancy R</th></tr></thead>
            <tbody>{wk.map(r=>(<tr key={r.label}><td className="l">{r.label}</td><td>{r.count}</td><td>{pc(r.winRate)}</td><td className={r.netR>=0?"win":"loss"}>{f2(r.netR)}</td><td className={r.exp>=0?"win":"loss"}>{f2(r.exp)}</td></tr>))}</tbody></table></div>
          <div style={{fontSize:11,textTransform:"uppercase",letterSpacing:".1em",color:"#93a1b8",margin:"16px 0 6px"}}>Net R by month of year</div>
          {seasonChart(mo)}
          <div className="scroll"><table className="tbl"><thead><tr><th className="l">Month</th><th>Trades</th><th>Win %</th><th>Net R</th><th>Expectancy R</th></tr></thead>
            <tbody>{mo.map(r=>(<tr key={r.label}><td className="l">{r.label}</td><td>{r.count}</td><td>{pc(r.winRate)}</td><td className={r.netR>=0?"win":"loss"}>{f2(r.netR)}</td><td className={r.exp>=0?"win":"loss"}>{f2(r.exp)}</td></tr>))}</tbody></table></div>
        </>);})()}
      <div className="note">Which days and months your system tends to make or lose money. Thin buckets with few trades are noisy - trust the ones with real sample size. Handy for spotting seasonal dead zones to sit out.</div>
      </div>
    </div>}

    {vstats.total>0&&<div id="sec-rmult" className="panel"><h2 style={{display:"flex",alignItems:"center",gap:10}}>R-multiple distribution - {scopeLabel} <button className="iconbtn" onClick={()=>toggle("hist")}>{isOpen("hist")?"hide":"show"}</button></h2>
      <div style={{display:isOpen("hist")?"block":"none"}}>
      {(()=>{const w=600,h=170,p=18,bw=vhist.bins.length?(w-2*p)/vhist.bins.length:0;return(
        <svg className="eq" viewBox={"0 0 "+w+" "+h} preserveAspectRatio="none" style={{height:170}}>
          {vhist.bins.map((b,i)=>{const bh=(b.count/vhist.maxCount)*(h-2*p-14);const x=p+i*bw;const neg=b.hi<=0.0001;return(
            <g key={i}><rect x={x+1} y={h-p-bh} width={Math.max(1,bw-2)} height={bh} fill={neg?"#ef4444":"#22c55e"} rx="1"/>
            <text x={x+bw/2} y={h-p-bh-3} fill="#93a1b8" fontSize="9" textAnchor="middle">{b.count||""}</text>
            {(i%2===0||vhist.bins.length<=12)&&<text x={x+bw/2} y={h-5} fill="#6b7a90" fontSize="8" textAnchor="middle">{f2(b.lo)}</text>}</g>);})}
        </svg>);})()}
      <div className="note">Each bar = how many trades landed in that R band (combined per-trade R). Losses cluster at -1R; the right tail is your big winners. A healthy edge has more mass and a longer tail on the green side. Bins are 0.5R wide.</div>
      </div>
    </div>}

    {vstats.total>0&&<div id="sec-montecarlo" className="panel"><h2 style={{display:"flex",alignItems:"center",gap:10}}>Monte Carlo simulation - {scopeLabel} <button className="iconbtn" onClick={()=>toggle("mc")}>{isOpen("mc")?"hide":"show"}</button></h2>
      <div style={{display:isOpen("mc")?"block":"none"}}>
      <div className="row" style={{marginBottom:10}}><button className="btn primary" onClick={()=>setMc(computeMC(vstats.Rs,1000))}>Run 1000 shuffles</button>{mc&&<button className="btn" onClick={()=>setMc(null)}>Clear</button>}<span className="note" style={{margin:0}}>Reshuffles the order of your {vstats.total} trades 1000 times to show the range of outcomes luck alone could produce.</span></div>
      {mc&&<>
        <div className="grid">{([["Runs",String(mc.runs)],["Median end R",f2(pct(mc.finals,.5)),pct(mc.finals,.5)],["5th pct end R",f2(pct(mc.finals,.05)),pct(mc.finals,.05)],["95th pct end R",f2(pct(mc.finals,.95)),pct(mc.finals,.95)],["Worst end R",f2(mc.finals[0]),mc.finals[0]],["Best end R",f2(mc.finals[mc.finals.length-1]),mc.finals[mc.finals.length-1]],["% runs profitable",pc(mc.pPos),mc.pPos-0.5],["Median max DD",f2(pct(mc.dds,.5)),pct(mc.dds,.5)],["Worst max DD",f2(mc.dds[0]),mc.dds[0]]] as [string,string,number?][]).map(([k,v,c])=>(<div className="tile" key={k}><div className="k">{k}</div><div className={"v"+(typeof c==="number"?(c>=0?" green":" red"):"")}><CountUp text={v}/></div></div>))}</div>
        {(()=>{const ps=mc.paths;if(!ps.length)return null;const w=600,h=160,p=8,n=ps[0].length;let mn=0,mx=0;ps.forEach(pa=>pa.forEach(v=>{mn=Math.min(mn,v);mx=Math.max(mx,v);}));const rng=(mx-mn)||1;const X=(i:number)=>n<2?w/2:p+(i/(n-1))*(w-2*p);const Y=(v:number)=>h-p-((v-mn)/rng)*(h-2*p);
          return(<svg className="eq" viewBox={"0 0 "+w+" "+h} preserveAspectRatio="none" style={{height:160}}><line x1="0" y1={Y(0)} x2={w} y2={Y(0)} stroke="#283349" strokeWidth="1"/>
            {ps.map((pa,k)=>(<path key={k} d={pa.map((v,i)=>(i?"L":"M")+X(i).toFixed(1)+" "+Y(v).toFixed(1)).join(" ")} fill="none" stroke="#3b82f6" strokeWidth="1" opacity="0.18"/>))}</svg>);})()}
        <div className="note">Each faint line is one possible ordering of your trades. The spread shows how different your equity curve could have looked from luck alone. If most runs end well above zero and the worst drawdown is survivable for your account, the edge is robust - not just one lucky sequence.</div>
      </>}
      </div>
    </div>}

    {vopt&&<div id="sec-optimizer" className="panel"><h2 style={{display:"flex",alignItems:"center",gap:10}}>TP2 Reward-to-Risk Optimizer - {scopeLabel} <button className="iconbtn" onClick={()=>toggle("opt")}>{isOpen("opt")?"hide":"show"}</button></h2>
      <div style={{display:isOpen("opt")?"block":"none"}}>
      {vstats.total>0&&(()=>{const b=vopt.list.reduce((a,o)=>(o.exp>a.exp?o:a),vopt.list[0]);if(!b)return null;return(
        <div style={{background:"#0e2a1a",border:"1px solid #1f6f43",borderRadius:12,padding:"14px 16px",marginBottom:14}}>
          <div style={{fontSize:12,letterSpacing:".08em",textTransform:"uppercase",color:"#86efac"}}>Recommended TP2 for {scopeLabel}</div>
          <div style={{fontSize:26,fontWeight:800,marginTop:4}}>1 : {b.R} <span style={{color:"#86efac"}}>reward-to-risk</span></div>
          <div style={{color:"#cbd5e1",marginTop:6,fontSize:13}}>Take profit at {b.R}x your stop. Reached on {pc(b.hitPct)} of winners. Entry 2 adds {f2(b.e2exp)}R per trade, lifting expectancy to {f2(b.exp)}R per trade.</div>
        </div>);})()}
      <div className="scroll"><table className="tbl opt">
        <thead><tr><th className="l">TP2 target</th><th>Reach (of winners)</th><th>Entry-2 R/trade</th><th>Combined R</th><th>Expectancy R</th><th>Net pips</th></tr></thead>
        <tbody>
          <tr className="cur"><td className="l">CURRENT (breakeven)</td><td>-</td><td>-</td><td>{f2(vstats.netR)}</td><td>{f2(vstats.exp)}</td><td>{f1(vstats.netPips)}</td></tr>
          {vopt.list.map(o=>(<tr key={o.R} className={(o.exp===vopt.bestExp&&o.exp>0)?"best":""}><td className="l">1 : {o.R}</td><td>{pc(o.hitPct)}</td><td>{f2(o.e2exp)}</td><td>{f2(o.combR)}</td><td>{f2(o.exp)}</td><td>{f1(o.netpips)}</td></tr>))}
        </tbody></table></div>
      <div className="note">1 : R means the TP2 target is R times your stop. Highlighted row = best expectancy = recommended TP2.</div>
      </div>
    </div>}

    {activePair&&issues.length>0&&<div className="panel alert"><h2 style={{display:"flex",alignItems:"center",gap:10}}>Data check - {issues.length} to review <button className="iconbtn" onClick={()=>toggle("issues")}>{isOpen("issues")?"hide":"show"}</button></h2>
      <div style={{display:isOpen("issues")?"block":"none"}}>
        <div className="note" style={{marginTop:0}}>These rows look inconsistent and may quietly skew your stats. Fix each one so the numbers stay honest.</div>
        <div className="scroll"><table className="tbl"><thead><tr><th className="l">#</th><th className="l">Date</th><th>Dir</th><th className="l">What to check</th><th className="l"></th></tr></thead>
          <tbody>{issues.map((x,k)=>(<tr key={k}><td className="l">{x.i+1}</td><td className="l">{x.t.date||"(none)"}</td><td><span className={"pill "+(x.t.dir==="BUY"?"buy":"sell")}>{x.t.dir}</span></td><td className="l">{x.msg}</td><td className="l"><button className="iconbtn" onClick={()=>edit(x.t)}>fix</button></td></tr>))}</tbody>
        </table></div>
      </div>
    </div>}
    <div id="sec-trades" className="panel"><h2 style={{display:"flex",alignItems:"center",gap:10}}>Trades - {activePair.name} ({activePair.trades.length}) <button className="iconbtn" onClick={()=>toggle("trades")}>{isOpen("trades")?"hide":"show"}</button></h2>
      <div style={{display:isOpen("trades")?"block":"none"}}>
      <div className="row" style={{marginBottom:10}}>
        <div className="field sm"><label>Direction</label><select value={tDir} onChange={e=>setTDir(e.target.value)}><option value="all">All</option><option value="BUY">BUY</option><option value="SELL">SELL</option></select></div>
        <div className="field sm"><label>Result</label><select value={tRes} onChange={e=>setTRes(e.target.value)}><option value="all">All</option><option value="win">Wins</option><option value="loss">SL losses</option></select></div>
        <div className="field sm"><label>Year</label><select value={tYear} onChange={e=>setTYear(e.target.value)}><option value="all">All</option>{pairYears.map(y=>(<option key={y} value={y}>{y}</option>))}</select></div>
        <div className="spacer"></div>
        <span className="note" style={{margin:0}}>Showing {viewTrades.length} of {activePair.trades.length}. Tap a column to sort.{tSortKey?" ":""}{tSortKey&&<button className="iconbtn" onClick={()=>{setTSortKey("");setTSortDir(1);}}>clear sort</button>}</span>
      </div>
      <div className="scroll"><table className="tbl">
        <thead><tr><th className="l">#</th>{sortTh("date","Date")}<th>Dir</th>{sortTh("sl","SL")}<th>TP1</th><th>SL hit</th><th>Exit</th><th>MFE</th><th>E1</th><th>E2</th>{sortTh("net","Net")}{sortTh("r","R")}{sortTh("usd","$")}<th className="l"></th></tr></thead>
        <tbody>{viewTrades.map(({t,i,d})=>(<tr key={t.id}>
          <td className="l">{i+1}</td><td className="l">{t.date}</td>
          <td><span className={"pill "+(t.dir==="BUY"?"buy":"sell")}>{t.dir}</span></td>
          <td>{f1(t.sl)}</td><td>{f1(d.tp1)}</td><td>{t.slHit?"Yes":"No"}</td>
          <td>{t.slHit?"-":f1(t.exit)}</td><td>{t.slHit?"-":f1(t.mfe)}</td>
          <td className={d.e1>=0?"win":"loss"}>{f1(d.e1)}</td><td className={d.e2>=0?"win":"loss"}>{f1(d.e2)}</td>
          <td className={d.net>=0?"win":"loss"}>{f1(d.net)}</td><td className={d.r>=0?"win":"loss"}>{f2(d.r)}</td>
          <td className={d.usd>=0?"win":"loss"}>{Math.round(d.usd).toLocaleString()}</td>
          <td className="l"><button className="iconbtn" onClick={()=>edit(t)}>edit</button><button className="iconbtn" onClick={()=>del(t.id)}>del</button></td></tr>))}</tbody>
      </table></div>
      </div>
    </div>
    </>
    )}
    </>
    )}
  </div>);
}