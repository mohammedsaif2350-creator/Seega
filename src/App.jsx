import { useState, useEffect, useRef, Component } from "react";

const BOARD_SIZE = 5;
const EMPTY = null;
const WHITE = "white";
const BLACK = "black";
const PIECES_PER_PLAYER = 12;
const other = p => p === WHITE ? BLACK : WHITE;
const SAFE_ZONES = new Set(["0,0","0,4","4,0","4,4","2,2"]);
const isSafe = (r,c) => SAFE_ZONES.has(`${r},${c}`);

// ── ألوان الحجارة الأربعة ──────────────────────────────────
const PIECE_THEMES = {
  classic: {
    name:"كلاسيك", icon:"⚪⚫",
    white:{
      bg:"radial-gradient(circle at 32% 28%,#FFFFF0 0%,#F5EDD0 35%,#E8D9A8 65%,#C8A96E 100%)",
      border:"#B89850", shine:"rgba(255,255,255,0.7)", selBorder:"#D4A843",
    },
    black:{
      bg:"radial-gradient(circle at 32% 28%,#5a5a5a 0%,#2d2d2d 35%,#1a1a1a 65%,#0d0d0d 100%)",
      border:"#404040", shine:"rgba(255,255,255,0.15)", selBorder:"#D4A843",
    },
  },
  royal: {
    name:"ملكي", icon:"🔵🔴",
    white:{
      bg:"radial-gradient(circle at 32% 28%,#ddeeff 0%,#88aadd 40%,#3366bb 100%)",
      border:"#2255aa", shine:"rgba(255,255,255,0.6)", selBorder:"#88ccff",
    },
    black:{
      bg:"radial-gradient(circle at 32% 28%,#ffdddd 0%,#dd8888 40%,#bb3333 100%)",
      border:"#991111", shine:"rgba(255,255,255,0.5)", selBorder:"#ff8888",
    },
  },
  nature: {
    name:"طبيعي", icon:"🟢🟤",
    white:{
      bg:"radial-gradient(circle at 32% 28%,#eeffdd 0%,#99cc66 40%,#447722 100%)",
      border:"#336611", shine:"rgba(255,255,255,0.5)", selBorder:"#88ee44",
    },
    black:{
      bg:"radial-gradient(circle at 32% 28%,#ffe8cc 0%,#cc8844 40%,#774422 100%)",
      border:"#552211", shine:"rgba(255,255,255,0.4)", selBorder:"#ffaa55",
    },
  },
  pearl: {
    name:"لؤلؤي", icon:"🟣⬛",
    white:{
      bg:"radial-gradient(circle at 32% 28%,#ffffff 0%,#eeddff 40%,#aa88cc 100%)",
      border:"#9966bb", shine:"rgba(255,255,255,0.8)", selBorder:"#cc99ff",
    },
    black:{
      bg:"radial-gradient(circle at 32% 28%,#334455 0%,#112233 40%,#001122 100%)",
      border:"#002244", shine:"rgba(255,255,255,0.2)", selBorder:"#4488cc",
    },
  },
};

// ── GAME LOGIC ─────────────────────────────────────────────
function emptyBoard() { return Array(BOARD_SIZE).fill(null).map(()=>Array(BOARD_SIZE).fill(EMPTY)); }
function getValidMoves(board,r,c){const m=[];for(const[dr,dc]of[[-1,0],[1,0],[0,-1],[0,1]]){const nr=r+dr,nc=c+dc;if(nr>=0&&nr<BOARD_SIZE&&nc>=0&&nc<BOARD_SIZE&&board[nr][nc]===EMPTY)m.push([nr,nc]);}return m;}
function getCaptures(board,fr,fc,tr,tc){if(!board[fr][fc])return[];const piece=board[fr][fc],opp=other(piece),sim=board.map(r=>[...r]);sim[tr][tc]=piece;sim[fr][fc]=EMPTY;const caps=[];for(const[dr,dc]of[[-1,0],[1,0],[0,-1],[0,1]]){const ar=tr+dr,ac=tc+dc,br=tr+2*dr,bc=tc+2*dc;if(ar>=0&&ar<BOARD_SIZE&&ac>=0&&ac<BOARD_SIZE&&br>=0&&br<BOARD_SIZE&&bc>=0&&bc<BOARD_SIZE&&sim[ar][ac]===opp&&sim[br][bc]===piece&&!isSafe(ar,ac))caps.push([ar,ac]);}return caps;}
function getCaptureMoves(board,r,c){const m=[];for(const[dr,dc]of[[-1,0],[1,0],[0,-1],[0,1]]){const nr=r+dr,nc=c+dc;if(nr>=0&&nr<BOARD_SIZE&&nc>=0&&nc<BOARD_SIZE&&board[nr][nc]===EMPTY&&getCaptures(board,r,c,nr,nc).length>0)m.push([nr,nc]);}return m;}
function isBlocked(board,player){for(let r=0;r<BOARD_SIZE;r++)for(let c=0;c<BOARD_SIZE;c++)if(board[r][c]===player&&getValidMoves(board,r,c).length>0)return false;return true;}
function countPieces(board,player){let n=0;for(let r=0;r<BOARD_SIZE;r++)for(let c=0;c<BOARD_SIZE;c++)if(board[r][c]===player)n++;return n;}
function checkWin(board,lastPlayer){const opp=other(lastPlayer),oppCount=countPieces(board,opp),myCount=countPieces(board,lastPlayer);if(oppCount<=1)return lastPlayer;if(oppCount<=2&&myCount>=6)return lastPlayer;return null;}

// ── AI LEVELS ──────────────────────────────────────────────
function evaluateBoard(board,player){const opp=other(player);let s=(countPieces(board,player)-countPieces(board,opp))*10;for(const k of SAFE_ZONES){const[r,c]=k.split(',').map(Number);if(board[r][c]===player)s+=4;else if(board[r][c]===opp)s-=4;}for(let r=0;r<BOARD_SIZE;r++)for(let c=0;c<BOARD_SIZE;c++)if(board[r][c]===player)s+=(2-Math.max(Math.abs(r-2),Math.abs(c-2)))*0.5;return s;}

function aiBestMove(board,player,level="medium"){
  const opp=other(player);
  // مبتدئ: عشوائي تماماً
  if(level==="easy"){
    const moves=[];
    for(let r=0;r<BOARD_SIZE;r++)for(let c=0;c<BOARD_SIZE;c++)
      if(board[r][c]===player)for(const[tr,tc]of getValidMoves(board,r,c))moves.push({fr:r,fc:c,tr,tc});
    return moves.length?moves[Math.floor(Math.random()*moves.length)]:null;
  }
  // متوسط: يفضل الأكل + تجنب الخسارة
  if(level==="medium"){
    let best=-Infinity,bestMove=null;
    for(let r=0;r<BOARD_SIZE;r++)for(let c=0;c<BOARD_SIZE;c++){
      if(board[r][c]!==player)continue;
      for(const[tr,tc]of getValidMoves(board,r,c)){
        const sim=board.map(r=>[...r]);
        const caps=getCaptures(board,r,c,tr,tc);
        sim[tr][tc]=player;sim[r][c]=EMPTY;
        for(const[cr,cc]of caps)sim[cr][cc]=EMPTY;
        let s=caps.length*15+evaluateBoard(sim,player)*0.5;
        if(isBlocked(sim,player))s-=20;
        if(isSafe(tr,tc))s+=4;
        s+=Math.random()*2;
        if(s>best){best=s;bestMove={fr:r,fc:c,tr,tc};}
      }
    }
    return bestMove;
  }
  // احترافي: minimax depth 2 + تقييم شامل
  function minimax(board,depth,maximizing,alpha,beta){
    const p=maximizing?player:opp;
    const w=checkWin(board,other(p));
    if(w) return maximizing?-1000:1000;
    if(depth===0) return evaluateBoard(board,player);
    let val=maximizing?-Infinity:Infinity;
    outer:
    for(let r=0;r<BOARD_SIZE;r++) for(let c=0;c<BOARD_SIZE;c++){
      if(board[r][c]!==p)continue;
      for(const[tr,tc]of getValidMoves(board,r,c)){
        const sim=board.map(r=>[...r]);
        const caps=getCaptures(board,r,c,tr,tc);
        sim[tr][tc]=p;sim[r][c]=EMPTY;
        for(const[cr,cc]of caps)sim[cr][cc]=EMPTY;
        const child=minimax(sim,depth-1,!maximizing,alpha,beta);
        if(maximizing){val=Math.max(val,child);alpha=Math.max(alpha,val);}
        else{val=Math.min(val,child);beta=Math.min(beta,val);}
        if(beta<=alpha) break outer;
      }
    }
    return val===Infinity||val===-Infinity?evaluateBoard(board,player):val;
  }
  let best=-Infinity,bestMove=null;
  for(let r=0;r<BOARD_SIZE;r++)for(let c=0;c<BOARD_SIZE;c++){
    if(board[r][c]!==player)continue;
    for(const[tr,tc]of getValidMoves(board,r,c)){
      const sim=board.map(r=>[...r]);
      const caps=getCaptures(board,r,c,tr,tc);
      sim[tr][tc]=player;sim[r][c]=EMPTY;
      for(const[cr,cc]of caps)sim[cr][cc]=EMPTY;
      let s=minimax(sim,2,false,-Infinity,Infinity);
      s+=caps.length*12+getCaptureMoves(sim,tr,tc).length*6;
      if(isSafe(tr,tc))s+=8;
      if(isBlocked(sim,player))s-=50;
      s+=Math.random()*0.3;
      if(s>best){best=s;bestMove={fr:r,fc:c,tr,tc};}
    }
  }
  return bestMove;
}

// ── نظام النقاط ────────────────────────────────────────────
function calcPoints(reason,capturedCount,combo,level){
  let pts=0;
  if(reason==="win") pts=level==="easy"?50:level==="medium"?100:200;
  else if(reason==="capture") pts=(level==="easy"?5:level==="medium"?10:15)*capturedCount;
  else if(reason==="combo") pts=combo*5;
  return pts;
}

// ── SOUND ──────────────────────────────────────────────────
function playSound(type){
  try{
    const ctx=new(window.AudioContext||window.webkitAudioContext)();
    if(type==="move"){const o=ctx.createOscillator(),g=ctx.createGain();o.connect(g);g.connect(ctx.destination);o.frequency.value=600;o.type="sine";g.gain.setValueAtTime(0.18,ctx.currentTime);g.gain.exponentialRampToValueAtTime(0.001,ctx.currentTime+0.1);o.start();o.stop(ctx.currentTime+0.1);}
    else if(type==="capture"){[320,180].forEach((f,i)=>{const o=ctx.createOscillator(),g=ctx.createGain();o.connect(g);g.connect(ctx.destination);o.frequency.value=f;o.type="triangle";g.gain.setValueAtTime(0.3,ctx.currentTime+i*0.08);g.gain.exponentialRampToValueAtTime(0.001,ctx.currentTime+i*0.08+0.18);o.start(ctx.currentTime+i*0.08);o.stop(ctx.currentTime+i*0.08+0.18);});}
    else if(type==="safe"){const o=ctx.createOscillator(),g=ctx.createGain();o.connect(g);g.connect(ctx.destination);o.frequency.value=880;o.type="sine";g.gain.setValueAtTime(0.12,ctx.currentTime);g.gain.exponentialRampToValueAtTime(0.001,ctx.currentTime+0.2);o.start();o.stop(ctx.currentTime+0.2);}
    else if(type==="win"){
      // صوت احتفال كامل
      const notes=[523,659,784,880,1047,880,784,1047];
      notes.forEach((f,i)=>{const o=ctx.createOscillator(),g=ctx.createGain();o.connect(g);g.connect(ctx.destination);o.frequency.value=f;o.type="sine";g.gain.setValueAtTime(0.28,ctx.currentTime+i*0.1);g.gain.exponentialRampToValueAtTime(0.001,ctx.currentTime+i*0.1+0.18);o.start(ctx.currentTime+i*0.1);o.stop(ctx.currentTime+i*0.1+0.18);});
      // طبلة احتفال
      setTimeout(()=>{try{const ctx2=new(window.AudioContext||window.webkitAudioContext)();[0,0.2,0.4,0.6].forEach(t=>{const o=ctx2.createOscillator(),g=ctx2.createGain();o.connect(g);g.connect(ctx2.destination);o.frequency.value=120;o.type="triangle";g.gain.setValueAtTime(0.4,ctx2.currentTime+t);g.gain.exponentialRampToValueAtTime(0.001,ctx2.currentTime+t+0.15);o.start(ctx2.currentTime+t);o.stop(ctx2.currentTime+t+0.15);});}catch(e){}},300);
    }
  }catch(e){}
}

// ── CONFETTI ───────────────────────────────────────────────
const Confetti=()=>{
  const items=Array(60).fill(null).map((_,i)=>({id:i,x:Math.random()*100,delay:Math.random()*2.5,dur:2.5+Math.random()*2,color:["#d4a843","#f5d78a","#C8A96E","#fff8e7","#ff6b6b","#4ecdc4"][Math.floor(Math.random()*6)],size:5+Math.random()*10}));
  return(<div style={{position:"fixed",inset:0,pointerEvents:"none",overflow:"hidden",zIndex:200}}>{items.map(p=>(<div key={p.id} style={{position:"absolute",left:`${p.x}%`,top:"-20px",width:p.size,height:p.size,background:p.color,borderRadius:Math.random()>.5?"50%":"2px",animation:`confettiFall ${p.dur}s ${p.delay}s ease-in infinite`}}/>))}</div>);
};

// ── ERROR BOUNDARY ─────────────────────────────────────────
class ErrorBoundary extends Component{constructor(props){super(props);this.state={err:false};}static getDerivedStateFromError(){return{err:true};}render(){if(this.state.err)return(<div style={{padding:32,textAlign:"center",color:"#ff9080",fontFamily:"'Cairo',sans-serif"}}><div style={{fontSize:"2rem"}}>⚠️</div><div>حدث خطأ</div><button onClick={()=>this.setState({err:false})} style={{marginTop:12,padding:"6px 16px",borderRadius:20,background:"rgba(212,168,67,0.2)",border:"1px solid rgba(212,168,67,0.4)",color:"#C8A96E",cursor:"pointer",fontFamily:"'Cairo',sans-serif"}}>🔄 إعادة</button></div>);return this.props.children;}}

// ── PIECE ──────────────────────────────────────────────────
const Piece=({color,sel,dropping,size=46,theme="classic"})=>{
  const t=PIECE_THEMES[theme]||PIECE_THEMES.classic;
  const s=color===WHITE?t.white:t.black;
  return(<div className={dropping?"piece-drop":""} style={{width:size,height:size,borderRadius:"50%",flexShrink:0,position:"relative",overflow:"hidden",background:s.bg,border:sel?`3px solid ${s.selBorder}`:`1.5px solid ${s.border}`,boxShadow:sel?`0 0 0 3px rgba(212,168,67,0.25),0 6px 16px rgba(0,0,0,0.6)`:`0 4px 12px rgba(0,0,0,0.55),inset 0 1px 4px rgba(255,255,255,0.2)`,transition:"box-shadow .2s"}}><div style={{position:"absolute",top:"10%",left:"15%",width:"35%",height:"25%",borderRadius:"50%",background:s.shine,filter:"blur(2px)"}}/></div>);
};

// ── RULES MODAL ────────────────────────────────────────────
const RulesModal=({onClose})=>{
  const rules=[
    {icon:"♟",title:"اللوحة",desc:"لوحة 5×5 = 25 مربع. كل لاعب عنده 12 حجر.",visual:(
      <div style={{display:"grid",gridTemplateColumns:"repeat(5,28px)",gap:2,margin:"8px auto"}}>
        {Array(25).fill(null).map((_,i)=>{const r=Math.floor(i/5),c=i%5,safe=isSafe(r,c);return(<div key={i} style={{width:28,height:28,borderRadius:3,background:safe?"rgba(212,168,67,0.25)":(r+c)%2===0?"rgba(255,255,255,0.05)":"rgba(0,0,0,0.2)",border:`1px solid ${safe?"rgba(212,168,67,0.5)":"rgba(212,168,67,0.1)"}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:"0.55rem",color:"rgba(212,168,67,0.7)"}}>{safe?"🛡":""}  </div>);})}</div>
    )},
    {icon:"✌️",title:"التوزيع",desc:"كل دور يوزع اللاعب حجرين. اللي وزع أول لا يبدأ الحركة. المربع الأوسط لا يُوضع فيه حجر وقت التوزيع.",visual:(
      <div style={{display:"flex",gap:8,justifyContent:"center",margin:"6px 0"}}>
        <div style={{display:"flex",gap:4,alignItems:"center"}}>{[0,1].map(i=><div key={i} style={{width:20,height:20,borderRadius:"50%",background:"radial-gradient(circle at 32% 28%,#FFFFF0,#C8A96E)",border:"1px solid #B89850"}}/>)}<span style={{color:"#6a4820",fontSize:"0.7rem"}}>+</span>{[0,1].map(i=><div key={i} style={{width:20,height:20,borderRadius:"50%",background:"radial-gradient(circle at 32% 28%,#5a5a5a,#000)",border:"1px solid #444"}}/>)}</div>
      </div>
    )},
    {icon:"↕️",title:"الحركة",desc:"الحجر يتحرك أفقياً أو عمودياً فقط لمربع مجاور فاضي. لا يُسمح بالحركة قطرياً.",visual:(
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,28px)",gap:2,margin:"6px auto",width:"fit-content"}}>
        {[["","↑",""],["←","♟","→"],["","↓",""]].flat().map((s,i)=><div key={i} style={{width:28,height:28,borderRadius:3,background:s==="♟"?"rgba(212,168,67,0.15)":["↑","↓","←","→"].includes(s)?"rgba(100,200,100,0.15)":"rgba(0,0,0,0.2)",border:`1px solid ${s==="♟"?"rgba(212,168,67,0.4)":["↑","↓","←","→"].includes(s)?"rgba(100,200,100,0.4)":"rgba(212,168,67,0.05)"}`,display:"flex",alignItems:"center",justifyContent:"center",color:s==="♟"?"#C8A96E":"#6a9060",fontSize:"0.8rem"}}>{s}</div>)}
      </div>
    )},
    {icon:"🍽️",title:"الأكل (اختياري)",desc:"إذا حجرك كان بين حجرين من حجارك يُأكل. الأكل اختياري — يمكنك تجاوزه لبناء فخ. الحجر في منطقة أمان لا يُأكل.",visual:(
      <div style={{display:"flex",gap:4,alignItems:"center",justifyContent:"center",margin:"6px 0"}}>
        <div style={{width:22,height:22,borderRadius:"50%",background:"radial-gradient(circle at 32% 28%,#FFFFF0,#C8A96E)",border:"1px solid #B89850"}}/>
        <div style={{width:22,height:22,borderRadius:"50%",background:"radial-gradient(circle at 32% 28%,#5a5a5a,#000)",border:"2px solid #f44",boxShadow:"0 0 8px #f44"}}/>
        <div style={{width:22,height:22,borderRadius:"50%",background:"radial-gradient(circle at 32% 28%,#FFFFF0,#C8A96E)",border:"1px solid #B89850"}}/>
        <span style={{color:"#6a4820",fontSize:"0.7rem",marginRight:4}}>← يُأكل</span>
      </div>
    )},
    {icon:"🛡️",title:"مناطق الأمان",desc:"4 زوايا + المنتصف = 5 مناطق أمان. الحجر داخلها محمي من الأكل تماماً.",visual:(
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,28px)",gap:4,margin:"6px auto",width:"fit-content"}}>
        {[["🛡","","🛡"],["","🛡",""],["🛡","","🛡"]].flat().map((s,i)=><div key={i} style={{width:28,height:28,borderRadius:3,background:s?"rgba(212,168,67,0.2)":"rgba(0,0,0,0.15)",border:`1px solid ${s?"rgba(212,168,67,0.5)":"rgba(212,168,67,0.08)"}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:"0.75rem"}}>{s}</div>)}
      </div>
    )},
    {icon:"🚪",title:"السكة",desc:"إذا حوصرت جميع حجارك اضغط 'طلب سكة'. الخصم يحرك حجراً من حجاره له مجال حركة ليفتح الطريق لك.",visual:null},
    {icon:"🏆",title:"شروط الفوز",desc:"تفوز إذا: بقي للخصم حجر واحد فقط، أو بقي له حجران وأنت عندك 6+ أحجار.",visual:(
      <div style={{display:"flex",gap:12,justifyContent:"center",margin:"6px 0"}}>
        <div style={{textAlign:"center"}}><div style={{color:"#C8A96E",fontSize:"0.65rem",marginBottom:4}}>شرط 1</div><div style={{display:"flex",gap:3,justifyContent:"center"}}><div style={{width:16,height:16,borderRadius:"50%",background:"radial-gradient(circle,#5a5a5a,#000)",border:"1px solid #444",opacity:0.3}}/></div><div style={{color:"#6a4820",fontSize:"0.6rem",marginTop:2}}>حجر واحد</div></div>
        <div style={{color:"#3a2810",fontSize:"1rem"}}>|</div>
        <div style={{textAlign:"center"}}><div style={{color:"#C8A96E",fontSize:"0.65rem",marginBottom:4}}>شرط 2</div><div style={{display:"flex",gap:2,justifyContent:"center"}}>{[0,1].map(i=><div key={i} style={{width:14,height:14,borderRadius:"50%",background:"radial-gradient(circle,#5a5a5a,#000)",border:"1px solid #444",opacity:0.4}}/>)}</div><div style={{color:"#6a4820",fontSize:"0.6rem",marginTop:2}}>2 مقابل 6+</div></div>
      </div>
    )},
    {icon:"🔁",title:"التكرار",desc:"إذا كرر اللاعب نفس الحركة بنفس الحجر أكثر من 6 مرات يفوز صاحب أكبر عدد من الأحجار.",visual:null},
  ];
  const [page,setPage]=useState(0);
  const rule=rules[page];
  return(
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.85)",zIndex:300,display:"flex",alignItems:"center",justifyContent:"center",padding:16}} onClick={onClose}>
      <div style={{background:"linear-gradient(145deg,#1A1007,#120B04)",border:"1.5px solid rgba(212,168,67,0.3)",borderRadius:18,padding:"24px 20px",maxWidth:340,width:"100%",direction:"rtl"}} onClick={e=>e.stopPropagation()}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
          <h2 style={{color:"#C8A96E",fontFamily:"'Amiri',serif",fontSize:"1.1rem",margin:0}}>📖 قوانين السيجة</h2>
          <button onClick={onClose} style={{background:"none",border:"none",color:"#5a4020",fontSize:"1.2rem",cursor:"pointer"}}>✕</button>
        </div>

        {/* Rule card */}
        <div style={{background:"rgba(0,0,0,0.3)",borderRadius:12,padding:"16px 14px",minHeight:200,border:"1px solid rgba(212,168,67,0.1)"}}>
          <div style={{fontSize:"2rem",textAlign:"center",marginBottom:8}}>{rule.icon}</div>
          <h3 style={{color:"#C8A96E",fontFamily:"'Cairo',sans-serif",fontSize:"0.9rem",margin:"0 0 8px",textAlign:"center"}}>{rule.title}</h3>
          {rule.visual&&rule.visual}
          <p style={{color:"#7a5a28",fontFamily:"'Cairo',sans-serif",fontSize:"0.75rem",lineHeight:1.7,margin:0,textAlign:"center"}}>{rule.desc}</p>
        </div>

        {/* Navigation */}
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginTop:14}}>
          <button onClick={()=>setPage(p=>Math.max(0,p-1))} disabled={page===0} style={{padding:"5px 12px",borderRadius:20,background:"rgba(212,168,67,0.1)",border:"1px solid rgba(212,168,67,0.2)",color:page===0?"#2a1808":"#C8A96E",fontFamily:"'Cairo',sans-serif",fontSize:"0.72rem",cursor:page===0?"not-allowed":"pointer"}}>← السابق</button>
          <div style={{display:"flex",gap:5}}>
            {rules.map((_,i)=><div key={i} onClick={()=>setPage(i)} style={{width:i===page?16:6,height:6,borderRadius:3,background:i===page?"#C8A96E":"rgba(212,168,67,0.2)",cursor:"pointer",transition:"all .2s"}}/>)}
          </div>
          <button onClick={()=>setPage(p=>Math.min(rules.length-1,p+1))} disabled={page===rules.length-1} style={{padding:"5px 12px",borderRadius:20,background:"rgba(212,168,67,0.1)",border:"1px solid rgba(212,168,67,0.2)",color:page===rules.length-1?"#2a1808":"#C8A96E",fontFamily:"'Cairo',sans-serif",fontSize:"0.72rem",cursor:page===rules.length-1?"not-allowed":"pointer"}}>التالي ←</button>
        </div>
        <div style={{textAlign:"center",marginTop:8,color:"#3a2810",fontFamily:"'Cairo',sans-serif",fontSize:"0.62rem"}}>{page+1} / {rules.length}</div>
      </div>
    </div>
  );
};


// ── TUTORIAL ───────────────────────────────────────────────
const TUTORIAL_STEPS = [
  {
    id: "welcome",
    title: "أهلاً بك في سيجة! 🎮",
    desc: "لعبة سودانية تراثية — سأعلمك كيف تلعب خطوة بخطوة",
    highlight: null,
    action: null,
    icon: "♟",
  },
  {
    id: "board",
    title: "اللوحة",
    desc: "اللوحة 5×5 = 25 مربع. الزوايا والمنتصف مناطق أمان 🛡️ — الحجر داخلها لا يُأكل",
    highlight: "board",
    action: null,
    icon: "🗺️",
  },
  {
    id: "placement",
    title: "التوزيع",
    desc: "كل دور تضع حجرين على اللوحة. اضغط على أي مربع فاضي لتضع حجرك!",
    highlight: "place",
    action: "place",
    icon: "✌️",
    target: [0, 1],
  },
  {
    id: "placement2",
    title: "التوزيع — الحجر الثاني",
    desc: "ممتاز! الآن ضع حجرك الثاني في مربع آخر",
    highlight: "place",
    action: "place2",
    icon: "✌️",
    target: [0, 3],
  },
  {
    id: "movement",
    title: "الحركة",
    desc: "بعد التوزيع تبدأ مرحلة الحركة. الحجر يتحرك أفقياً أو عمودياً فقط — لا قطرياً!",
    highlight: "move",
    action: null,
    icon: "↕️",
  },
  {
    id: "capture",
    title: "الأكل 🍽️",
    desc: "احصر حجر الخصم بين حجرين من حجارك — يُأكل تلقائياً! الأكل اختياري، تقدر تتجاوزه للفخ.",
    highlight: "capture",
    action: null,
    icon: "🍽️",
  },
  {
    id: "safezone",
    title: "مناطق الأمان 🛡️",
    desc: "الحجر في الزوايا أو المنتصف محمي تماماً ولا يمكن أكله. استخدمها لحماية حجارك!",
    highlight: "safe",
    action: null,
    icon: "🛡️",
  },
  {
    id: "sika",
    title: "السكة 🚪",
    desc: "لو حوصرت جميع حجارك اضغط طلب سكة — الخصم يفتح لك طريقاً من حجاره!",
    highlight: null,
    action: null,
    icon: "🚪",
  },
  {
    id: "win",
    title: "شروط الفوز 🏆",
    desc: "تفوز إذا بقي للخصم حجر واحد — أو حجران وأنت عندك 6 حجار أو أكثر!",
    highlight: null,
    action: null,
    icon: "🏆",
  },
  {
    id: "ready",
    title: "أنت جاهز! 🎉",
    desc: "عرفت كيف تلعب سيجة. العب الآن وأثبت مهارتك!",
    highlight: null,
    action: null,
    icon: "🚀",
  },
];

function Tutorial({ onFinish, onBack }) {
  const [step, setStep] = useState(0);
  const [tutBoard, setTutBoard] = useState(() => {
    const b = Array(5).fill(null).map(() => Array(5).fill(null));
    // Setup demo board for capture illustration
    return b;
  });
  const [placed, setPlaced] = useState(0);
  const [animCell, setAnimCell] = useState(null);

  const cur = TUTORIAL_STEPS[step];
  const isLast = step === TUTORIAL_STEPS.length - 1;

  const handleBoardClick = (r, c) => {
    if (cur.action === "place" && placed === 0 && r === cur.target[0] && c === cur.target[1]) {
      const nb = tutBoard.map(row => [...row]);
      nb[r][c] = WHITE;
      setTutBoard(nb);
      setAnimCell(`${r},${c}`);
      setTimeout(() => setAnimCell(null), 400);
      setPlaced(1);
      setTimeout(() => setStep(s => s + 1), 700);
    } else if (cur.action === "place2" && placed === 1 && r === cur.target[0] && c === cur.target[1]) {
      const nb = tutBoard.map(row => [...row]);
      nb[r][c] = WHITE;
      setTutBoard(nb);
      setAnimCell(`${r},${c}`);
      setTimeout(() => setAnimCell(null), 400);
      setPlaced(2);
      setTimeout(() => setStep(s => s + 1), 700);
    }
  };

  // Demo board for each step
  const getDemoBoard = () => {
    if (cur.id === "capture") {
      const b = Array(5).fill(null).map(() => Array(5).fill(null));
      b[2][0] = WHITE; b[2][2] = BLACK; b[2][4] = WHITE;
      b[1][2] = WHITE; b[3][2] = WHITE;
      return b;
    }
    if (cur.id === "safezone") {
      const b = Array(5).fill(null).map(() => Array(5).fill(null));
      b[0][0] = BLACK; b[0][4] = WHITE;
      b[2][2] = WHITE;
      return b;
    }
    if (cur.id === "movement") {
      const b = Array(5).fill(null).map(() => Array(5).fill(null));
      b[2][2] = WHITE; b[1][1] = BLACK; b[3][3] = BLACK;
      return b;
    }
    return tutBoard;
  };

  const board = getDemoBoard();
  const CELL = 52, PS = 38;

  const getCellStyle = (r, c) => {
    const safe = (r===0&&c===0)||(r===0&&c===4)||(r===4&&c===0)||(r===4&&c===4)||(r===2&&c===2);
    const center = r===2&&c===2;
    let bg = (r+c)%2===0 ? "rgba(255,255,255,0.025)" : "rgba(0,0,0,0.12)";
    let border = "rgba(212,168,67,0.07)";
    let glow = "none";

    if (center) { bg="rgba(212,168,67,0.08)"; border="rgba(212,168,67,0.3)"; }
    else if (safe && (cur.highlight==="safe"||cur.highlight==="board")) {
      bg="rgba(212,168,67,0.08)"; border="rgba(212,168,67,0.3)";
      glow="0 0 8px rgba(212,168,67,0.3)";
    }

    if (cur.action==="place"&&board[r][c]===null&&!(r===2&&c===2)) {
      if (cur.target && r===cur.target[0] && c===cur.target[1]) {
        bg="rgba(212,168,67,0.2)"; border="rgba(212,168,67,0.7)";
        glow="0 0 12px rgba(212,168,67,0.5)";
      }
    }
    if (cur.action==="place2"&&board[r][c]===null&&!(r===2&&c===2)) {
      if (cur.target && r===cur.target[0] && c===cur.target[1]) {
        bg="rgba(212,168,67,0.2)"; border="rgba(212,168,67,0.7)";
        glow="0 0 12px rgba(212,168,67,0.5)";
      }
    }
    if (cur.highlight==="capture") {
      if ((r===2&&c===2)||(r===1&&c===2)||(r===3&&c===2)) {
        bg="rgba(100,200,100,0.1)"; border="rgba(100,200,100,0.4)";
      }
      if (r===2&&c===2) { bg="rgba(255,60,60,0.2)"; border="rgba(255,60,60,0.6)"; }
    }
    if (cur.highlight==="move") {
      if (r===2&&c===2) { bg="rgba(212,168,67,0.2)"; border="rgba(212,168,67,0.6)"; }
      if ((r===1&&c===2)||(r===3&&c===2)||(r===2&&c===1)||(r===2&&c===3)) {
        bg="rgba(100,200,100,0.12)"; border="rgba(100,200,100,0.4)";
      }
    }
    return { bg, border, glow };
  };

  return (
    <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:14,width:"100%",maxWidth:400}}>
      {/* Progress bar */}
      <div style={{width:"100%",height:3,background:"rgba(212,168,67,0.1)",borderRadius:2,overflow:"hidden"}}>
        <div style={{
          height:"100%",
          width:`${((step+1)/TUTORIAL_STEPS.length)*100}%`,
          background:"linear-gradient(90deg,#d4a843,#f5d78a)",
          borderRadius:2,transition:"width 0.4s ease",
        }}/>
      </div>
      <div style={{fontSize:"0.55rem",color:"rgba(212,168,67,0.3)",fontFamily:"'Cairo',sans-serif"}}>
        {step+1} / {TUTORIAL_STEPS.length}
      </div>

      {/* Step card */}
      <div style={{
        width:"100%",
        background:"linear-gradient(145deg,rgba(30,20,8,0.95),rgba(15,10,3,0.98))",
        border:"1.5px solid rgba(212,168,67,0.25)",
        borderRadius:16,overflow:"hidden",
        boxShadow:"0 20px 60px rgba(0,0,0,0.6),inset 0 1px 0 rgba(212,168,67,0.08)",
      }}>
        {/* Header */}
        <div style={{
          padding:"16px 18px 12px",
          borderBottom:"1px solid rgba(212,168,67,0.08)",
          textAlign:"center",
        }}>
          <div style={{fontSize:"2.2rem",marginBottom:6}}>{cur.icon}</div>
          <h3 style={{
            color:"#f5d78a",fontFamily:"'Amiri',serif",fontSize:"1.1rem",
            margin:0,fontWeight:700,
          }}>{cur.title}</h3>
          <p style={{
            color:"#8a6830",fontFamily:"'Cairo',sans-serif",
            fontSize:"0.75rem",lineHeight:1.7,margin:"8px 0 0",
          }}>{cur.desc}</p>
        </div>

        {/* Board demo (for relevant steps) */}
        {(cur.highlight||cur.action) && (
          <div style={{display:"flex",justifyContent:"center",padding:"14px 0 10px"}}>
            <div style={{
              background:"linear-gradient(145deg,#2C1F0E,#1a1007)",
              border:"2px solid rgba(212,168,67,0.2)",
              borderRadius:10,padding:6,
              boxShadow:"0 8px 30px rgba(0,0,0,0.6)",
            }}>
              {Array(5).fill(null).map((_,r)=>(
                <div key={r} style={{display:"flex"}}>
                  {Array(5).fill(null).map((_,c)=>{
                    const piece=board[r][c];
                    const {bg,border,glow}=getCellStyle(r,c);
                    const isTarget=cur.target&&r===cur.target[0]&&c===cur.target[1];
                    const isAnim=animCell===`${r},${c}`;
                    const safe=(r===0&&c===0)||(r===0&&c===4)||(r===4&&c===0)||(r===4&&c===4)||(r===2&&c===2);
                    return(
                      <div key={c}
                        onClick={()=>handleBoardClick(r,c)}
                        style={{
                          width:CELL,height:CELL,
                          display:"flex",alignItems:"center",justifyContent:"center",
                          position:"relative",
                          background:bg,border:`1px solid ${border}`,
                          borderRadius:3,boxSizing:"border-box",
                          cursor:(cur.action&&isTarget)?"pointer":"default",
                          boxShadow:glow,
                          transition:"all 0.3s",
                        }}>
                        {/* Safe zone marker */}
                        {safe&&!piece&&cur.highlight==="board"&&(
                          <div style={{fontSize:"0.6rem",color:"rgba(212,168,67,0.5)"}}>🛡</div>
                        )}
                        {/* Center star */}
                        {r===2&&c===2&&!piece&&(
                          <div style={{width:12,height:12,background:"rgba(212,168,67,0.5)",
                            clipPath:"polygon(50% 0%,61% 35%,98% 35%,68% 57%,79% 91%,50% 70%,21% 91%,32% 57%,2% 35%,39% 35%)"}}/>
                        )}
                        {/* Target pulse */}
                        {isTarget&&!piece&&(
                          <div style={{
                            width:20,height:20,borderRadius:"50%",
                            background:"rgba(212,168,67,0.3)",
                            border:"2px solid rgba(212,168,67,0.8)",
                            animation:"pulse 0.85s infinite",
                          }}/>
                        )}
                        {/* Move arrows */}
                        {cur.highlight==="move"&&r===2&&c===2&&(
                          <div style={{
                            width:PS,height:PS,borderRadius:"50%",
                            background:"radial-gradient(circle at 32% 28%,#FFFFF0,#E8D9A8,#C8A96E)",
                            border:"2px solid #d4a843",
                            boxShadow:"0 0 12px rgba(212,168,67,0.5)",
                          }}/>
                        )}
                        {/* Pieces */}
                        {piece&&(
                          <div className={isAnim?"piece-drop":""} style={{
                            width:PS,height:PS,borderRadius:"50%",
                            background:piece===WHITE
                              ?"radial-gradient(circle at 32% 28%,#FFFFF0,#E8D9A8,#C8A96E)"
                              :"radial-gradient(circle at 32% 28%,#484848,#1a1a1a,#000)",
                            border:piece===WHITE?"1.5px solid #B89850":"1.5px solid #404040",
                            boxShadow:piece===WHITE
                              ?"0 3px 8px rgba(0,0,0,0.5),inset 0 1px rgba(255,255,220,0.5)"
                              :"0 3px 8px rgba(0,0,0,0.7),inset 0 1px rgba(255,255,255,0.1)",
                            position:"relative",overflow:"hidden",
                          }}>
                            <div style={{position:"absolute",top:"10%",left:"15%",width:"35%",height:"25%",borderRadius:"50%",background:piece===WHITE?"rgba(255,255,255,0.7)":"rgba(255,255,255,0.15)",filter:"blur(1px)"}}/>
                          </div>
                        )}
                        {/* Capture illustration */}
                        {cur.highlight==="capture"&&r===2&&c===2&&board[r][c]===BLACK&&(
                          <div style={{
                            position:"absolute",inset:0,borderRadius:3,
                            background:"rgba(255,50,50,0.3)",
                            animation:"capFlash 0.8s ease infinite",
                          }}/>
                        )}
                        {/* Move targets */}
                        {cur.highlight==="move"&&board[r][c]===null&&(
                          (r===1&&c===2)||(r===3&&c===2)||(r===2&&c===1)||(r===2&&c===3)
                        )&&(
                          <div style={{width:10,height:10,borderRadius:"50%",background:"rgba(100,220,100,0.5)",border:"1px solid rgba(100,220,100,0.8)"}}/>
                        )}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Action hint */}
        {cur.action && (
          <div style={{textAlign:"center",padding:"8px 16px 14px"}}>
            <span style={{
              color:"#d4a843",fontFamily:"'Cairo',sans-serif",fontSize:"0.7rem",
              animation:"pulse 1s infinite",
            }}>
              {cur.action==="place"?"👆 اضغط على المربع المضيء!":"👆 ضع حجرك الثاني!"}
            </span>
          </div>
        )}
      </div>

      {/* Navigation */}
      <div style={{display:"flex",gap:10,width:"100%",justifyContent:"center",alignItems:"center"}}>
        {step>0&&(
          <button onClick={()=>setStep(s=>s-1)} style={{
            padding:"8px 16px",borderRadius:20,
            background:"rgba(0,0,0,0.3)",
            border:"1px solid rgba(212,168,67,0.15)",
            color:"#6a4820",fontFamily:"'Cairo',sans-serif",fontSize:"0.72rem",
            cursor:"pointer",
          }}>← السابق</button>
        )}

        {isLast ? (
          <button onClick={onFinish} style={{
            padding:"10px 28px",borderRadius:20,flex:1,
            background:"linear-gradient(135deg,rgba(212,168,67,0.25),rgba(160,100,20,0.18))",
            border:"1.5px solid rgba(212,168,67,0.5)",
            color:"#f5d78a",fontFamily:"'Cairo',sans-serif",fontSize:"0.85rem",fontWeight:700,
            cursor:"pointer",boxShadow:"0 0 20px rgba(212,168,67,0.15)",
          }}>🎮 العب الآن!</button>
        ) : !cur.action ? (
          <button onClick={()=>setStep(s=>s+1)} style={{
            padding:"10px 28px",borderRadius:20,flex:1,
            background:"linear-gradient(135deg,rgba(212,168,67,0.2),rgba(160,100,20,0.14))",
            border:"1.5px solid rgba(212,168,67,0.4)",
            color:"#C8A96E",fontFamily:"'Cairo',sans-serif",fontSize:"0.8rem",fontWeight:700,
            cursor:"pointer",
          }}>التالي ←</button>
        ) : (
          <div style={{
            padding:"8px 20px",borderRadius:20,flex:1,textAlign:"center",
            background:"rgba(212,168,67,0.05)",
            border:"1px dashed rgba(212,168,67,0.2)",
            color:"#5a4010",fontFamily:"'Cairo',sans-serif",fontSize:"0.7rem",
          }}>اضغط على اللوحة للمتابعة</div>
        )}

        <button onClick={()=>{setStep(TUTORIAL_STEPS.length-1);}} style={{
          padding:"8px 12px",borderRadius:20,
          background:"transparent",border:"1px solid rgba(212,168,67,0.08)",
          color:"#3a2810",fontFamily:"'Cairo',sans-serif",fontSize:"0.62rem",cursor:"pointer",
        }}>تخطي</button>
      </div>

      <button onClick={onBack} style={{
        padding:"4px 14px",borderRadius:20,background:"transparent",
        border:"none",color:"#2a1808",fontFamily:"'Cairo',sans-serif",
        fontSize:"0.62rem",cursor:"pointer",
      }}>← رجوع</button>
    </div>
  );
}

// ── GAME ───────────────────────────────────────────────────
const CELL=62,PS=46;

function Game({mode,onBack,playerColor,aiLevel,scores,onAddPoints,pieceTheme,onRecordWin}){
  const isVsAI=mode==="vs-ai";
  const aiPlayer=other(playerColor||WHITE);
  const humanPlayer=playerColor||WHITE;

  const [board,setBoard]=useState(emptyBoard);
  const [phase,setPhase]=useState("placement");
  const [cur,setCur]=useState(humanPlayer);
  const [firstPlacer,setFirstPlacer]=useState(null);
  const [placedW,setPlacedW]=useState(0);
  const [placedB,setPlacedB]=useState(0);
  const [turnCount,setTurnCount]=useState(0);
  const [sel,setSel]=useState(null);
  const [locked,setLocked]=useState(null);
  const [vmoves,setVmoves]=useState([]);
  const [sikaState,setSikaState]=useState(null);
  const [sikaBlocked,setSikaBlocked]=useState(null);
  const [sikaGiver,setSikaGiver]=useState(null);
  const [sikaFrom,setSikaFrom]=useState(null);
  const [msg,setMsg]=useState(`دور ${humanPlayer===WHITE?"الأبيض":"الأسود"} ← ضع حجرين`);
  const [winner,setWinner]=useState(null);
  const [winReason,setWinReason]=useState("");
  const [capsW,setCapsW]=useState([]);
  const [capsB,setCapsB]=useState([]);
  const [lastCaps,setLastCaps]=useState([]);
  const [anim,setAnim]=useState([]);
  const [shaking,setShaking]=useState([]);
  const [lastFrom,setLastFrom]=useState(null);
  const [combo,setCombo]=useState(0);
  const [showCombo,setShowCombo]=useState(false);
  const [history,setHistory]=useState([]);
  const [moveLog,setMoveLog]=useState([]);
  const [aiThinking,setAiThinking]=useState(false);
  const [afterUndo,setAfterUndo]=useState(false);
  const [hintCell,setHintCell]=useState(null);
  const [showHint,setShowHint]=useState(false);

  const getHint=()=>{
    if(phase!=="movement"||winner||(isVsAI&&cur===aiPlayer)) return;
    const mv=aiBestMove(board,cur,"medium");
    if(mv){setHintCell([mv.tr,mv.tc]);setShowHint(true);setTimeout(()=>{setHintCell(null);setShowHint(false);},2000);}
  };
  const [timeLeft,setTimeLeft]=useState(30);
  const [timerActive,setTimerActive]=useState(false);
  const [earnedPts,setEarnedPts]=useState(0);
  const [showPts,setShowPts]=useState(false);

  const flash=cells=>{setAnim(cells);setTimeout(()=>setAnim([]),500);};
  const shake=cells=>{setShaking(cells);setTimeout(()=>setShaking([]),400);};

  const isSel=(r,c)=>sel&&sel[0]===r&&sel[1]===c;
  const isVM=(r,c)=>vmoves.some(([mr,mc])=>mr===r&&mc===c);
  const isCap=(r,c)=>lastCaps.some(([cr,cc])=>cr===r&&cc===c);
  const isAnim=(r,c)=>anim.some(([ar,ac])=>ar===r&&ac===c);
  const isShake=(r,c)=>shaking.some(([sr,sc])=>sr===r&&sc===c);

  const wOnBoard=countPieces(board,WHITE),bOnBoard=countPieces(board,BLACK);
  const wInHand=PIECES_PER_PLAYER-placedW,bInHand=PIECES_PER_PLAYER-placedB;

  const addPoints=(reason,extra={})=>{
    const pts=calcPoints(reason,extra.captured||0,extra.combo||0,aiLevel||"medium");
    if(pts>0&&extra.player===humanPlayer){
      setEarnedPts(pts);setShowPts(true);setTimeout(()=>setShowPts(false),1500);
      onAddPoints&&onAddPoints(humanPlayer,pts);
    }
  };

  const endTurn=(nb,next,nCW,nCB)=>{
    setSel(null);setLocked(null);setVmoves([]);setCombo(0);
    if(nCW!==undefined){setCapsW(nCW);setCapsB(nCB);}
    if(isBlocked(nb,next)){
      const giver=other(next);
      // لو المحصور هو الإنسان والخصم هو الكمبيوتر — الكمبيوتر يفتح السكة تلقائياً
      if(isVsAI && next===humanPlayer && giver===aiPlayer){
        setSikaBlocked(next);setSikaGiver(giver);setSikaFrom(null);
        setCur(next);
        setMsg("الكمبيوتر يفتح السكة...");
        setTimeout(()=>{
          // الكمبيوتر يختار حجر له مجال حركة
          const moveable=[];
          for(let r=0;r<BOARD_SIZE;r++) for(let c=0;c<BOARD_SIZE;c++)
            if(nb[r][c]===giver&&getValidMoves(nb,r,c).length>0) moveable.push([r,c]);
          if(moveable.length===0){setCur(next);setMsg(`دور ${next===WHITE?"الأبيض":"الأسود"}`);return;}
          const [fr,fc]=moveable[Math.floor(Math.random()*moveable.length)];
          const moves=getValidMoves(nb,fr,fc);
          const [tr,tc]=moves[Math.floor(Math.random()*moves.length)];
          const nb2=nb.map(r=>[...r]);
          nb2[tr][tc]=giver; nb2[fr][fc]=EMPTY;
          setBoard(nb2); flash([[tr,tc]]); playSound("move");
          setSikaBlocked(null);setSikaGiver(null);setSikaState(null);setSikaFrom(null);
          setCur(next);
          setMsg(`السكة اتفتحت ← دور ${next===WHITE?"الأبيض":"الأسود"}`);
        },900);
        setSikaState("ai-handling");
      } else {
        setSikaBlocked(next);setSikaGiver(giver);
        setSikaState("waiting");setSikaFrom(null);setCur(next);
        setMsg(`${next===WHITE?"الأبيض":"الأسود"} محصور! اضغط 🚪 طلب سكة`);
      }
    }
    else{setCur(next);setMsg(`دور ${next===WHITE?"الأبيض":"الأسود"}`);}
  };

  const saveSnapshot=(board,player,cw,cb,cmb,message)=>{
    setHistory(h=>[...h.slice(-12),{board:board.map(r=>[...r]),cur:player,capsW:[...cw],capsB:[...cb],combo:cmb,msg:message,placedW,placedB,phase,firstPlacer,turnCount}]);
  };

  const executeMove=(board,fr,fc,tr,tc,player,cW,cB,cmb,log)=>{
    const nb=board.map(r=>[...r]);
    const captured=getCaptures(board,fr,fc,tr,tc);
    nb[tr][tc]=player;nb[fr][fc]=EMPTY;
    for(const[cr,cc]of captured)nb[cr][cc]=EMPTY;
    setBoard(nb);setLastCaps(captured);setLastFrom([fr,fc]);
    flash([[tr,tc]]);
    if(captured.length>0){shake(captured);playSound("capture");addPoints("capture",{captured:captured.length,player});}
    else if(isSafe(tr,tc))playSound("safe");
    else playSound("move");

    const newCW=player===WHITE?[...cW,...captured.map(()=>BLACK)]:cW;
    const newCB=player===BLACK?[...cB,...captured.map(()=>WHITE)]:cB;
    const newCombo=captured.length>0?cmb+1:0;
    if(captured.length>0&&newCombo>1){setCombo(newCombo);setShowCombo(true);setTimeout(()=>setShowCombo(false),1200);addPoints("combo",{combo:newCombo,player});}

    const newKey=`${player}:${fr},${fc}->${tr},${tc}`;
    const newLog=[...(log||moveLog),newKey];
    const repCount=newLog.filter(k=>k===newKey).length;
    setMoveLog(newLog);

    if(repCount>6){
      const wC=countPieces(nb,WHITE),bC=countPieces(nb,BLACK);
      const repW=wC>bC?WHITE:bC>wC?BLACK:null;
      if(repW){setWinner(repW);setWinReason("تكرار");setCapsW(newCW);setCapsB(newCB);setMsg(`🏆 فاز بالتكرار!`);playSound("win");addPoints("win",{player:repW});if(onRecordWin)onRecordWin(repW===humanPlayer,aiLevel||"medium");return{done:true};}
    }
    const w=checkWin(nb,player);
    if(w){const oC=countPieces(nb,other(player));setWinner(w);setWinReason(oC<=1?"حجر واحد":"حجران مقابل 6+");setSel(null);setLocked(null);setVmoves([]);setCapsW(newCW);setCapsB(newCB);setMsg(`🏆 ${w===WHITE?"الأبيض":"الأسود"} فاز!`);playSound("win");addPoints("win",{player:w});if(onRecordWin)onRecordWin(w===humanPlayer,aiLevel||"medium");return{done:true};}

    if(captured.length>0){const nc=getCaptureMoves(nb,tr,tc);if(nc.length>0){setCapsW(newCW);setCapsB(newCB);return{done:false,board:nb,r:tr,c:tc,cw:newCW,cb:newCB,combo:newCombo,log:newLog};}}
    endTurn(nb,other(player),newCW,newCB);
    return{done:true};
  };

  // AI
  useEffect(()=>{
    if(!isVsAI||cur!==aiPlayer||phase!=="movement"||winner||sikaState==="waiting"||sikaState==="ai-handling") return;
    const runAI=(currentBoard,lockedPiece,cW,cB,cmb,log)=>{
      setAiThinking(true);
      const delay=aiLevel==="easy"?400:aiLevel==="medium"?700:1000;
      setTimeout(()=>{
        setAiThinking(false);
        let mv;
        if(lockedPiece){const capMoves=getCaptureMoves(currentBoard,lockedPiece[0],lockedPiece[1]);if(capMoves.length===0){endTurn(currentBoard,humanPlayer,cW,cB);return;}mv={fr:lockedPiece[0],fc:lockedPiece[1],tr:capMoves[0][0],tc:capMoves[0][1]};}
        else{mv=aiBestMove(currentBoard,aiPlayer,aiLevel||"medium");if(!mv){endTurn(currentBoard,humanPlayer,cW,cB);return;}}
        const result=executeMove(currentBoard,mv.fr,mv.fc,mv.tr,mv.tc,aiPlayer,cW,cB,cmb,log);
        if(!result.done){setLocked([result.r,result.c]);setSel([result.r,result.c]);setVmoves(getCaptureMoves(result.board,result.r,result.c));setCur(aiPlayer);setTimeout(()=>runAI(result.board,[result.r,result.c],result.cw,result.cb,result.combo,result.log),600);}
      },delay);
    };
    runAI(board,locked,capsW,capsB,combo,moveLog);
  },[cur,phase,winner,sikaState,isVsAI]);

  useEffect(()=>{
    if(!afterUndo||!isVsAI||cur!==aiPlayer||phase!=="movement"||winner)return;
    setAfterUndo(false);
    setMsg("↩️ شوف حركة الكمبيوتر...");
    const t=setTimeout(()=>{
      const mv=aiBestMove(board,aiPlayer,aiLevel||"medium");
      if(!mv){endTurn(board,humanPlayer,capsW,capsB);return;}
      saveSnapshot(board,humanPlayer,capsW,capsB,combo,msg);
      const result=executeMove(board,mv.fr,mv.fc,mv.tr,mv.tc,aiPlayer,capsW,capsB,combo,moveLog);
      if(!result.done){
        setLocked([result.r,result.c]);setSel([result.r,result.c]);
        setVmoves(getCaptureMoves(result.board,result.r,result.c));setCur(aiPlayer);
      }
    },1000);
    return()=>clearTimeout(t);
  },[afterUndo,cur,phase,winner,isVsAI]);

  // ── مؤقت 30 ثانية لكل حركة ────────────────────────────
  const curRef = useRef(cur);
  curRef.current = cur;
  useEffect(()=>{
    if(phase!=="movement"||winner||sikaState){setTimerActive(false);return;}
    if(isVsAI&&cur===aiPlayer){setTimerActive(false);return;}
    let count=30;
    setTimeLeft(30);
    setTimerActive(true);
    const interval=setInterval(()=>{
      count--;
      setTimeLeft(count);
      if(count<=0){
        clearInterval(interval);
        setTimerActive(false);
        setSel(null);setLocked(null);setVmoves([]);
        const next=other(curRef.current);
        setCur(next);
        setMsg(`⏱️ انتهى الوقت! ← دور ${next===WHITE?"الأبيض":"الأسود"}`);
      }
    },1000);
    return ()=>{ clearInterval(interval); setTimerActive(false); };
  },[cur,phase,winner,sikaState,isVsAI]);

  // Placement
  const endPlacementTurn=(nW,nB,lastPlacer)=>{
    const total=nW+nB;
    if(total>=PIECES_PER_PLAYER*2){const startMover=other(firstPlacer||lastPlacer);setPhase("movement");setCur(startMover);setTurnCount(0);setMsg(`مرحلة الحركة ← دور ${startMover===WHITE?"الأبيض":"الأسود"}`);}
    else{
      const next=other(lastPlacer);
      if(isVsAI&&next===aiPlayer){
        setBoard(prevBoard=>{
          const nb=prevBoard.map(r=>[...r]);let placed=0,nnW=nW,nnB=nB;
          const empties=[];for(let r=0;r<BOARD_SIZE;r++)for(let c=0;c<BOARD_SIZE;c++)if(nb[r][c]===EMPTY&&!(r===2&&c===2))empties.push([r,c]);
          const pref=empties.filter(([r,c])=>isSafe(r,c)).sort(()=>Math.random()-0.5);
          const rest=empties.filter(([r,c])=>!isSafe(r,c)).sort(()=>Math.random()-0.5);
          const aiCells=[];
          for(const[r,c]of[...pref,...rest]){if(placed>=2)break;if((next===WHITE?nnW:nnB)>=PIECES_PER_PLAYER)break;nb[r][c]=next;aiCells.push([r,c]);if(next===WHITE)nnW++;else nnB++;placed++;}
          setTimeout(()=>{
            if(next===WHITE)setPlacedW(nnW);else setPlacedB(nnB);
            if(aiCells.length>0)flash(aiCells);playSound("move");
            const total2=nnW+nnB;
            if(total2>=PIECES_PER_PLAYER*2){const startMover=other(firstPlacer||next);setPhase("movement");setCur(startMover);setTurnCount(0);setMsg(`مرحلة الحركة ← دور ${startMover===WHITE?"الأبيض":"الأسود"}`);}
            else{const hp=other(next);setCur(hp);setTurnCount(0);setMsg(`دورك ← ضع حجرين (${PIECES_PER_PLAYER-(hp===WHITE?nnW:nnB)} في اليد)`);}
          },0);
          return nb;
        });
      }else{setCur(next);setTurnCount(0);setMsg(`دور ${next===WHITE?"الأبيض":"الأسود"} ← ضع حجرين (${PIECES_PER_PLAYER-(next===WHITE?nW:nB)} في اليد)`);}
    }
  };

  const handlePlacement=(r,c)=>{
    if(winner||board[r][c]!==EMPTY)return;
    if(r===2&&c===2){setMsg("⛔ المركز لا يُوضع فيه حجر أثناء التوزيع");return;}
    if((cur===WHITE?placedW:placedB)>=PIECES_PER_PLAYER||turnCount>=2)return;
    saveSnapshot(board,cur,capsW,capsB,combo,msg);
    const nb=board.map(r=>[...r]);nb[r][c]=cur;
    let nW=placedW,nB=placedB;if(cur===WHITE)nW++;else nB++;const nt=turnCount+1;
    if(!firstPlacer&&nW+nB===1)setFirstPlacer(cur);
    setBoard(nb);setPlacedW(nW);setPlacedB(nB);setTurnCount(nt);flash([[r,c]]);playSound("move");
    if(nt>=2){setMsg("✅ وضعت حجرين...");setTimeout(()=>endPlacementTurn(nW,nB,cur),600);}
    else setMsg(`${cur===WHITE?"الأبيض":"الأسود"} ← ضع حجراً آخر (${PIECES_PER_PLAYER-(cur===WHITE?nW:nB)} في اليد)`);
  };

  const pressSika=()=>{setSikaState("pick-piece");setCur(sikaGiver);setMsg(`${sikaGiver===WHITE?"الأبيض":"الأسود"} ← اختر حجراً له مجال حركة لتفتح السكة`);};
  const handleSikaClick=(r,c)=>{
    if(sikaState==="pick-piece"){if(board[r][c]!==sikaGiver){setMsg("اختر حجراً من حجارك!");return;}if(getValidMoves(board,r,c).length===0){setMsg("هذا الحجر ما عنده مجال حركة!");return;}setSikaFrom([r,c]);setSikaState("pick-cell");setMsg(`${sikaGiver===WHITE?"الأبيض":"الأسود"} ← اختر مربعاً مجاوراً فاضياً`);}
    else if(sikaState==="pick-cell"){if(board[r][c]!==EMPTY){setMsg("اختر مربعاً فاضياً!");return;}const dr=Math.abs(r-sikaFrom[0]),dc=Math.abs(c-sikaFrom[1]);if(!((dr===1&&dc===0)||(dr===0&&dc===1))){setMsg("الحركة لازم لمربع مجاور!");return;}const nb=board.map(r=>[...r]);nb[r][c]=sikaGiver;nb[sikaFrom[0]][sikaFrom[1]]=EMPTY;setBoard(nb);flash([[r,c]]);playSound("move");setSikaState(null);setSikaBlocked(null);setSikaGiver(null);setSikaFrom(null);setCur(sikaBlocked);setSel(null);setLocked(null);setVmoves([]);setMsg(`السكة اتفتحت ← دور ${sikaBlocked===WHITE?"الأبيض":"الأسود"}`);}
  };

  const handleMovement=(r,c)=>{
    if(winner)return;
    if(sikaState==="pick-piece"||sikaState==="pick-cell"){handleSikaClick(r,c);return;}
    if(sikaState==="waiting")return;
    if(isVsAI&&cur===aiPlayer)return;
    if(sel){
      const valid=vmoves.some(([mr,mc])=>mr===r&&mc===c);
      if(valid){saveSnapshot(board,cur,capsW,capsB,combo,msg);const result=executeMove(board,sel[0],sel[1],r,c,cur,capsW,capsB,combo,moveLog);if(!result.done){setSel([result.r,result.c]);setLocked([result.r,result.c]);setVmoves(getCaptureMoves(result.board,result.r,result.c));setCapsW(result.cw);setCapsB(result.cb);setCombo(result.combo);setMsg("أكل! ← يمكنك الاستمرار أو إنهاء دورك");}}
      else if(board[r][c]===cur&&!locked){setSel([r,c]);setVmoves(getValidMoves(board,r,c));}
      else if(!locked){setSel(null);setVmoves([]);}
    }else if(board[r][c]===cur){if(locked&&!(locked[0]===r&&locked[1]===c))return;setSel([r,c]);setVmoves(getValidMoves(board,r,c));}
  };

  const endMyTurn=()=>{if(!locked||winner)return;endTurn(board,other(cur),capsW,capsB);};

  const undoMove=()=>{
    if(history.length===0||winner)return;
    const prev=history[history.length-1];
    setHistory(h=>h.slice(0,-1));
    setBoard(prev.board);setCur(prev.cur);setCapsW(prev.capsW);setCapsB(prev.capsB);setCombo(prev.combo);
    setMsg(`↩️ رجعت خطوة`);
    if(prev.phase)setPhase(prev.phase);
    if(prev.placedW!==undefined){setPlacedW(prev.placedW);setPlacedB(prev.placedB);}
    if(prev.firstPlacer!==undefined)setFirstPlacer(prev.firstPlacer);
    if(prev.turnCount!==undefined)setTurnCount(prev.turnCount);
    setSel(null);setLocked(null);setVmoves([]);setSikaState(null);setSikaBlocked(null);setSikaGiver(null);setSikaFrom(null);setLastCaps([]);setAnim([]);setShaking([]);setShowCombo(false);
    if(isVsAI)setAfterUndo(true);
  };

  const resetGame=()=>{setBoard(emptyBoard());setPhase("placement");setCur(humanPlayer);setFirstPlacer(null);setPlacedW(0);setPlacedB(0);setTurnCount(0);setSel(null);setLocked(null);setVmoves([]);setSikaState(null);setSikaBlocked(null);setSikaGiver(null);setSikaFrom(null);setMsg(`دور ${humanPlayer===WHITE?"الأبيض":"الأسود"} ← ضع حجرين`);setWinner(null);setWinReason("");setCapsW([]);setCapsB([]);setLastCaps([]);setAnim([]);setShaking([]);setLastFrom(null);setCombo(0);setShowCombo(false);setHistory([]);setMoveLog([]);setTimeLeft(30);setTimerActive(false);};

  const cellType=(r,c)=>{
    if(sikaState==="pick-piece"&&board[r][c]===sikaGiver&&getValidMoves(board,r,c).length>0)return "sika-piece";
    if(sikaState==="pick-cell"&&board[r][c]===EMPTY)return "sika-cell";
    if(isVM(r,c))return "valid";
    return "";
  };
  const inSika=sikaState==="pick-piece"||sikaState==="pick-cell";

  // Hand Panel
  const HandPanel=({player})=>{
    const isW=player===WHITE,inHand=isW?wInHand:bInHand,onBoard=isW?wOnBoard:bOnBoard,myCaps=isW?capsW:capsB;
    const active=cur===player&&!winner&&!inSika,isAIPanel=isVsAI&&player===aiPlayer;
    const th=PIECE_THEMES[pieceTheme||"classic"]||PIECE_THEMES.classic;
    const ts=isW?th.white:th.black;
    return(
      <div style={{
        display:"flex",flexDirection:"column",alignItems:"center",gap:5,
        padding:"10px 10px",borderRadius:14,flex:1,
        background:active?"linear-gradient(145deg,rgba(212,168,67,0.1),rgba(160,110,20,0.06))":"rgba(0,0,0,0.25)",
        border:`1.5px solid ${active?"rgba(212,168,67,0.5)":"rgba(212,168,67,0.1)"}`,
        boxShadow:active?"0 0 20px rgba(212,168,67,0.1),inset 0 1px 0 rgba(212,168,67,0.08)":"inset 0 1px 0 rgba(255,255,255,0.02)",
        transition:"all .35s",backdropFilter:"blur(6px)",
      }}>
        {/* اسم اللاعب + الحجر */}
        <div style={{display:"flex",alignItems:"center",gap:6,width:"100%",justifyContent:"center"}}>
          <div style={{width:18,height:18,borderRadius:"50%",background:ts.bg,border:`1.5px solid ${active?ts.selBorder:ts.border}`,boxShadow:active?`0 0 8px rgba(212,168,67,0.4)`:"0 2px 5px rgba(0,0,0,0.5)",flexShrink:0}}/>
          <span style={{fontSize:"0.6rem",color:active?"#C8A96E":"#4a3010",fontFamily:"'Cairo',sans-serif",fontWeight:700}}>
            {isAIPanel?" 🤖":""}
            {(()=>{
              const theme=pieceTheme||"classic";
              if(isW){
                if(theme==="classic") return "عاجي";
                if(theme==="royal")   return "أزرق";
                if(theme==="nature")  return "أخضر";
                if(theme==="pearl")   return "بنفسجي";
              } else {
                if(theme==="classic") return "فحمي";
                if(theme==="royal")   return "أحمر";
                if(theme==="nature")  return "بني";
                if(theme==="pearl")   return "أزرق داكن";
              }
              return isW?"أبيض":"أسود";
            })()}
          </span>
          {active&&!winner&&<div style={{width:5,height:5,borderRadius:"50%",background:ts.selBorder,boxShadow:`0 0 5px ${ts.selBorder}`,animation:"beat .9s infinite",flexShrink:0}}/>}
        </div>
        {/* شبكة الحجارة 4×3 — بلون الثيم المختار */}
        <div style={{display:"grid",gridTemplateColumns:"repeat(4,14px)",gap:3}}>
          {Array(PIECES_PER_PLAYER).fill(null).map((_,i)=>(
            <div key={i} style={{
              width:14,height:14,borderRadius:"50%",
              background:i<inHand ? ts.bg : "rgba(255,255,255,0.03)",
              border:i<inHand ? `1px solid ${ts.border}` : "1px solid rgba(255,255,255,0.04)",
              boxShadow:i<inHand ? `0 1px 4px rgba(0,0,0,0.5),inset 0 1px rgba(255,255,255,0.15)` : "none",
              transition:"all .3s",
              position:"relative",overflow:"hidden",
            }}>
              {/* لمعة صغيرة */}
              {i<inHand && <div style={{position:"absolute",top:"10%",left:"15%",width:"35%",height:"25%",borderRadius:"50%",background:ts.shine,filter:"blur(1px)"}}/>}
            </div>
          ))}
        </div>
        {/* العدد */}
        <div style={{display:"flex",gap:6,alignItems:"center"}}>
          <span style={{color:"#C8A96E",fontSize:"0.72rem",fontWeight:700,fontFamily:"'Cairo',sans-serif"}}>{inHand}<span style={{color:"#4a3010",fontSize:"0.52rem"}}> يد</span></span>
          {onBoard>0&&<span style={{color:"#4a3010",fontSize:"0.52rem",fontFamily:"'Cairo',sans-serif"}}>{onBoard} لوح</span>}
        </div>
        {/* الحجارة المأكولة */}
        {myCaps.length>0&&(
          <div style={{width:"100%",borderTop:"1px solid rgba(212,168,67,0.12)",paddingTop:5,marginTop:1}}>
            <div style={{display:"flex",alignItems:"center",gap:4,marginBottom:4,justifyContent:"center"}}>
              <span style={{fontSize:"0.55rem",color:"#8a5020",fontFamily:"'Cairo',sans-serif"}}>🍽️ أكل</span>
              <span style={{
                fontSize:"0.6rem",fontWeight:700,color:"#d4a843",
                fontFamily:"'Cairo',sans-serif",
                background:"rgba(212,168,67,0.15)",
                borderRadius:8,padding:"1px 6px",
                border:"1px solid rgba(212,168,67,0.25)",
              }}>{myCaps.length}</span>
            </div>
            <div style={{display:"flex",flexWrap:"wrap",gap:3,justifyContent:"center"}}>
              {myCaps.map((c,i)=>{
                const capTh=PIECE_THEMES[pieceTheme||"classic"]||PIECE_THEMES.classic;
                const capTs=c===WHITE?capTh.white:capTh.black;
                return(
                  <div key={i} style={{
                    width:14,height:14,borderRadius:"50%",
                    background:capTs.bg,
                    border:`1px solid ${capTs.border}`,
                    boxShadow:`0 2px 4px rgba(0,0,0,0.5)`,
                    opacity:0.85,position:"relative",overflow:"hidden",
                  }}>
                    <div style={{position:"absolute",top:"10%",left:"15%",width:"35%",height:"25%",borderRadius:"50%",background:capTs.shine,filter:"blur(1px)"}}/>
                  </div>
                );
              })}
            </div>
          </div>
        )}
        {isVsAI&&isAIPanel&&<span style={{color:"#5a3810",fontSize:"0.5rem",fontFamily:"'Cairo',sans-serif"}}>{aiLevel==="easy"?"مبتدئ":aiLevel==="medium"?"متوسط":"احترافي"}</span>}
        {aiThinking&&isAIPanel&&<span style={{color:"#C8A96E",fontSize:"0.5rem",fontFamily:"'Cairo',sans-serif",animation:"pulse 1s infinite"}}>يفكر...</span>}
      </div>
    );
  };

  if(board.length!==BOARD_SIZE){resetGame();return null;}

  return(
    <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:9,width:"100%"}}>
      {winner&&<Confetti/>}

      {/* Points popup */}
      {showPts&&(<div style={{position:"fixed",top:"25%",left:"50%",transform:"translateX(-50%)",zIndex:160,padding:"6px 18px",borderRadius:20,background:"linear-gradient(135deg,rgba(100,200,100,0.9),rgba(60,140,60,0.9))",color:"#fff",fontFamily:"'Cairo',sans-serif",fontSize:"1rem",fontWeight:700,pointerEvents:"none",animation:"comboAnim .4s cubic-bezier(.34,1.56,.64,1)"}}>+{earnedPts} نقطة ⭐</div>)}

      {/* Combo */}
      {showCombo&&combo>1&&(<div style={{position:"fixed",top:"28%",left:"50%",transform:"translateX(-50%)",zIndex:150,padding:"7px 18px",borderRadius:20,background:"linear-gradient(135deg,rgba(212,168,67,0.92),rgba(160,100,20,0.92))",color:"#fff",fontFamily:"'Cairo',sans-serif",fontSize:"1rem",fontWeight:700,pointerEvents:"none",animation:"comboAnim .4s cubic-bezier(.34,1.56,.64,1)"}}>Combo ×{combo} 🔥</div>)}

      {/* ── 1. لوحتا اللاعبين مع العنوان في الوسط ── */}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"stretch",width:"100%",maxWidth:420,gap:8}}>
        <HandPanel player={WHITE}/>
        {/* العنوان في الوسط */}
        <div style={{textAlign:"center",flexShrink:0,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:2}}>
          <span style={{fontSize:"clamp(1.2rem,4vw,1.8rem)",fontFamily:"'Amiri',serif",fontWeight:700,
            background:"linear-gradient(135deg,#f5d78a,#d4a843,#a07030,#d4a843,#f5d78a)",
            backgroundSize:"300% auto",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",
            animation:"shimmer 5s linear infinite",lineHeight:1}}>سيجة</span>
          <span style={{color:"rgba(212,168,67,0.25)",fontFamily:"monospace",fontSize:"0.5rem",letterSpacing:2}}>seja</span>
        </div>
        <HandPanel player={BLACK}/>
      </div>

      {/* ── 2. الرسالة + شريط الوقت ── */}
      <div style={{width:"100%",maxWidth:420}}>
        <div style={{
          background:winner
            ?"linear-gradient(135deg,rgba(212,168,67,0.2),rgba(160,100,20,0.15))"
            :inSika?"linear-gradient(135deg,rgba(200,80,20,0.18),rgba(150,40,10,0.12))"
            :"rgba(0,0,0,0.35)",
          border:`1px solid ${winner?"rgba(212,168,67,0.55)":inSika?"rgba(220,100,40,0.45)":"rgba(212,168,67,0.15)"}`,
          borderRadius:timerActive&&!winner&&phase==="movement"?"12px 12px 0 0":12,
          padding:"9px 16px",backdropFilter:"blur(8px)",
          color:winner?"#f5d78a":inSika?"#ffb080":"#C8A96E",
          fontFamily:"'Cairo',sans-serif",fontSize:"0.85rem",textAlign:"center",
        }}>
          {winner?`🎉 ${winner===WHITE?"الأبيض":"الأسود"} فاز! ${winReason?`(${winReason})`:""}`:msg}
        </div>
        {timerActive&&!winner&&phase==="movement"&&(
          <div style={{background:"rgba(0,0,0,0.5)",borderRadius:"0 0 12px 12px",overflow:"hidden",height:7,border:"1px solid rgba(212,168,67,0.1)",borderTop:"none"}}>
            <div style={{
              height:"100%",
              width:`${(timeLeft/30)*100}%`,
              background:timeLeft>10?"linear-gradient(90deg,#d4a843,#f5d78a)":timeLeft>5?"linear-gradient(90deg,#ff8800,#ffbb00)":"linear-gradient(90deg,#ff3300,#ff6600)",
              transition:"width 1s linear,background 0.5s",
              boxShadow:timeLeft<=5?"0 0 10px rgba(255,50,0,0.7)":"none",
            }}/>
          </div>
        )}
        {timerActive&&!winner&&phase==="movement"&&(
          <div style={{textAlign:"center",marginTop:3}}>
            <span style={{
              color:timeLeft>10?"#6a4820":timeLeft>5?"#cc6600":"#ff4400",
              fontFamily:"'Cairo',sans-serif",fontSize:"0.62rem",fontWeight:700,
              animation:timeLeft<=5?"pulse 0.5s infinite":"none",
            }}>⏱️ {timeLeft}ث</span>
          </div>
        )}
      </div>

      {/* ── 3. اللوحة ── */}
      <div style={{display:"flex",alignItems:"center"}}>

        {/* BOARD */}
        <div style={{background:"linear-gradient(145deg,#2C1F0E,#1E1509,#251A0C,#1A1007)",border:"3px solid rgba(212,168,67,0.18)",borderRadius:12,padding:8,boxShadow:"0 20px 60px rgba(0,0,0,0.8),inset 0 1px 0 rgba(212,168,67,0.07)",position:"relative"}}>
          {[{top:5,right:5},{top:5,left:5},{bottom:5,right:5},{bottom:5,left:5}].map((s,i)=>(
            <div key={i} style={{position:"absolute",width:13,height:13,...s,borderTop:[0,1].includes(i)?"1.5px solid rgba(212,168,67,0.35)":"none",borderBottom:[2,3].includes(i)?"1.5px solid rgba(212,168,67,0.35)":"none",borderRight:[0,2].includes(i)?"1.5px solid rgba(212,168,67,0.35)":"none",borderLeft:[1,3].includes(i)?"1.5px solid rgba(212,168,67,0.35)":"none"}}/>
          ))}
          {Array(BOARD_SIZE).fill(null).map((_,r)=>(
            <div key={r} style={{display:"flex"}}>
              {Array(BOARD_SIZE).fill(null).map((_,c)=>{
                const piece=board[r][c],ct=cellType(r,c),center=r===2&&c===2,corner=isSafe(r,c)&&!center;
                const isLF=lastFrom&&lastFrom[0]===r&&lastFrom[1]===c&&phase==="movement";
                const isLockedDim=locked&&!(locked[0]===r&&locked[1]===c)&&piece===cur&&phase==="movement";
                let cellBg,cellBorder;
                if(center){cellBg="rgba(212,168,67,0.07)";cellBorder="rgba(212,168,67,0.3)";}
                else if(corner){cellBg="rgba(212,168,67,0.04)";cellBorder="rgba(212,168,67,0.22)";}
                else if(isLF){cellBg="rgba(120,180,80,0.09)";cellBorder="rgba(140,200,80,0.28)";}
                else if(ct==="sika-piece"||ct==="sika-cell"){cellBg="rgba(200,80,20,0.09)";cellBorder="rgba(220,100,40,0.3)";}
                else{cellBg=(r+c)%2===0?"rgba(255,255,255,0.02)":"rgba(0,0,0,0.11)";cellBorder="rgba(212,168,67,0.06)";}
                return(
                  <div key={c} className={ct==="valid"?"vm-cell":ct==="sika-piece"||ct==="sika-cell"?"sika-cell":""}
                    onClick={()=>phase==="placement"?handlePlacement(r,c):handleMovement(r,c)}
                    style={{width:CELL,height:CELL,display:"flex",alignItems:"center",justifyContent:"center",position:"relative",cursor:"pointer",background:cellBg,border:`1px solid ${cellBorder}`,borderRadius:4,boxSizing:"border-box",opacity:isLockedDim?.3:1,transition:"opacity .3s,background .2s"}}>
                    {corner&&<div style={{position:"absolute",inset:3,borderRadius:3,border:"1px solid rgba(212,168,67,0.18)",pointerEvents:"none",zIndex:1}}/>}
                    {center&&(<div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",pointerEvents:"none",zIndex:1}}><div style={{width:28,height:28,borderRadius:"50%",background:"radial-gradient(circle,rgba(212,168,67,0.18),rgba(212,168,67,0.03))",border:"1px solid rgba(212,168,67,0.3)",animation:"centerGlow 3s ease-in-out infinite",display:"flex",alignItems:"center",justifyContent:"center"}}><div style={{width:13,height:13,background:"rgba(212,168,67,0.5)",clipPath:"polygon(50% 0%,61% 35%,98% 35%,68% 57%,79% 91%,50% 70%,21% 91%,32% 57%,2% 35%,39% 35%)",animation:"starSpin 8s linear infinite"}}/></div></div>)}
                    {ct==="valid"&&!piece&&<div style={{position:"absolute",width:10,height:10,borderRadius:"50%",background:"rgba(212,168,67,0.4)",border:"1px solid rgba(212,168,67,0.7)",zIndex:2,pointerEvents:"none"}}/>}
                    {hintCell&&hintCell[0]===r&&hintCell[1]===c&&<div style={{position:"absolute",inset:0,borderRadius:4,background:"rgba(100,220,100,0.2)",border:"2px solid rgba(100,220,100,0.7)",boxShadow:"0 0 12px rgba(100,220,100,0.5)",zIndex:4,pointerEvents:"none",animation:"pulse 0.5s infinite"}}/>}
                    {isCap(r,c)&&<div style={{position:"absolute",inset:0,borderRadius:4,background:"rgba(220,60,40,0.16)",animation:"capFlash .4s ease",zIndex:1,pointerEvents:"none"}}/>}
                    {piece&&<div style={{zIndex:3,position:"relative"}} className={isShake(r,c)?"piece-shake":""}><Piece color={piece} sel={isSel(r,c)} dropping={isAnim(r,c)} size={PS} theme={pieceTheme||"classic"}/></div>}
                  </div>
                );
              })}
            </div>
          ))}
        </div>

      </div>

      {/* ── 4. Controls ── */}
      <div style={{display:"flex",gap:6,alignItems:"center",flexWrap:"wrap",justifyContent:"center"}}>
        {["placement","movement"].map(ph=>(<div key={ph} style={{padding:"3px 9px",borderRadius:20,background:phase===ph?"rgba(212,168,67,0.13)":"transparent",border:`1px solid ${phase===ph?"rgba(212,168,67,0.35)":"rgba(212,168,67,0.07)"}`,color:phase===ph?"#C8A96E":"#3a2810",fontFamily:"'Cairo',sans-serif",fontSize:"0.66rem"}}>{ph==="placement"?"التوزيع":"الحركة"}</div>))}
        {locked&&!winner&&phase==="movement"&&(!isVsAI||cur!==aiPlayer)&&(<button onClick={endMyTurn} style={{padding:"3px 10px",borderRadius:20,background:"rgba(80,180,80,0.15)",border:"1px solid rgba(100,200,100,0.35)",color:"#90e090",fontFamily:"'Cairo',sans-serif",fontSize:"0.66rem",cursor:"pointer"}}>✅ أنهِ دوري</button>)}
        {sikaState==="waiting"&&!winner&&(<button onClick={pressSika} style={{padding:"3px 10px",borderRadius:20,background:"linear-gradient(135deg,rgba(200,60,20,0.45),rgba(150,40,10,0.3))",border:"1px solid rgba(220,100,40,0.45)",color:"#ffb080",fontFamily:"'Cairo',sans-serif",fontSize:"0.68rem",cursor:"pointer",fontWeight:700,animation:"sikaBeat 1s infinite"}}>🚪 طلب سكة</button>)}
        {phase==="movement"&&!winner&&(!isVsAI||cur!==aiPlayer)&&(
          <button onClick={getHint} style={{padding:"3px 9px",borderRadius:20,background:"rgba(100,200,100,0.1)",border:"1px solid rgba(100,200,100,0.25)",color:"#80d080",fontFamily:"'Cairo',sans-serif",fontSize:"0.66rem",cursor:"pointer"}}>💡 تلميح</button>
        )}
        <button onClick={undoMove} disabled={history.length===0||!!winner} style={{padding:"3px 9px",borderRadius:20,background:history.length>0&&!winner?"rgba(100,160,220,0.1)":"rgba(255,255,255,0.02)",border:`1px solid ${history.length>0&&!winner?"rgba(100,160,220,0.3)":"rgba(255,255,255,0.03)"}`,color:history.length>0&&!winner?"#90c0f0":"#2a2010",fontFamily:"'Cairo',sans-serif",fontSize:"0.66rem",cursor:history.length>0&&!winner?"pointer":"not-allowed"}}>↩️ رجوع</button>
        <button onClick={resetGame} style={{padding:"3px 9px",borderRadius:20,background:"rgba(212,168,67,0.07)",border:"1px solid rgba(212,168,67,0.15)",color:"#C8A96E",fontFamily:"'Cairo',sans-serif",fontSize:"0.66rem",cursor:"pointer"}}>🔄 جديد</button>
        <button onClick={onBack} style={{padding:"3px 9px",borderRadius:20,background:"transparent",border:"1px solid rgba(212,168,67,0.06)",color:"#3a2810",fontFamily:"'Cairo',sans-serif",fontSize:"0.66rem",cursor:"pointer"}}>← رجوع</button>
      </div>

      {phase==="placement"&&!winner&&(<div style={{display:"flex",gap:5,alignItems:"center"}}>{[0,1].map(i=>(<div key={i} style={{width:16,height:16,borderRadius:"50%",background:i<turnCount?(cur===WHITE?"radial-gradient(circle at 32% 28%,#FFFFF0,#C8A96E)":"radial-gradient(circle at 32% 28%,#4a4a4a,#000)"):"rgba(212,168,67,0.07)",border:i<turnCount?"1.5px solid rgba(212,168,67,0.45)":"1px solid rgba(212,168,67,0.07)",transition:"all .3s"}}/>))}<span style={{color:"#4a3810",fontFamily:"'Cairo',sans-serif",fontSize:"0.62rem"}}>{turnCount<2?`ضع ${2-turnCount} حجر${2-turnCount===2?"ين":""}`: "ينتقل..."}</span></div>)}
    </div>
  );
}



// ── Avatar SVG Components ──────────────────────────────────
const AvatarMale = ({size=34}) => (
  <svg width={size} height={size} viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
    <circle cx="50" cy="30" r="22" fill="#C8A96E"/>
    <circle cx="42" cy="26" r="4" fill="#3a2010"/>
    <circle cx="58" cy="26" r="4" fill="#3a2010"/>
    <circle cx="43" cy="25" r="1.5" fill="white"/>
    <circle cx="59" cy="25" r="1.5" fill="white"/>
    <path d="M42 38 Q50 44 58 38" stroke="#3a2010" strokeWidth="2.5" fill="none" strokeLinecap="round"/>
    <path d="M28 28 Q28 8 50 8 Q72 8 72 28" fill="#5a3010"/>
    <rect x="20" y="56" width="60" height="38" rx="12" fill="#d4a843"/>
    <rect x="20" y="56" width="60" height="16" rx="8" fill="#b08030"/>
    <rect x="15" y="58" width="18" height="32" rx="9" fill="#C8A96E"/>
    <rect x="67" y="58" width="18" height="32" rx="9" fill="#C8A96E"/>
  </svg>
);

const AvatarFemale = ({size=34}) => (
  <svg width={size} height={size} viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
    <circle cx="50" cy="30" r="22" fill="#E8C49A"/>
    <circle cx="42" cy="26" r="4" fill="#3a2010"/>
    <circle cx="58" cy="26" r="4" fill="#3a2010"/>
    <circle cx="43" cy="25" r="1.5" fill="white"/>
    <circle cx="59" cy="25" r="1.5" fill="white"/>
    <path d="M42 38 Q50 45 58 38" stroke="#3a2010" strokeWidth="2.5" fill="none" strokeLinecap="round"/>
    <path d="M28 20 Q30 4 50 4 Q70 4 72 20 Q65 10 50 12 Q35 10 28 20Z" fill="#3a1800"/>
    <path d="M28 22 Q24 35 30 42 Q28 30 28 22Z" fill="#3a1800"/>
    <path d="M72 22 Q76 35 70 42 Q72 30 72 22Z" fill="#3a1800"/>
    <rect x="22" y="56" width="56" height="36" rx="12" fill="#d4768a"/>
    <rect x="22" y="56" width="56" height="14" rx="8" fill="#b05068"/>
    <rect x="14" y="58" width="18" height="30" rx="9" fill="#E8C49A"/>
    <rect x="68" y="58" width="18" height="30" rx="9" fill="#E8C49A"/>
  </svg>
);

const Avatar = ({type="male",size=34}) => type==="female" ? <AvatarFemale size={size}/> : <AvatarMale size={size}/>;


// ── Firebase DB helpers ────────────────────────────────────
const DB_URL="https://seja-game-498119-da6a3-default-rtdb.firebaseio.com";
async function dbSet(path,data){await fetch(`${DB_URL}/${path}.json`,{method:"PUT",body:JSON.stringify(data),headers:{"Content-Type":"application/json"}});}
async function dbGet(path){const r=await fetch(`${DB_URL}/${path}.json`);return r.json();}
async function dbUpdate(path,data){await fetch(`${DB_URL}/${path}.json`,{method:"PATCH",body:JSON.stringify(data),headers:{"Content-Type":"application/json"}});}
function genCode(){return Math.random().toString(36).substring(2,8).toUpperCase();}

// ── Online Board ───────────────────────────────────────────
function OnlineBoard({roomId,myColor,playerName,onLeave}){
  const [gs,setGs]=useState(null);
  const [sel,setSel]=useState(null);
  const [vmoves,setVmoves]=useState([]);
  const [anim,setAnim]=useState([]);
  const [lastCaps,setLastCaps]=useState([]);
  const vRef=useRef(null);
  const CELL=58,PS=42;
  useEffect(()=>{
    const poll=async()=>{
      try{
        const r=await fetch(`${DB_URL}/rooms/${roomId}.json`);
        const data=await r.json();
        if(!data)return;
        if(data.version!==vRef.current){vRef.current=data.version;setGs(data);}
      }catch(e){}
    };
    poll();const t=setInterval(poll,1200);return()=>clearInterval(t);
  },[roomId]);
  const isMyTurn=gs?.currentPlayer===myColor&&!gs?.winner;
  // Firebase يخزن arrays كـ objects، نحتاج نحولها
  const rawBoard = gs?.board;
  const board = rawBoard
    ? Object.values(rawBoard).map(row =>
        row ? Object.values(row).map(cell => cell || null) : Array(BOARD_SIZE).fill(null)
      )
    : emptyBoard();
  const handleCell=async(r,c)=>{
    if(!isMyTurn||!gs)return;
    if(gs.phase==="placement"){
      if(board[r][c]!==EMPTY||(r===2&&c===2))return;
      const placedObj=gs.placed||{};
      const myPlaced=placedObj[myColor]||0,turnPlaced=gs.turnPlaced||0;
      if(myPlaced>=12||turnPlaced>=2)return;
      const nb=board.map(row=>[...row]);nb[r][c]=myColor;
      const newPlaced={...(gs.placed||{}),[myColor]:myPlaced+1};
      const newTurn=turnPlaced+1;
      let nextPlayer=myColor,nextTurn=newTurn,newPhase="placement";
      if(newTurn>=2){nextPlayer=other(myColor);nextTurn=0;const total=(newPlaced[WHITE]||0)+(newPlaced[BLACK]||0);if(total>=24){newPhase="movement";nextPlayer=other(gs.firstPlacer||myColor);}}
      await dbUpdate(`rooms/${roomId}`,{board:nb,placed:newPlaced,turnPlaced:nextTurn,currentPlayer:nextPlayer,phase:newPhase,firstPlacer:gs.firstPlacer||myColor,version:(gs.version||0)+1});
      setAnim([[r,c]]);setTimeout(()=>setAnim([]),400);
    } else {
      if(sel){
        const valid=vmoves.some(([mr,mc])=>mr===r&&mc===c);
        if(valid){
          const nb=board.map(row=>[...row]);const caps=getCaptures(board,sel[0],sel[1],r,c);
          nb[r][c]=myColor;nb[sel[0]][sel[1]]=EMPTY;for(const[cr,cc]of caps)nb[cr][cc]=EMPTY;
          setSel(null);setVmoves([]);setLastCaps(caps);setAnim([[r,c]]);setTimeout(()=>setAnim([]),400);
          const winner=checkWin(nb,myColor);const hasMore=caps.length>0&&getCaptureMoves(nb,r,c).length>0;
          await dbUpdate(`rooms/${roomId}`,{board:nb,currentPlayer:winner?null:hasMore?myColor:other(myColor),winner:winner||null,locked:hasMore?[r,c]:null,version:(gs.version||0)+1});
        } else if(board[r][c]===myColor){setSel([r,c]);setVmoves(getValidMoves(board,r,c));}
        else{setSel(null);setVmoves([]);}
      } else if(board[r][c]===myColor){
        const locked=gs.locked;if(locked&&!(locked[0]===r&&locked[1]===c))return;
        setSel([r,c]);setVmoves(getValidMoves(board,r,c));
      }
    }
  };
  const isSel=(r,c)=>sel&&sel[0]===r&&sel[1]===c;
  const isVM=(r,c)=>vmoves.some(([mr,mc])=>mr===r&&mc===c);
  const isCap=(r,c)=>lastCaps.some(([cr,cc])=>cr===r&&cc===c);
  const isAnim=(r,c)=>anim.some(([ar,ac])=>ar===r&&ac===c);
  const oppColor=other(myColor);
  const placedData=gs?.placed||{};
  const myInHand=12-(placedData[myColor]||0),oppInHand=12-(placedData[oppColor]||0);
  const myOnBoard=countPieces(board,myColor),oppOnBoard=countPieces(board,oppColor);
  let msg="يتم التحميل...";
  if(gs){if(gs.winner)msg=gs.winner===myColor?"🏆 فزت!":"💔 خسرت!";else if(isMyTurn)msg=gs.phase==="placement"?`دورك ← ضع حجرين (${myInHand} يد)`:"دورك ← حرك حجراً";else msg="⏳ دور خصمك...";}
  return(
    <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:9,width:"100%",maxWidth:420}}>
      <div style={{background:"rgba(0,0,0,0.3)",border:"1px solid rgba(212,168,67,0.2)",borderRadius:10,padding:"5px 16px"}}>
        <span style={{color:"#5a4020",fontFamily:"'Cairo',sans-serif",fontSize:"0.6rem"}}>كود: </span>
        <span style={{color:"#f5d78a",fontFamily:"monospace",fontSize:"0.95rem",fontWeight:700,letterSpacing:4}}>{roomId}</span>
      </div>
      <div style={{display:"flex",width:"100%",gap:8}}>
        {[[myColor,playerName,myInHand,myOnBoard],[oppColor,"الخصم",oppInHand,oppOnBoard]].map(([color,name,inHand,onBoard],i)=>{
          const active=gs?.currentPlayer===color;
          return(<div key={i} style={{flex:1,padding:"7px 10px",borderRadius:12,background:active?"linear-gradient(135deg,rgba(212,168,67,0.12),rgba(180,130,40,0.06))":"rgba(0,0,0,0.2)",border:`1.5px solid ${active?"rgba(212,168,67,0.5)":"rgba(212,168,67,0.08)"}`,display:"flex",alignItems:"center",gap:7}}>
            <div style={{width:22,height:22,borderRadius:"50%",flexShrink:0,background:color===WHITE?"radial-gradient(circle at 32% 28%,#FFFFF0,#C8A96E)":"radial-gradient(circle at 32% 28%,#484848,#000)",border:color===WHITE?"1.5px solid #B89850":"1.5px solid #333"}}/>
            <div style={{flex:1}}>
              <div style={{color:active?"#C8A96E":"#4a3010",fontFamily:"'Cairo',sans-serif",fontSize:"0.58rem",fontWeight:700}}>{name}{active?" ●":""}</div>
              <div style={{display:"flex",flexWrap:"wrap",gap:1.5,marginTop:2}}>{Array(12).fill(null).map((_,j)=>(<div key={j} style={{width:6,height:6,borderRadius:"50%",background:j<inHand?(color===WHITE?"radial-gradient(circle,#FFFFF0,#C8A96E)":"radial-gradient(circle,#484848,#000)"):"rgba(255,255,255,0.04)",border:j<inHand?(color===WHITE?"1px solid #B89850":"1px solid #333"):"none"}}/>))}</div>
              <div style={{color:"#3a2810",fontFamily:"'Cairo',sans-serif",fontSize:"0.48rem",marginTop:1}}>{inHand} يد | {onBoard} لوح</div>
            </div>
          </div>);
        })}
      </div>
      <div style={{background:gs?.winner?"linear-gradient(135deg,rgba(212,168,67,0.2),rgba(160,100,20,0.15))":"rgba(0,0,0,0.3)",border:`1px solid ${gs?.winner?"rgba(212,168,67,0.5)":"rgba(212,168,67,0.12)"}`,borderRadius:10,padding:"7px 16px",color:gs?.winner?"#f5d78a":isMyTurn?"#C8A96E":"#5a4020",fontFamily:"'Cairo',sans-serif",fontSize:"0.82rem",textAlign:"center",width:"100%"}}>{msg}</div>
      <div style={{background:"linear-gradient(145deg,#2C1F0E,#1E1509)",border:"3px solid rgba(212,168,67,0.2)",borderRadius:12,padding:8,boxShadow:"0 20px 60px rgba(0,0,0,0.8)",opacity:!gs?0.5:1,position:"relative"}}>
        {[{top:5,right:5},{top:5,left:5},{bottom:5,right:5},{bottom:5,left:5}].map((s,i)=>(<div key={i} style={{position:"absolute",width:13,height:13,...s,borderTop:[0,1].includes(i)?"1.5px solid rgba(212,168,67,0.35)":"none",borderBottom:[2,3].includes(i)?"1.5px solid rgba(212,168,67,0.35)":"none",borderRight:[0,2].includes(i)?"1.5px solid rgba(212,168,67,0.35)":"none",borderLeft:[1,3].includes(i)?"1.5px solid rgba(212,168,67,0.35)":"none"}}/>))}
        {Array(BOARD_SIZE).fill(null).map((_,r)=>(<div key={r} style={{display:"flex"}}>{Array(BOARD_SIZE).fill(null).map((_,c)=>{
          const piece=board[r][c],center=r===2&&c===2,safe=isSafe(r,c),vm=isVM(r,c);
          let bg=(r+c)%2===0?"rgba(255,255,255,0.025)":"rgba(0,0,0,0.12)",border="rgba(212,168,67,0.07)";
          if(center){bg="rgba(212,168,67,0.08)";border="rgba(212,168,67,0.3)";}else if(safe){bg="rgba(212,168,67,0.04)";border="rgba(212,168,67,0.2)";}
          if(vm&&!piece){bg="rgba(212,168,67,0.15)";border="rgba(212,168,67,0.6)";}
          if(isCap(r,c)){bg="rgba(255,50,50,0.18)";}
          return(<div key={c} onClick={()=>handleCell(r,c)} style={{width:CELL,height:CELL,display:"flex",alignItems:"center",justifyContent:"center",position:"relative",cursor:isMyTurn?"pointer":"default",background:bg,border:`1px solid ${border}`,borderRadius:3,boxSizing:"border-box"}}>
            {center&&!piece&&<div style={{width:12,height:12,background:"rgba(212,168,67,0.5)",clipPath:"polygon(50% 0%,61% 35%,98% 35%,68% 57%,79% 91%,50% 70%,21% 91%,32% 57%,2% 35%,39% 35%)"}}/>}
            {safe&&!center&&!piece&&<div style={{position:"absolute",inset:3,borderRadius:3,border:"1px solid rgba(212,168,67,0.18)",pointerEvents:"none"}}/>}
            {vm&&!piece&&<div style={{position:"absolute",width:10,height:10,borderRadius:"50%",background:"rgba(212,168,67,0.4)",border:"1px solid rgba(212,168,67,0.8)",animation:"vmP .85s infinite"}}/>}
            {piece&&<div className={isAnim(r,c)?"piece-drop":""} style={{zIndex:3,width:PS,height:PS,borderRadius:"50%",position:"relative",overflow:"hidden",background:piece===WHITE?"radial-gradient(circle at 32% 28%,#FFFFF0,#E8D9A8,#C8A96E)":"radial-gradient(circle at 32% 28%,#484848,#1a1a1a,#000)",border:isSel(r,c)?"3px solid #f5d78a":piece===WHITE?"1.5px solid #B89850":"1.5px solid #404040",boxShadow:isSel(r,c)?"0 0 0 3px rgba(212,168,67,0.3)":piece===WHITE?"0 4px 12px rgba(0,0,0,0.5)":"0 4px 12px rgba(0,0,0,0.7)"}}><div style={{position:"absolute",top:"10%",left:"15%",width:"35%",height:"25%",borderRadius:"50%",background:piece===WHITE?"rgba(255,255,255,0.7)":"rgba(255,255,255,0.15)",filter:"blur(2px)"}}/></div>}
          </div>);
        })}</div>))}
      </div>
      <button onClick={onLeave} style={{padding:"6px 20px",borderRadius:20,background:"rgba(200,50,50,0.15)",border:"1px solid rgba(200,50,50,0.3)",color:"#e08080",fontFamily:"'Cairo',sans-serif",fontSize:"0.72rem",cursor:"pointer"}}>🚪 مغادرة</button>
      <style>{`@keyframes vmP{0%,100%{transform:scale(1)}50%{transform:scale(1.25)}} @keyframes piece-drop{0%{transform:scale(0)rotate(-180deg);opacity:0}100%{transform:scale(1)rotate(0);opacity:1}} .piece-drop{animation:piece-drop .4s cubic-bezier(.34,1.56,.64,1) forwards;}`}</style>
    </div>
  );
}

function OnlineLobby({playerName,onBack}){
  const [screen,setScreen]=useState("lobby");
  const [roomId,setRoomId]=useState("");
  const [joinCode,setJoinCode]=useState("");
  const [myColor,setMyColor]=useState(WHITE);
  const [error,setError]=useState("");
  const pollRef=useRef(null);
  const [loading,setLoading]=useState(false);

  const createRoom=async()=>{
    if(loading) return;
    setLoading(true);
    setError("");
    try{
      const code=genCode();
      const initData={
        board:emptyBoard(),
        phase:"placement",
        currentPlayer:WHITE,
        placed:{white:0,black:0},
        turnPlaced:0,
        firstPlacer:null,
        winner:null,
        locked:null,
        players:{white:playerName,black:null},
        version:0
      };
      const res=await fetch(`${DB_URL}/rooms/${code}.json`,{
        method:"PUT",
        body:JSON.stringify(initData),
        headers:{"Content-Type":"application/json"}
      });
      if(!res.ok){setError("فشل الاتصال بالخادم");setLoading(false);return;}
      setRoomId(code);setMyColor(WHITE);setScreen("waiting");
      pollRef.current=setInterval(async()=>{
        try{
          const r=await fetch(`${DB_URL}/rooms/${code}/players/black.json`);
          const val=await r.json();
          if(val&&val!==null){clearInterval(pollRef.current);setScreen("game");}
        }catch(e){}
      },1500);
    }catch(e){
      setError("تأكد من اتصال الإنترنت");
    }
    setLoading(false);
  };
  const joinRoom=async()=>{
    const code=joinCode.toUpperCase().trim();
    if(!code||code.length<4){setError("أدخل كود صحيح");return;}
    if(loading)return;
    setLoading(true);setError("");
    try{
      const r=await fetch(`${DB_URL}/rooms/${code}.json`);
      const data=await r.json();
      if(!data){setError("الغرفة غير موجودة!");setLoading(false);return;}
      if(data?.players?.black&&data.players.black!==null){setError("الغرفة ممتلئة!");setLoading(false);return;}
      await fetch(`${DB_URL}/rooms/${code}/players/black.json`,{
        method:"PUT",body:JSON.stringify(playerName),
        headers:{"Content-Type":"application/json"}
      });
      setRoomId(code);setMyColor(BLACK);setScreen("game");
    }catch(e){setError("تأكد من اتصال الإنترنت");}
    setLoading(false);
  };
  useEffect(()=>()=>clearInterval(pollRef.current),[]);
  const card={width:"100%",background:"linear-gradient(145deg,rgba(30,20,8,0.95),rgba(15,10,3,0.98))",border:"1.5px solid rgba(212,168,67,0.2)",borderRadius:16,padding:"16px 14px"};
  const btn=(p=true)=>({width:"100%",padding:"11px",borderRadius:12,cursor:"pointer",fontWeight:700,fontFamily:"'Cairo',sans-serif",fontSize:"0.82rem",background:p?"linear-gradient(135deg,rgba(212,168,67,0.2),rgba(160,100,20,0.14))":"rgba(0,0,0,0.3)",border:`1.5px solid ${p?"rgba(212,168,67,0.5)":"rgba(212,168,67,0.1)"}`,color:p?"#f5d78a":"#5a4020"});
  if(screen==="game")return <OnlineBoard roomId={roomId} myColor={myColor} playerName={playerName} onLeave={()=>{setScreen("lobby");setRoomId("");}}/>;
  if(screen==="waiting")return(
    <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:12,width:"100%"}}>
      <div style={{...card,textAlign:"center"}}>
        <div style={{fontSize:"2rem",marginBottom:8}}>⏳</div>
        <h3 style={{color:"#C8A96E",fontFamily:"'Amiri',serif",fontSize:"1rem",margin:"0 0 6px"}}>انتظر خصمك</h3>
        <p style={{color:"#5a4020",fontFamily:"'Cairo',sans-serif",fontSize:"0.68rem",margin:"0 0 12px"}}>شارك الكود مع صديقك</p>
        <div style={{background:"rgba(212,168,67,0.08)",border:"2px dashed rgba(212,168,67,0.3)",borderRadius:12,padding:"12px",marginBottom:12}}>
          <div style={{color:"#5a4020",fontFamily:"'Cairo',sans-serif",fontSize:"0.58rem",marginBottom:4}}>كود الغرفة</div>
          <div style={{color:"#f5d78a",fontFamily:"monospace",fontSize:"2rem",fontWeight:700,letterSpacing:8}}>{roomId}</div>
        </div>
        <div style={{display:"flex",gap:8,justifyContent:"center"}}>{[0,1,2].map(i=><div key={i} style={{width:8,height:8,borderRadius:"50%",background:"rgba(212,168,67,0.5)",animation:`dotP ${0.8+i*0.2}s ${i*0.15}s infinite`}}/>)}</div>
      </div>
      <button onClick={()=>{clearInterval(pollRef.current);dbSet(`rooms/${roomId}`,null);setScreen("lobby");}} style={{...btn(false),width:"auto",padding:"6px 18px"}}>إلغاء</button>
      <style>{`@keyframes dotP{0%,100%{transform:scale(1)}50%{transform:scale(1.4)}}`}</style>
    </div>
  );
  return(
    <div style={{display:"flex",flexDirection:"column",gap:12,width:"100%"}}>
      <div style={card}>
        <h4 style={{color:"#C8A96E",fontFamily:"'Cairo',sans-serif",fontSize:"0.76rem",margin:"0 0 8px",textAlign:"center"}}>🏠 إنشاء غرفة جديدة</h4>
        <p style={{color:"#5a4020",fontFamily:"'Cairo',sans-serif",fontSize:"0.62rem",margin:"0 0 10px",textAlign:"center"}}>أنشئ غرفة وشارك الكود مع صديقك</p>
        <button onClick={createRoom} disabled={loading} style={{...btn(),opacity:loading?0.6:1}}>
          {loading?"جاري الإنشاء...":"+ إنشاء غرفة"}
        </button>
      </div>
      <div style={card}>
        <h4 style={{color:"#C8A96E",fontFamily:"'Cairo',sans-serif",fontSize:"0.76rem",margin:"0 0 8px",textAlign:"center"}}>🔗 انضم لغرفة</h4>
        <div style={{color:"#6a4820",fontFamily:"'Cairo',sans-serif",fontSize:"0.65rem",marginBottom:5}}>أدخل كود الغرفة</div>
        <input value={joinCode} onChange={e=>{setJoinCode(e.target.value.toUpperCase());setError("");}} placeholder="XXXXXX" maxLength={6}
          style={{width:"100%",padding:"9px",borderRadius:10,background:"rgba(0,0,0,0.4)",border:"1px solid rgba(212,168,67,0.3)",color:"#C8A96E",fontFamily:"monospace",fontSize:"1.1rem",textAlign:"center",outline:"none",letterSpacing:4,boxSizing:"border-box"}}/>
        {error&&<div style={{color:"#ff6060",fontFamily:"'Cairo',sans-serif",fontSize:"0.62rem",marginTop:5,textAlign:"center"}}>{error}</div>}
        <button onClick={joinRoom} disabled={loading} style={{...btn(),marginTop:9,opacity:loading?0.6:1}}>
          {loading?"جاري الانضمام...":"انضم ←"}
        </button>
      </div>
      <button onClick={onBack} style={{...btn(false),width:"auto",padding:"6px 18px",alignSelf:"center"}}>← رجوع</button>
    </div>
  );
}

// ── PROFILE SCREEN ─────────────────────────────────────────
function ProfileScreen({profile,onEditName,onBack}){
  const [editing,setEditing]=useState(false);
  const [name,setName]=useState(profile.playerName||"لاعب");
  const lvl=getPlayerLevel(profile.totalPoints||0);
  const nextLvl=getPlayerLevel((profile.totalPoints||0)+1);

  const lvlThresholds=[0,100,300,600,1200,2500,999999];
  const curIdx=lvlThresholds.findIndex(t=>t>(profile.totalPoints||0))-1;
  const curThresh=lvlThresholds[Math.max(0,curIdx)];
  const nextThresh=lvlThresholds[Math.min(lvlThresholds.length-1,curIdx+1)];
  const progress=nextThresh>curThresh?Math.min(100,((profile.totalPoints||0)-curThresh)/(nextThresh-curThresh)*100):100;

  return(
    <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:14,width:"100%",maxWidth:320}}>
      {/* Avatar + Name */}
      <div style={{textAlign:"center"}}>
        {/* شخصية واحدة كبيرة مع زري الاختيار */}
        <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:8,marginBottom:6}}>
          <div style={{
            width:76,height:76,borderRadius:"50%",
            background:"linear-gradient(135deg,rgba(212,168,67,0.2),rgba(100,60,10,0.12))",
            border:"2.5px solid rgba(212,168,67,0.55)",
            display:"flex",alignItems:"center",justifyContent:"center",
            boxShadow:"0 0 20px rgba(212,168,67,0.2)",
            animation:"float 3s ease-in-out infinite",
          }}>
            <Avatar type={profile.avatarType||"male"} size={52}/>
          </div>
          <div style={{display:"flex",gap:8}}>
            {[{type:"male",label:"👨 رجل"},{type:"female",label:"👩 امرأة"}].map(({type,label})=>{
              const sel=(profile.avatarType||"male")===type;
              return(
                <button key={type} onClick={()=>onEditName(profile.playerName||"لاعب",type)} style={{
                  padding:"5px 16px",borderRadius:20,cursor:"pointer",
                  background:sel?"linear-gradient(135deg,rgba(212,168,67,0.28),rgba(100,60,10,0.18))":"rgba(0,0,0,0.2)",
                  border:`1.5px solid ${sel?"rgba(212,168,67,0.65)":"rgba(212,168,67,0.08)"}`,
                  color:sel?"#f5d78a":"#3a2810",
                  fontFamily:"'Cairo',sans-serif",fontSize:"0.68rem",fontWeight:sel?700:400,
                  boxShadow:sel?"0 0 10px rgba(212,168,67,0.2)":"none",
                  transition:"all 0.25s",
                }}>
                  {label}
                </button>
              );
            })}
          </div>
        </div>
        {editing?(
          <div style={{display:"flex",gap:6,justifyContent:"center"}}>
            <input value={name} onChange={e=>setName(e.target.value)} maxLength={20}
              style={{background:"rgba(0,0,0,0.4)",border:"1px solid rgba(212,168,67,0.4)",borderRadius:8,padding:"4px 8px",color:"#C8A96E",fontFamily:"'Cairo',sans-serif",fontSize:"0.85rem",textAlign:"center",outline:"none",width:140}}/>
            <button onClick={()=>{onEditName(name);setEditing(false);}} style={{padding:"4px 10px",borderRadius:8,background:"rgba(212,168,67,0.2)",border:"1px solid rgba(212,168,67,0.4)",color:"#f5d78a",cursor:"pointer",fontFamily:"'Cairo',sans-serif",fontSize:"0.7rem"}}>✓</button>
          </div>
        ):(
          <div style={{display:"flex",alignItems:"center",gap:6,justifyContent:"center"}}>
            <span style={{color:"#C8A96E",fontFamily:"'Cairo',sans-serif",fontSize:"1rem",fontWeight:700}}>{profile.playerName||"لاعب"}</span>
            <button onClick={()=>setEditing(true)} style={{background:"none",border:"none",color:"#5a4020",cursor:"pointer",fontSize:"0.75rem"}}>✏️</button>
          </div>
        )}
        <div style={{color:lvl.color,fontFamily:"'Cairo',sans-serif",fontSize:"0.7rem",marginTop:3}}>{lvl.name}</div>
      </div>

      {/* Level progress */}
      <div style={{width:"100%",background:"rgba(0,0,0,0.3)",borderRadius:12,padding:"10px 14px",border:"1px solid rgba(212,168,67,0.1)"}}>
        <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}>
          <span style={{color:"#6a4820",fontFamily:"'Cairo',sans-serif",fontSize:"0.6rem"}}>{lvl.name}</span>
          <span style={{color:"#6a4820",fontFamily:"'Cairo',sans-serif",fontSize:"0.6rem"}}>{nextThresh<999999?nextLvl.name:"الحد الأقصى"}</span>
        </div>
        <div style={{height:6,background:"rgba(212,168,67,0.1)",borderRadius:3,overflow:"hidden"}}>
          <div style={{height:"100%",width:`${progress}%`,background:"linear-gradient(90deg,#d4a843,#f5d78a)",borderRadius:3,transition:"width 0.5s"}}/>
        </div>
        <div style={{textAlign:"center",marginTop:4,color:"#C8A96E",fontFamily:"'Cairo',sans-serif",fontSize:"0.6rem"}}>{profile.totalPoints||0} نقطة</div>
      </div>

      {/* Stats */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8,width:"100%"}}>
        {[
          {icon:"🏆",val:profile.wins||0,lbl:"انتصار"},
          {icon:"💔",val:profile.losses||0,lbl:"هزيمة"},
          {icon:"🎮",val:profile.gamesPlayed||0,lbl:"لعبة"},
          {icon:"🔥",val:profile.currentStreak||0,lbl:"متتالي"},
          {icon:"⚡",val:profile.bestStreak||0,lbl:"أفضل"},
          {icon:"⭐",val:profile.totalPoints||0,lbl:"نقطة"},
        ].map((s,i)=>(
          <div key={i} style={{background:"rgba(0,0,0,0.25)",border:"1px solid rgba(212,168,67,0.08)",borderRadius:10,padding:"8px 6px",textAlign:"center"}}>
            <div style={{fontSize:"1rem"}}>{s.icon}</div>
            <div style={{color:"#C8A96E",fontFamily:"'Cairo',sans-serif",fontSize:"0.82rem",fontWeight:700,lineHeight:1}}>{s.val}</div>
            <div style={{color:"#3a2810",fontFamily:"'Cairo',sans-serif",fontSize:"0.5rem",marginTop:2}}>{s.lbl}</div>
          </div>
        ))}
      </div>

      {/* Badges */}
      <div style={{width:"100%"}}>
        <div style={{color:"#8a6030",fontFamily:"'Cairo',sans-serif",fontSize:"0.65rem",marginBottom:8,textAlign:"center"}}>🏅 الشارات</div>
        <div style={{display:"flex",flexWrap:"wrap",gap:6,justifyContent:"center"}}>
          {BADGES.map(b=>{
            const earned=(profile.badges||[]).includes(b.id);
            return(
              <div key={b.id} title={b.desc} style={{
                width:44,height:44,borderRadius:"50%",
                display:"flex",alignItems:"center",justifyContent:"center",
                fontSize:"1.3rem",
                background:earned?"linear-gradient(135deg,rgba(212,168,67,0.25),rgba(100,60,10,0.15))":"rgba(0,0,0,0.3)",
                border:`1.5px solid ${earned?"rgba(212,168,67,0.5)":"rgba(212,168,67,0.08)"}`,
                opacity:earned?1:0.3,
                boxShadow:earned?"0 0 10px rgba(212,168,67,0.2)":"none",
                filter:earned?"none":"grayscale(1)",
              }}>{b.icon}</div>
            );
          })}
        </div>
      </div>

      <button onClick={onBack} style={{padding:"7px 24px",borderRadius:20,background:"rgba(212,168,67,0.08)",border:"1px solid rgba(212,168,67,0.2)",color:"#C8A96E",fontFamily:"'Cairo',sans-serif",fontSize:"0.75rem",cursor:"pointer"}}>← رجوع</button>
    </div>
  );
}

// ── MENU ───────────────────────────────────────────────────
function Menu({onSelect,scores,profile}){
  const [showRules,setShowRules]=useState(false);
  const modes=[
    {id:"vs-ai",icon:"🤖",title:"ضد الكمبيوتر",sub:"ذكاء اصطناعي استراتيجي"},
    {id:"2player",icon:"👥",title:"لاعبان",sub:"على نفس الجهاز"},
    {id:"online",icon:"🌐",title:"أونلاين",sub:"العب مع أصدقائك 🔥"},
  ];
  return(
    <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:12}}>
      {showRules&&<RulesModal onClose={()=>setShowRules(false)}/>}

      {/* Scores */}
      {/* بطاقة اللاعب */}
      {profile&&(()=>{
        const lvl=getPlayerLevel(profile.totalPoints||0);
        return(
          <div style={{width:"100%",maxWidth:260,background:"linear-gradient(135deg,rgba(212,168,67,0.1),rgba(100,60,10,0.07))",border:"1.5px solid rgba(212,168,67,0.2)",borderRadius:14,padding:"10px 14px",marginBottom:4,display:"flex",alignItems:"center",gap:10,backdropFilter:"blur(6px)",cursor:"pointer"}} onClick={()=>onSelect("profile")}>
            <div style={{width:38,height:38,borderRadius:"50%",background:"linear-gradient(135deg,rgba(212,168,67,0.3),rgba(100,60,10,0.2))",border:"2px solid rgba(212,168,67,0.4)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"1.3rem",flexShrink:0}}><Avatar type={profile.avatarType||"male"} size={26}/></div>
            <div style={{flex:1,minWidth:0}}>
              <div style={{color:"#C8A96E",fontFamily:"'Cairo',sans-serif",fontSize:"0.78rem",fontWeight:700,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{profile.playerName||"لاعب"}</div>
              <div style={{display:"flex",gap:8,marginTop:2}}>
                <span style={{color:lvl.color,fontFamily:"'Cairo',sans-serif",fontSize:"0.58rem"}}>{lvl.name}</span>
                <span style={{color:"#5a4020",fontFamily:"'Cairo',sans-serif",fontSize:"0.58rem"}}>🏆 {profile.wins||0}</span>
                <span style={{color:"#5a4020",fontFamily:"'Cairo',sans-serif",fontSize:"0.58rem"}}>⭐ {profile.totalPoints||0}</span>
              </div>
            </div>
            <div style={{color:"#3a2810",fontSize:"0.6rem"}}>←</div>
          </div>
        );
      })()}

      {modes.map(m=>(<button key={m.id} onClick={()=>onSelect(m.id)} style={{width:250,padding:"13px 18px",borderRadius:14,background:"linear-gradient(135deg,rgba(212,168,67,0.09),rgba(160,100,20,0.06))",border:"1.5px solid rgba(212,168,67,0.22)",color:"#C8A96E",fontFamily:"'Cairo',sans-serif",cursor:"pointer",display:"flex",alignItems:"center",gap:14,backdropFilter:"blur(8px)",transition:"all .25s",opacity:1}}
        onMouseEnter={e=>{if(m.id!=="online")e.currentTarget.style.background="linear-gradient(135deg,rgba(212,168,67,0.17),rgba(160,100,20,0.11))"}}
        onMouseLeave={e=>{if(m.id!=="online")e.currentTarget.style.background="linear-gradient(135deg,rgba(212,168,67,0.09),rgba(160,100,20,0.06))"}}>
        <span style={{fontSize:"1.6rem"}}>{m.icon}</span>
        <div style={{textAlign:"right"}}><div style={{fontWeight:700,fontSize:"0.88rem"}}>{m.title}</div><div style={{fontSize:"0.62rem",color:m.id==="online"?"#2a1808":"#6a4820",marginTop:2}}>{m.sub}</div></div>
      </button>))}

      {/* Buttons row */}
      <div style={{display:"flex",gap:8,marginTop:4}}>
        <button onClick={()=>setShowRules(true)} style={{flex:1,padding:"7px 14px",borderRadius:20,background:"rgba(212,168,67,0.08)",border:"1px solid rgba(212,168,67,0.2)",color:"#C8A96E",fontFamily:"'Cairo',sans-serif",fontSize:"0.75rem",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:6,backdropFilter:"blur(4px)"}}>
          📖 القوانين
        </button>
        <button onClick={()=>onSelect("tutorial")} style={{flex:1,padding:"7px 14px",borderRadius:20,background:"linear-gradient(135deg,rgba(212,168,67,0.15),rgba(160,100,20,0.1))",border:"1px solid rgba(212,168,67,0.35)",color:"#f5d78a",fontFamily:"'Cairo',sans-serif",fontSize:"0.75rem",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:6,backdropFilter:"blur(4px)"}}>
          🎓 تعلم اللعبة
        </button>
      </div>

      <div style={{display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:5,maxWidth:260,width:"100%",marginTop:2}}>
        {[{e:"🛡️",t:"5 مناطق أمان",d:"زوايا + المنتصف"},{e:"🍽️",t:"أكل اختياري",d:"للفخ والتكتيك"},{e:"🔁",t:"تكرار",d:"أكثر من 6× يُحكم بالأكثر"},{e:"🏆",t:"فوز",d:"حجر واحد أو 2 مقابل 6+"}].map((x,i)=>(<div key={i} style={{background:"rgba(0,0,0,0.18)",border:"1px solid rgba(212,168,67,0.07)",borderRadius:8,padding:"5px 7px",backdropFilter:"blur(4px)"}}><div style={{fontSize:"0.85rem"}}>{x.e}</div><div style={{color:"#7a5a28",fontFamily:"'Cairo',sans-serif",fontSize:"0.6rem",fontWeight:600}}>{x.t}</div><div style={{color:"#3a2810",fontFamily:"'Cairo',sans-serif",fontSize:"0.54rem",lineHeight:1.3}}>{x.d}</div></div>))}
      </div>
    </div>
  );
}

// ── COLOR PICK ─────────────────────────────────────────────
function ColorPick({onSelect,onBack}){
  const [selTheme,setSelTheme]=useState("classic");
  return(
    <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:16}}>
      <p style={{color:"rgba(212,168,67,0.5)",fontFamily:"'Cairo',sans-serif",fontSize:"0.88rem",margin:0}}>اختر لون حجارك</p>

      {/* اختيار الثيم */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:8,width:"100%",maxWidth:280}}>
        {Object.entries(PIECE_THEMES).map(([key,t])=>(
          <button key={key} onClick={()=>setSelTheme(key)} style={{padding:"10px 8px",borderRadius:12,
            background:selTheme===key?"linear-gradient(135deg,rgba(212,168,67,0.2),rgba(160,100,20,0.15))":"rgba(0,0,0,0.2)",
            border:`1.5px solid ${selTheme===key?"rgba(212,168,67,0.6)":"rgba(212,168,67,0.1)"}`,
            cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",gap:6,transition:"all .2s"}}>
            <div style={{display:"flex",gap:4}}>
              <div style={{width:22,height:22,borderRadius:"50%",background:t.white.bg,border:`1px solid ${t.white.border}`}}/>
              <div style={{width:22,height:22,borderRadius:"50%",background:t.black.bg,border:`1px solid ${t.black.border}`}}/>
            </div>
            <span style={{color:selTheme===key?"#C8A96E":"#5a4020",fontFamily:"'Cairo',sans-serif",fontSize:"0.68rem",fontWeight:600}}>{t.name}</span>
          </button>
        ))}
      </div>

      {/* اختيار اللون */}
      <p style={{color:"rgba(212,168,67,0.4)",fontFamily:"'Cairo',sans-serif",fontSize:"0.75rem",margin:"4px 0 0"}}>اختر لونك</p>
      <div style={{display:"flex",gap:14}}>
        {[WHITE,BLACK].map(color=>{
          const th=PIECE_THEMES[selTheme];
          const ts=color===WHITE?th.white:th.black;
          return(
          <button key={color} onClick={()=>onSelect(color,selTheme)} style={{width:110,padding:"14px 10px",borderRadius:14,
            background:"rgba(0,0,0,0.2)",border:`2px solid ${ts.border}`,
            cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",gap:8,backdropFilter:"blur(8px)",transition:"all .2s"}}
            onMouseEnter={e=>e.currentTarget.style.transform="scale(1.06)"}
            onMouseLeave={e=>e.currentTarget.style.transform="scale(1)"}>
            <div style={{width:44,height:44,borderRadius:"50%",background:ts.bg,border:`2px solid ${ts.selBorder}`,boxShadow:`0 4px 12px rgba(0,0,0,0.5),inset 0 1px 4px ${ts.shine}`}}/>
            <span style={{color:"#C8A96E",fontFamily:"'Cairo',sans-serif",fontSize:"0.75rem",fontWeight:700}}>
              {color===WHITE
                ? selTheme==="classic"?"عاجي":selTheme==="royal"?"أزرق":selTheme==="nature"?"أخضر":"بنفسجي"
                : selTheme==="classic"?"فحمي":selTheme==="royal"?"أحمر":selTheme==="nature"?"بني":"أزرق داكن"}
            </span>
            {color===WHITE&&<span style={{color:"#4a3010",fontFamily:"'Cairo',sans-serif",fontSize:"0.56rem"}}>يبدأ أول</span>}
          </button>
        );})}
      </div>
      <button onClick={onBack} style={{padding:"5px 16px",borderRadius:20,background:"transparent",border:"1px solid rgba(212,168,67,0.12)",color:"#4a3010",fontFamily:"'Cairo',sans-serif",fontSize:"0.7rem",cursor:"pointer"}}>← رجوع</button>
    </div>
  );
}

// ── AI LEVEL PICK ──────────────────────────────────────────
function LevelPick({onSelect,onBack}){
  const levels=[
    {id:"easy",  icon:"🌱",label:"مبتدئ",   desc:"حركات عشوائية"},
    {id:"medium",icon:"⚔️", label:"متوسط",   desc:"يفضل الأكل"},
    {id:"hard",  icon:"🧠", label:"احترافي", desc:"تحليل استراتيجي كامل"},
  ];
  return(
    <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:12}}>
      <p style={{color:"rgba(212,168,67,0.5)",fontFamily:"'Cairo',sans-serif",fontSize:"0.88rem",margin:0}}>اختر مستوى الكمبيوتر</p>
      {levels.map(l=>(
        <button key={l.id} onClick={()=>onSelect(l.id)} style={{width:220,padding:"12px 16px",borderRadius:14,background:"linear-gradient(135deg,rgba(212,168,67,0.08),rgba(160,100,20,0.05))",border:"1.5px solid rgba(212,168,67,0.2)",color:"#C8A96E",fontFamily:"'Cairo',sans-serif",cursor:"pointer",display:"flex",alignItems:"center",gap:12,backdropFilter:"blur(8px)",transition:"all .2s"}}
          onMouseEnter={e=>e.currentTarget.style.background="linear-gradient(135deg,rgba(212,168,67,0.15),rgba(160,100,20,0.1))"}
          onMouseLeave={e=>e.currentTarget.style.background="linear-gradient(135deg,rgba(212,168,67,0.08),rgba(160,100,20,0.05))"}>
          <span style={{fontSize:"1.5rem"}}>{l.icon}</span>
          <div style={{textAlign:"right"}}><div style={{fontWeight:700,fontSize:"0.86rem"}}>{l.label}</div><div style={{fontSize:"0.62rem",color:"#6a4820",marginTop:2}}>{l.desc}</div></div>
        </button>
      ))}
      <button onClick={onBack} style={{padding:"5px 16px",borderRadius:20,background:"transparent",border:"1px solid rgba(212,168,67,0.12)",color:"#4a3010",fontFamily:"'Cairo',sans-serif",fontSize:"0.7rem",cursor:"pointer"}}>← رجوع</button>
    </div>
  );
}

// ── ROOT ───────────────────────────────────────────────────
// ── حفظ وتحميل البيانات ──────────────────────────────────
function loadData() {
  try {
    const d = JSON.parse(localStorage.getItem("seja_data")||"{}");
    return {
      playerName: d.playerName || "لاعب",
      totalPoints: d.totalPoints || 0,
      wins: d.wins || 0,
      losses: d.losses || 0,
      gamesPlayed: d.gamesPlayed || 0,
      bestStreak: d.bestStreak || 0,
      currentStreak: d.currentStreak || 0,
      badges: d.badges || [],
    };
  } catch(e) { return {playerName:"لاعب",totalPoints:0,wins:0,losses:0,gamesPlayed:0,bestStreak:0,currentStreak:0,badges:[]}; }
}
function saveData(d) {
  try { localStorage.setItem("seja_data", JSON.stringify(d)); } catch(e){}
}

// ── شارات الإنجاز ─────────────────────────────────────────
const BADGES = [
  {id:"first_win",   icon:"🥇", name:"أول فوز",      desc:"افوز للمرة الأولى"},
  {id:"win5",        icon:"⭐", name:"5 انتصارات",    desc:"افوز 5 مرات"},
  {id:"win20",       icon:"🏆", name:"20 انتصاراً",   desc:"افوز 20 مرة"},
  {id:"streak3",     icon:"🔥", name:"3 متتاليات",    desc:"3 انتصارات متتالية"},
  {id:"streak5",     icon:"💥", name:"5 متتاليات",    desc:"5 انتصارات متتالية"},
  {id:"points500",   icon:"💎", name:"500 نقطة",       desc:"اجمع 500 نقطة"},
  {id:"points2000",  icon:"👑", name:"2000 نقطة",      desc:"اجمع 2000 نقطة"},
  {id:"pro_win",     icon:"🧠", name:"قهر المحترف",   desc:"افوز ضد مستوى احترافي"},
];

function checkBadges(data, reason) {
  const newBadges = [...(data.badges||[])];
  const add = (id) => { if(!newBadges.includes(id)) newBadges.push(id); };
  if(data.wins >= 1) add("first_win");
  if(data.wins >= 5) add("win5");
  if(data.wins >= 20) add("win20");
  if(data.currentStreak >= 3) add("streak3");
  if(data.currentStreak >= 5) add("streak5");
  if(data.totalPoints >= 500) add("points500");
  if(data.totalPoints >= 2000) add("points2000");
  if(reason==="pro_win") add("pro_win");
  return newBadges;
}

// ── مستوى اللاعب ──────────────────────────────────────────
function getPlayerLevel(pts) {
  if(pts < 100)  return {name:"مبتدئ",    icon:"🌱", color:"#6a8060"};
  if(pts < 300)  return {name:"متعلم",    icon:"📚", color:"#6a7090"};
  if(pts < 600)  return {name:"متوسط",    icon:"⚔️",  color:"#8a7040"};
  if(pts < 1200) return {name:"متقدم",    icon:"🎯", color:"#C8A96E"};
  if(pts < 2500) return {name:"خبير",     icon:"🏅", color:"#d4a843"};
  return              {name:"أسطورة",   icon:"👑", color:"#f5d78a"};
}

export default function AlSija(){
  const [screen, setScreen] = useState("menu");
  const [mode,   setMode]   = useState(null);
  const [playerColor,setPlayerColor] = useState(WHITE);
  const [pieceTheme,setPieceTheme] = useState("classic");
  const [aiLevel,setAiLevel] = useState("medium");
  const [scores, setScores] = useState({[WHITE]:0,[BLACK]:0});
  const [profile, setProfile] = useState(loadData);
  const [newBadge, setNewBadge] = useState(null); // شارة جديدة

  const addPoints=(player,pts)=>{
    setScores(s=>({...s,[player]:(s[player]||0)+pts}));
    if(player===playerColor){
      setProfile(prev=>{
        const updated={...prev,totalPoints:(prev.totalPoints||0)+pts};
        saveData(updated);
        return updated;
      });
    }
  };

  const recordWin=(isWinner,level)=>{
    setProfile(prev=>{
      const streak = isWinner ? (prev.currentStreak||0)+1 : 0;
      const updated={
        ...prev,
        wins: isWinner ? (prev.wins||0)+1 : prev.wins,
        losses: !isWinner ? (prev.losses||0)+1 : prev.losses,
        gamesPlayed: (prev.gamesPlayed||0)+1,
        currentStreak: streak,
        bestStreak: Math.max(streak, prev.bestStreak||0),
      };
      const reason = isWinner&&level==="hard"?"pro_win":null;
      const badges = checkBadges(updated, reason);
      // شارة جديدة؟
      const newOnes = badges.filter(b=>!(prev.badges||[]).includes(b));
      if(newOnes.length>0){
        const badge = BADGES.find(b=>b.id===newOnes[0]);
        if(badge) setTimeout(()=>{setNewBadge(badge);setTimeout(()=>setNewBadge(null),3000);},1000);
      }
      updated.badges = badges;
      saveData(updated);
      return updated;
    });
  };

  return(
    <div style={{minHeight:"100vh",background:"linear-gradient(160deg,#0F0A05 0%,#1A0F07 40%,#120B04 70%,#0A0602 100%)",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",fontFamily:"'Amiri','Cairo',serif",direction:"rtl",padding:16,userSelect:"none"}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Amiri:wght@400;700&family=Cairo:wght@400;600;700&display=swap');
        @keyframes pulse{0%,100%{transform:scale(1)}50%{transform:scale(1.25)}}
        @keyframes piece-drop{0%{transform:scale(0)rotate(-180deg);opacity:0}100%{transform:scale(1)rotate(0);opacity:1}}
        @keyframes piece-shake{0%,100%{transform:translateX(0)}20%{transform:translateX(-4px)}40%{transform:translateX(4px)}60%{transform:translateX(-2px)}80%{transform:translateX(2px)}}
        @keyframes shimmer{0%{background-position:200% center}100%{background-position:-200% center}}
        @keyframes beat{0%,100%{box-shadow:0 0 6px rgba(212,168,67,.5)}50%{box-shadow:0 0 16px rgba(212,168,67,.9)}}
        @keyframes sikaBeat{0%,100%{box-shadow:0 0 8px rgba(220,80,20,.4)}50%{box-shadow:0 0 20px rgba(220,80,20,.8)}}
        @keyframes centerGlow{0%,100%{box-shadow:0 0 8px rgba(212,168,67,.22)}50%{box-shadow:0 0 20px rgba(212,168,67,.5)}}
        @keyframes starSpin{0%{transform:rotate(0)}100%{transform:rotate(360deg)}}
        @keyframes capFlash{0%{opacity:1}100%{opacity:0}}
        @keyframes confettiFall{0%{transform:translateY(-20px)rotate(0);opacity:1}100%{transform:translateY(100vh)rotate(720deg);opacity:0}}
        @keyframes comboAnim{0%{transform:translateX(-50%)scale(0)}100%{transform:translateX(-50%)scale(1)}}
        .vm-cell{animation:pulse .85s infinite;cursor:pointer;}
        .sika-cell{animation:pulse .7s infinite;cursor:pointer;}
        .piece-drop{animation:piece-drop .4s cubic-bezier(.34,1.56,.64,1) forwards;}
        .piece-shake{animation:piece-shake .4s ease;}
        @keyframes badgeIn{0%{transform:translateX(-50%) translateY(-20px) scale(0.5);opacity:0}70%{transform:translateX(-50%) translateY(5px) scale(1.05)}100%{transform:translateX(-50%) translateY(0) scale(1);opacity:1}}
        @keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-6px)}}
      `}</style>
      {/* شارة جديدة */}
      {newBadge&&(
        <div style={{position:"fixed",top:60,left:"50%",zIndex:500,
          transform:"translateX(-50%)",
          background:"linear-gradient(135deg,rgba(212,168,67,0.95),rgba(140,90,10,0.95))",
          border:"2px solid #f5d78a",borderRadius:16,
          padding:"10px 20px",textAlign:"center",
          boxShadow:"0 0 30px rgba(212,168,67,0.5)",
          animation:"badgeIn 0.5s cubic-bezier(.34,1.56,.64,1)",
          pointerEvents:"none",
        }}>
          <div style={{fontSize:"1.8rem"}}>{newBadge.icon}</div>
          <div style={{color:"#fff",fontFamily:"'Cairo',sans-serif",fontSize:"0.7rem",fontWeight:700}}>شارة جديدة!</div>
          <div style={{color:"rgba(255,255,200,0.9)",fontFamily:"'Cairo',sans-serif",fontSize:"0.65rem"}}>{newBadge.name}</div>
        </div>
      )}

      {/* TITLE */}
      {screen!=="game" && (
      <div style={{marginBottom:screen==="menu"?20:12,textAlign:"center"}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:12}}>
          <span style={{color:"rgba(212,168,67,0.35)",fontFamily:"monospace",fontSize:"clamp(0.7rem,2vw,0.9rem)",letterSpacing:2}}>seja</span>
          <h1 style={{fontSize:"clamp(1.8rem,5vw,2.8rem)",margin:0,fontFamily:"'Amiri',serif",fontWeight:700,letterSpacing:2,background:"linear-gradient(135deg,#f5d78a,#d4a843,#a07030,#d4a843,#f5d78a)",backgroundSize:"300% auto",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",animation:"shimmer 5s linear infinite"}}>سيجة</h1>
          <span style={{color:"rgba(212,168,67,0.35)",fontFamily:"monospace",fontSize:"clamp(0.7rem,2vw,0.9rem)",letterSpacing:2}}>seja</span>
        </div>
        <p style={{color:"rgba(212,168,67,0.2)",fontSize:"0.58rem",margin:0,fontFamily:"'Cairo',sans-serif",letterSpacing:3}}>MODERN HERITAGE</p>
      </div>
      )}

      {screen==="menu" && <Menu onSelect={m=>{if(m==="tutorial"){setScreen("tutorial");}else if(m==="profile"){setScreen("profile");}else if(m==="online"){setScreen("online");}else{setMode(m);if(m==="vs-ai")setScreen("level");else{setScreen("color-2p");}}}} scores={scores} profile={profile}/>}
      {screen==="tutorial" && <Tutorial onFinish={()=>{setMode("vs-ai");setScreen("level");}} onBack={()=>setScreen("menu")}/>}
      {screen==="online" && (
        <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:14,width:"100%"}}>
          <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:14,maxWidth:300,width:"100%"}}>
            {/* Online Lobby */}
            <div style={{textAlign:"center"}}>
              <div style={{fontSize:"1.8rem"}}>🌐</div>
              <h3 style={{color:"#C8A96E",fontFamily:"'Amiri',serif",fontSize:"1rem",margin:"4px 0 2px"}}>اللعب أونلاين</h3>
              <p style={{color:"#3a2810",fontFamily:"'Cairo',sans-serif",fontSize:"0.62rem",margin:0}}>العب مع أصدقائك في أي مكان</p>
            </div>
            <OnlineLobby playerName={profile?.playerName||"لاعب"} onBack={()=>setScreen("menu")}/>
          </div>
        </div>
      )}
      {screen==="profile" && (
        <ProfileScreen profile={profile} onEditName={(name,avatarType)=>{setProfile(p=>{const u={...p,playerName:name!==undefined?name:p.playerName,avatarType:avatarType||p.avatarType||"male"};saveData(u);return u;});}}
 onBack={()=>setScreen("menu")}/>
      )}
      {screen==="level" && <LevelPick onSelect={l=>{setAiLevel(l);setScreen("color");}} onBack={()=>setScreen("menu")}/>}
      {screen==="color" && <ColorPick onSelect={(c,t)=>{setPlayerColor(c);setPieceTheme(t||"classic");setScreen("game");}} onBack={()=>setScreen("level")}/>}
      {screen==="color-2p" && <ColorPick onSelect={(c,t)=>{setPlayerColor(c);setPieceTheme(t||"classic");setScreen("game");}} onBack={()=>setScreen("menu")}/>}
      {screen==="game" && <ErrorBoundary><Game mode={mode} onBack={()=>setScreen("menu")} playerColor={playerColor} aiLevel={aiLevel} scores={scores} onAddPoints={addPoints} pieceTheme={pieceTheme} onRecordWin={recordWin}/></ErrorBoundary>}
    </div>
  );
}
