import { useState, useEffect, Component } from "react";

const BOARD_SIZE = 5;
const EMPTY = null;
const WHITE = "white";
const BLACK = "black";
const PIECES_PER_PLAYER = 12;
const other = p => p === WHITE ? BLACK : WHITE;
const SAFE_ZONES = new Set(["0,0","0,4","4,0","4,4","2,2"]);
const isSafe = (r,c) => SAFE_ZONES.has(`${r},${c}`);

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
  // مبتدئ: عشوائي تماماً
  if(level==="easy"){
    const moves=[];
    for(let r=0;r<BOARD_SIZE;r++)for(let c=0;c<BOARD_SIZE;c++)if(board[r][c]===player)for(const[tr,tc]of getValidMoves(board,r,c))moves.push({fr:r,fc:c,tr,tc});
    return moves.length?moves[Math.floor(Math.random()*moves.length)]:null;
  }
  // متوسط: يفضل الأكل بس بدون تحليل عميق
  if(level==="medium"){
    const caps=[],reg=[];
    for(let r=0;r<BOARD_SIZE;r++)for(let c=0;c<BOARD_SIZE;c++)if(board[r][c]===player)for(const[tr,tc]of getValidMoves(board,r,c)){if(getCaptures(board,r,c,tr,tc).length>0)caps.push({fr:r,fc:c,tr,tc});else reg.push({fr:r,fc:c,tr,tc});}
    const pool=caps.length?caps:reg;
    return pool.length?pool[Math.floor(Math.random()*pool.length)]:null;
  }
  // احترافي: تحليل استراتيجي كامل
  let best=-Infinity,bestMove=null;
  const opp=other(player);
  for(let r=0;r<BOARD_SIZE;r++)for(let c=0;c<BOARD_SIZE;c++){
    if(board[r][c]!==player)continue;
    for(const[tr,tc]of getValidMoves(board,r,c)){
      const sim=board.map(r=>[...r]);const caps=getCaptures(board,r,c,tr,tc);
      sim[tr][tc]=player;sim[r][c]=EMPTY;for(const[cr,cc]of caps)sim[cr][cc]=EMPTY;
      let s=evaluateBoard(sim,player)+caps.length*8+getCaptureMoves(sim,tr,tc).length*4;
      if(isBlocked(sim,player))s-=30;
      if(isSafe(tr,tc))s+=6;
      s+=Math.random()*0.5;
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
const Piece=({color,sel,dropping,size=46})=>(<div className={dropping?"piece-drop":""} style={{width:size,height:size,borderRadius:"50%",flexShrink:0,position:"relative",overflow:"hidden",background:color===WHITE?"radial-gradient(circle at 32% 28%,#FFFFF0 0%,#F5EDD0 35%,#E8D9A8 65%,#C8A96E 100%)":"radial-gradient(circle at 32% 28%,#5a5a5a 0%,#2d2d2d 35%,#1a1a1a 65%,#0d0d0d 100%)",border:sel?"3px solid #D4A843":color===WHITE?"1.5px solid #B89850":"1.5px solid #404040",boxShadow:sel?"0 0 0 3px rgba(212,168,67,0.3),0 6px 16px rgba(0,0,0,0.6)":color===WHITE?"0 4px 12px rgba(0,0,0,0.5),inset 0 1px 4px rgba(255,255,220,0.6)":"0 4px 12px rgba(0,0,0,0.7),inset 0 1px 3px rgba(255,255,255,0.12)",transition:"box-shadow .2s"}}><div style={{position:"absolute",top:"10%",left:"15%",width:"35%",height:"25%",borderRadius:"50%",background:color===WHITE?"rgba(255,255,255,0.7)":"rgba(255,255,255,0.15)",filter:"blur(2px)"}}/></div>);

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

// ── GAME ───────────────────────────────────────────────────
const CELL=62,PS=46;

function Game({mode,onBack,playerColor,aiLevel,scores,onAddPoints}){
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
    if(isBlocked(nb,next)){setSikaBlocked(next);setSikaGiver(other(next));setSikaState("waiting");setSikaFrom(null);setCur(next);setMsg(`${next===WHITE?"الأبيض":"الأسود"} محصور! اضغط 🚪 طلب سكة`);}
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
      if(repW){setWinner(repW);setWinReason("تكرار");setCapsW(newCW);setCapsB(newCB);setMsg(`🏆 فاز بالتكرار!`);playSound("win");addPoints("win",{player:repW});return{done:true};}
    }
    const w=checkWin(nb,player);
    if(w){const oC=countPieces(nb,other(player));setWinner(w);setWinReason(oC<=1?"حجر واحد":"حجران مقابل 6+");setSel(null);setLocked(null);setVmoves([]);setCapsW(newCW);setCapsB(newCB);setMsg(`🏆 ${w===WHITE?"الأبيض":"الأسود"} فاز!`);playSound("win");addPoints("win",{player:w});return{done:true};}

    if(captured.length>0){const nc=getCaptureMoves(nb,tr,tc);if(nc.length>0){setCapsW(newCW);setCapsB(newCB);return{done:false,board:nb,r:tr,c:tc,cw:newCW,cb:newCB,combo:newCombo,log:newLog};}}
    endTurn(nb,other(player),newCW,newCB);
    return{done:true};
  };

  // AI
  useEffect(()=>{
    if(!isVsAI||cur!==aiPlayer||phase!=="movement"||winner||sikaState) return;
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
    const t=setTimeout(()=>{const mv=aiBestMove(board,aiPlayer,aiLevel||"medium");if(!mv){endTurn(board,humanPlayer,capsW,capsB);return;}saveSnapshot(board,humanPlayer,capsW,capsB,combo,msg);const result=executeMove(board,mv.fr,mv.fc,mv.tr,mv.tc,aiPlayer,capsW,capsB,combo,moveLog);if(!result.done){setLocked([result.r,result.c]);setSel([result.r,result.c]);setVmoves(getCaptureMoves(result.board,result.r,result.c));setCur(aiPlayer);}},1800);
    return()=>clearTimeout(t);
  },[afterUndo,cur,phase,winner,isVsAI]);

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

  const resetGame=()=>{setBoard(emptyBoard());setPhase("placement");setCur(humanPlayer);setFirstPlacer(null);setPlacedW(0);setPlacedB(0);setTurnCount(0);setSel(null);setLocked(null);setVmoves([]);setSikaState(null);setSikaBlocked(null);setSikaGiver(null);setSikaFrom(null);setMsg(`دور ${humanPlayer===WHITE?"الأبيض":"الأسود"} ← ضع حجرين`);setWinner(null);setWinReason("");setCapsW([]);setCapsB([]);setLastCaps([]);setAnim([]);setShaking([]);setLastFrom(null);setCombo(0);setShowCombo(false);setHistory([]);setMoveLog([]);};

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
    return(
      <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:6,padding:"10px 7px",borderRadius:14,minWidth:68,maxWidth:78,background:active?"linear-gradient(170deg,rgba(212,168,67,0.12),rgba(180,130,40,0.06))":"rgba(0,0,0,0.18)",border:`1.5px solid ${active?"rgba(212,168,67,0.45)":"rgba(212,168,67,0.08)"}`,boxShadow:active?"0 0 18px rgba(212,168,67,0.08)":"none",transition:"all .4s",backdropFilter:"blur(4px)"}}>
        <div style={{fontSize:"0.58rem",color:active?"#C8A96E":"#4a3010",fontFamily:"'Cairo',sans-serif"}}>{isW?"⚪ أبيض":"⚫ أسود"}{isAIPanel?" 🤖":""}</div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(4,13px)",gap:2.5}}>
          {Array(PIECES_PER_PLAYER).fill(null).map((_,i)=>(<div key={i} style={{width:13,height:13,borderRadius:"50%",background:i<inHand?(isW?"radial-gradient(circle at 32% 28%,#FFFFF0,#E8D9A8,#C8A96E)":"radial-gradient(circle at 32% 28%,#4a4a4a,#1a1a1a)"):"rgba(255,255,255,0.03)",border:i<inHand?(isW?"1px solid #B89850":"1px solid #333"):"1px solid rgba(255,255,255,0.04)",transition:"all .3s"}}/>))}
        </div>
        <div style={{color:"#C8A96E",fontSize:"0.7rem",fontWeight:700,fontFamily:"'Cairo',sans-serif"}}>{inHand}<span style={{color:"#3a2810",fontSize:"0.55rem"}}> يد</span></div>
        <div style={{color:"#3a2810",fontSize:"0.58rem",fontFamily:"'Cairo',sans-serif"}}>{onBoard} لوح</div>
        {myCaps.length>0&&(<div style={{width:"100%",borderTop:"1px solid rgba(212,168,67,0.08)",paddingTop:4}}><div style={{color:"#3a2810",fontSize:"0.5rem",fontFamily:"'Cairo',sans-serif",marginBottom:2,textAlign:"center"}}>أكل</div><div style={{display:"flex",flexWrap:"wrap",gap:1.5,justifyContent:"center"}}>{myCaps.map((_,i)=>(<div key={i} style={{width:8,height:8,borderRadius:"50%",background:_===WHITE?"radial-gradient(circle,#f5f0e0,#a89870)":"radial-gradient(circle,#484848,#000)",border:_===WHITE?"1px solid #a89870":"1px solid #333"}}/>))}</div></div>)}
        {isVsAI&&isAIPanel&&(<div style={{fontSize:"0.55rem",color:"#5a4020",fontFamily:"'Cairo',sans-serif"}}>{aiLevel==="easy"?"مبتدئ":aiLevel==="medium"?"متوسط":"احترافي"}</div>)}
        {active&&!winner&&<div style={{width:5,height:5,borderRadius:"50%",background:isW?"#E8D9A8":"#484848",border:"1.5px solid #C8A96E",boxShadow:"0 0 8px rgba(212,168,67,0.6)",animation:"beat .9s infinite"}}/>}
        {aiThinking&&isAIPanel&&<div style={{color:"#C8A96E",fontSize:"0.5rem",fontFamily:"'Cairo',sans-serif",animation:"pulse 1s infinite"}}>يفكر...</div>}
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
      {showCombo&&combo>1&&(<div style={{position:"fixed",top:"30%",left:"50%",transform:"translateX(-50%)",zIndex:150,padding:"7px 18px",borderRadius:20,background:"linear-gradient(135deg,rgba(212,168,67,0.92),rgba(160,100,20,0.92))",color:"#fff",fontFamily:"'Cairo',sans-serif",fontSize:"1rem",fontWeight:700,pointerEvents:"none",animation:"comboAnim .4s cubic-bezier(.34,1.56,.64,1)"}}>Combo ×{combo} 🔥</div>)}

      {/* Message */}
      <div style={{background:winner?"linear-gradient(135deg,rgba(212,168,67,0.2),rgba(160,100,20,0.15))":inSika?"linear-gradient(135deg,rgba(200,80,20,0.18),rgba(150,40,10,0.12))":"rgba(0,0,0,0.28)",border:`1px solid ${winner?"rgba(212,168,67,0.55)":inSika?"rgba(220,100,40,0.45)":"rgba(212,168,67,0.12)"}`,borderRadius:10,padding:"7px 16px",backdropFilter:"blur(8px)",color:winner?"#f5d78a":inSika?"#ffb080":"#C8A96E",fontFamily:"'Cairo',sans-serif",fontSize:"0.82rem",textAlign:"center",minWidth:240}}>
        {winner?`🎉 ${winner===WHITE?"الأبيض":"الأسود"} فاز! ${winReason?`(${winReason})`:""}`:msg}
      </div>

      <div style={{display:"flex",alignItems:"center",gap:"clamp(4px,1vw,12px)"}}>
        <HandPanel player={WHITE}/>

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
                    {isCap(r,c)&&<div style={{position:"absolute",inset:0,borderRadius:4,background:"rgba(220,60,40,0.16)",animation:"capFlash .4s ease",zIndex:1,pointerEvents:"none"}}/>}
                    {piece&&<div style={{zIndex:3,position:"relative"}} className={isShake(r,c)?"piece-shake":""}><Piece color={piece} sel={isSel(r,c)} dropping={isAnim(r,c)} size={PS}/></div>}
                  </div>
                );
              })}
            </div>
          ))}
        </div>

        <HandPanel player={BLACK}/>
      </div>

      {/* Controls */}
      <div style={{display:"flex",gap:6,alignItems:"center",flexWrap:"wrap",justifyContent:"center"}}>
        {["placement","movement"].map(ph=>(<div key={ph} style={{padding:"3px 9px",borderRadius:20,background:phase===ph?"rgba(212,168,67,0.13)":"transparent",border:`1px solid ${phase===ph?"rgba(212,168,67,0.35)":"rgba(212,168,67,0.07)"}`,color:phase===ph?"#C8A96E":"#3a2810",fontFamily:"'Cairo',sans-serif",fontSize:"0.66rem"}}>{ph==="placement"?"التوزيع":"الحركة"}</div>))}
        {locked&&!winner&&phase==="movement"&&(!isVsAI||cur!==aiPlayer)&&(<button onClick={endMyTurn} style={{padding:"3px 10px",borderRadius:20,background:"rgba(80,180,80,0.15)",border:"1px solid rgba(100,200,100,0.35)",color:"#90e090",fontFamily:"'Cairo',sans-serif",fontSize:"0.66rem",cursor:"pointer"}}>✅ أنهِ دوري</button>)}
        {sikaState==="waiting"&&!winner&&(<button onClick={pressSika} style={{padding:"3px 10px",borderRadius:20,background:"linear-gradient(135deg,rgba(200,60,20,0.45),rgba(150,40,10,0.3))",border:"1px solid rgba(220,100,40,0.45)",color:"#ffb080",fontFamily:"'Cairo',sans-serif",fontSize:"0.68rem",cursor:"pointer",fontWeight:700,animation:"sikaBeat 1s infinite"}}>🚪 طلب سكة</button>)}
        <button onClick={undoMove} disabled={history.length===0||!!winner} style={{padding:"3px 9px",borderRadius:20,background:history.length>0&&!winner?"rgba(100,160,220,0.1)":"rgba(255,255,255,0.02)",border:`1px solid ${history.length>0&&!winner?"rgba(100,160,220,0.3)":"rgba(255,255,255,0.03)"}`,color:history.length>0&&!winner?"#90c0f0":"#2a2010",fontFamily:"'Cairo',sans-serif",fontSize:"0.66rem",cursor:history.length>0&&!winner?"pointer":"not-allowed"}}>↩️ رجوع</button>
        <button onClick={resetGame} style={{padding:"3px 9px",borderRadius:20,background:"rgba(212,168,67,0.07)",border:"1px solid rgba(212,168,67,0.15)",color:"#C8A96E",fontFamily:"'Cairo',sans-serif",fontSize:"0.66rem",cursor:"pointer"}}>🔄 جديد</button>
        <button onClick={onBack} style={{padding:"3px 9px",borderRadius:20,background:"transparent",border:"1px solid rgba(212,168,67,0.06)",color:"#3a2810",fontFamily:"'Cairo',sans-serif",fontSize:"0.66rem",cursor:"pointer"}}>← رجوع</button>
      </div>

      {phase==="placement"&&!winner&&(<div style={{display:"flex",gap:5,alignItems:"center"}}>{[0,1].map(i=>(<div key={i} style={{width:16,height:16,borderRadius:"50%",background:i<turnCount?(cur===WHITE?"radial-gradient(circle at 32% 28%,#FFFFF0,#C8A96E)":"radial-gradient(circle at 32% 28%,#4a4a4a,#000)"):"rgba(212,168,67,0.07)",border:i<turnCount?"1.5px solid rgba(212,168,67,0.45)":"1px solid rgba(212,168,67,0.07)",transition:"all .3s"}}/>))}<span style={{color:"#4a3810",fontFamily:"'Cairo',sans-serif",fontSize:"0.62rem"}}>{turnCount<2?`ضع ${2-turnCount} حجر${2-turnCount===2?"ين":""}`: "ينتقل..."}</span></div>)}
    </div>
  );
}

// ── MENU ───────────────────────────────────────────────────
function Menu({onSelect,scores}){
  const [showRules,setShowRules]=useState(false);
  const modes=[
    {id:"vs-ai",icon:"🤖",title:"ضد الكمبيوتر",sub:"ذكاء اصطناعي استراتيجي"},
    {id:"2player",icon:"👥",title:"لاعبان",sub:"على نفس الجهاز"},
    {id:"online",icon:"🌐",title:"أونلاين",sub:"قريباً..."},
  ];
  return(
    <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:12}}>
      {showRules&&<RulesModal onClose={()=>setShowRules(false)}/>}

      {/* Scores */}
      <div style={{display:"flex",gap:16,marginBottom:4}}>
        {[{label:"⚪ أبيض",key:WHITE},{label:"⚫ أسود",key:BLACK}].map(s=>(
          <div key={s.key} style={{textAlign:"center",padding:"4px 12px",borderRadius:10,background:"rgba(0,0,0,0.2)",border:"1px solid rgba(212,168,67,0.08)"}}>
            <div style={{color:"#5a4020",fontFamily:"'Cairo',sans-serif",fontSize:"0.62rem"}}>{s.label}</div>
            <div style={{color:"#C8A96E",fontFamily:"'Cairo',sans-serif",fontSize:"1rem",fontWeight:700}}>{scores[s.key]||0}</div>
            <div style={{color:"#3a2810",fontFamily:"'Cairo',sans-serif",fontSize:"0.55rem"}}>نقطة</div>
          </div>
        ))}
      </div>

      {modes.map(m=>(<button key={m.id} onClick={()=>m.id!=="online"&&onSelect(m.id)} style={{width:250,padding:"13px 18px",borderRadius:14,background:m.id==="online"?"rgba(0,0,0,0.12)":"linear-gradient(135deg,rgba(212,168,67,0.09),rgba(160,100,20,0.06))",border:`1.5px solid ${m.id==="online"?"rgba(212,168,67,0.05)":"rgba(212,168,67,0.22)"}`,color:m.id==="online"?"#2a1808":"#C8A96E",fontFamily:"'Cairo',sans-serif",cursor:m.id==="online"?"not-allowed":"pointer",display:"flex",alignItems:"center",gap:14,backdropFilter:"blur(8px)",transition:"all .25s",opacity:m.id==="online"?.3:1}}
        onMouseEnter={e=>{if(m.id!=="online")e.currentTarget.style.background="linear-gradient(135deg,rgba(212,168,67,0.17),rgba(160,100,20,0.11))"}}
        onMouseLeave={e=>{if(m.id!=="online")e.currentTarget.style.background="linear-gradient(135deg,rgba(212,168,67,0.09),rgba(160,100,20,0.06))"}}>
        <span style={{fontSize:"1.6rem"}}>{m.icon}</span>
        <div style={{textAlign:"right"}}><div style={{fontWeight:700,fontSize:"0.88rem"}}>{m.title}</div><div style={{fontSize:"0.62rem",color:m.id==="online"?"#2a1808":"#6a4820",marginTop:2}}>{m.sub}</div></div>
      </button>))}

      {/* Rules button */}
      <button onClick={()=>setShowRules(true)} style={{marginTop:4,padding:"7px 20px",borderRadius:20,background:"rgba(212,168,67,0.08)",border:"1px solid rgba(212,168,67,0.2)",color:"#C8A96E",fontFamily:"'Cairo',sans-serif",fontSize:"0.78rem",cursor:"pointer",display:"flex",alignItems:"center",gap:8,backdropFilter:"blur(4px)"}}>
        📖 قوانين اللعبة
      </button>

      <div style={{display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:5,maxWidth:260,width:"100%",marginTop:2}}>
        {[{e:"🛡️",t:"5 مناطق أمان",d:"زوايا + المنتصف"},{e:"🍽️",t:"أكل اختياري",d:"للفخ والتكتيك"},{e:"🔁",t:"تكرار",d:"أكثر من 6× يُحكم بالأكثر"},{e:"🏆",t:"فوز",d:"حجر واحد أو 2 مقابل 6+"}].map((x,i)=>(<div key={i} style={{background:"rgba(0,0,0,0.18)",border:"1px solid rgba(212,168,67,0.07)",borderRadius:8,padding:"5px 7px",backdropFilter:"blur(4px)"}}><div style={{fontSize:"0.85rem"}}>{x.e}</div><div style={{color:"#7a5a28",fontFamily:"'Cairo',sans-serif",fontSize:"0.6rem",fontWeight:600}}>{x.t}</div><div style={{color:"#3a2810",fontFamily:"'Cairo',sans-serif",fontSize:"0.54rem",lineHeight:1.3}}>{x.d}</div></div>))}
      </div>
    </div>
  );
}

// ── COLOR PICK ─────────────────────────────────────────────
function ColorPick({onSelect,onBack}){
  return(
    <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:18}}>
      <p style={{color:"rgba(212,168,67,0.5)",fontFamily:"'Cairo',sans-serif",fontSize:"0.88rem",margin:0}}>اختر لون حجارك</p>
      <div style={{display:"flex",gap:16}}>
        {[WHITE,BLACK].map(color=>(
          <button key={color} onClick={()=>onSelect(color)} style={{width:110,padding:"16px 10px",borderRadius:14,background:color===WHITE?"linear-gradient(135deg,rgba(245,240,224,0.13),rgba(200,180,120,0.08))":"linear-gradient(135deg,rgba(50,50,50,0.28),rgba(20,20,20,0.18))",border:`2px solid ${color===WHITE?"rgba(200,180,120,0.45)":"rgba(80,80,80,0.45)"}`,cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",gap:10,backdropFilter:"blur(8px)",transition:"all .2s"}}
            onMouseEnter={e=>e.currentTarget.style.transform="scale(1.06)"}
            onMouseLeave={e=>e.currentTarget.style.transform="scale(1)"}>
            <div style={{width:42,height:42,borderRadius:"50%",background:color===WHITE?"radial-gradient(circle at 32% 28%,#FFFFF0,#E8D9A8,#C8A96E)":"radial-gradient(circle at 32% 28%,#5a5a5a,#1a1a1a,#000)",border:color===WHITE?"2px solid #B89850":"2px solid #555",boxShadow:color===WHITE?"0 4px 12px rgba(0,0,0,0.4),inset 0 1px 4px rgba(255,255,220,0.6)":"0 4px 12px rgba(0,0,0,0.7)"}}/>
            <span style={{color:color===WHITE?"#C8A96E":"#888",fontFamily:"'Cairo',sans-serif",fontSize:"0.78rem",fontWeight:700}}>{color===WHITE?"أبيض ⚪":"أسود ⚫"}</span>
            {color===WHITE&&<span style={{color:"#4a3010",fontFamily:"'Cairo',sans-serif",fontSize:"0.58rem"}}>يبدأ أول</span>}
          </button>
        ))}
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
export default function AlSija(){
  const [screen, setScreen] = useState("menu");
  const [mode,   setMode]   = useState(null);
  const [playerColor,setPlayerColor] = useState(WHITE);
  const [aiLevel,setAiLevel] = useState("medium");
  const [scores, setScores] = useState({[WHITE]:0,[BLACK]:0});

  const addPoints=(player,pts)=>setScores(s=>({...s,[player]:(s[player]||0)+pts}));

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
      `}</style>

      {/* TITLE */}
      <div style={{marginBottom:screen==="menu"?20:12,textAlign:"center"}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:12}}>
          <span style={{color:"rgba(212,168,67,0.35)",fontFamily:"monospace",fontSize:"clamp(0.7rem,2vw,0.9rem)",letterSpacing:2}}>seja</span>
          <h1 style={{fontSize:"clamp(1.8rem,5vw,2.8rem)",margin:0,fontFamily:"'Amiri',serif",fontWeight:700,letterSpacing:2,background:"linear-gradient(135deg,#f5d78a,#d4a843,#a07030,#d4a843,#f5d78a)",backgroundSize:"300% auto",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",animation:"shimmer 5s linear infinite"}}>سيجة</h1>
          <span style={{color:"rgba(212,168,67,0.35)",fontFamily:"monospace",fontSize:"clamp(0.7rem,2vw,0.9rem)",letterSpacing:2}}>seja</span>
        </div>
        <p style={{color:"rgba(212,168,67,0.2)",fontSize:"0.58rem",margin:0,fontFamily:"'Cairo',sans-serif",letterSpacing:3}}>MODERN HERITAGE</p>
      </div>

      {screen==="menu" && <Menu onSelect={m=>{setMode(m);if(m==="vs-ai")setScreen("level");else{setPlayerColor(WHITE);setScreen("game");}}} scores={scores}/>}
      {screen==="level" && <LevelPick onSelect={l=>{setAiLevel(l);setScreen("color");}} onBack={()=>setScreen("menu")}/>}
      {screen==="color" && <ColorPick onSelect={c=>{setPlayerColor(c);setScreen("game");}} onBack={()=>setScreen("level")}/>}
      {screen==="game" && <ErrorBoundary><Game mode={mode} onBack={()=>setScreen("menu")} playerColor={playerColor} aiLevel={aiLevel} scores={scores} onAddPoints={addPoints}/></ErrorBoundary>}
    </div>
  );
}
