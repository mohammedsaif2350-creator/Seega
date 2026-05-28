import { useState, useEffect, Component } from "react";

const BOARD_SIZE = 5;
const EMPTY = null;
const WHITE = "white";
const BLACK = "black";
const PIECES_PER_PLAYER = 12;
const other = p => p === WHITE ? BLACK : WHITE;

// ── مناطق الأمان: 4 زوايا + المنتصف ──────────────────────
const SAFE_ZONES = new Set(["0,0","0,4","4,0","4,4","2,2"]);
const isSafe = (r,c) => SAFE_ZONES.has(`${r},${c}`);

// ── GAME LOGIC ─────────────────────────────────────────────
function emptyBoard() {
  return Array(BOARD_SIZE).fill(null).map(() => Array(BOARD_SIZE).fill(EMPTY));
}
function getValidMoves(board, r, c) {
  const moves = [];
  for (const [dr,dc] of [[-1,0],[1,0],[0,-1],[0,1]]) {
    const nr=r+dr, nc=c+dc;
    if (nr>=0&&nr<BOARD_SIZE&&nc>=0&&nc<BOARD_SIZE&&board[nr][nc]===EMPTY)
      moves.push([nr,nc]);
  }
  return moves;
}
// الأكل اختياري — يُحسب فقط إذا الحجر المأكول ليس في منطقة أمان
function getCaptures(board, fr, fc, tr, tc) {
  if (!board[fr][fc]) return [];
  const piece=board[fr][fc], opp=other(piece);
  const sim=board.map(r=>[...r]);
  sim[tr][tc]=piece; sim[fr][fc]=EMPTY;
  const caps=[];
  for (const [dr,dc] of [[-1,0],[1,0],[0,-1],[0,1]]) {
    const ar=tr+dr,ac=tc+dc,br=tr+2*dr,bc=tc+2*dc;
    if (ar>=0&&ar<BOARD_SIZE&&ac>=0&&ac<BOARD_SIZE&&
        br>=0&&br<BOARD_SIZE&&bc>=0&&bc<BOARD_SIZE&&
        sim[ar][ac]===opp&&sim[br][bc]===piece&&
        !isSafe(ar,ac)) // منطقة الأمان تحمي من الأكل
      caps.push([ar,ac]);
  }
  return caps;
}
function getCaptureMoves(board, r, c) {
  const moves=[];
  for (const [dr,dc] of [[-1,0],[1,0],[0,-1],[0,1]]) {
    const nr=r+dr,nc=c+dc;
    if (nr>=0&&nr<BOARD_SIZE&&nc>=0&&nc<BOARD_SIZE&&board[nr][nc]===EMPTY&&
        getCaptures(board,r,c,nr,nc).length>0) moves.push([nr,nc]);
  }
  return moves;
}
function isBlocked(board, player) {
  for (let r=0;r<BOARD_SIZE;r++)
    for (let c=0;c<BOARD_SIZE;c++)
      if (board[r][c]===player&&getValidMoves(board,r,c).length>0) return false;
  return true;
}
function countPieces(board, player) {
  let n=0;
  for (let r=0;r<BOARD_SIZE;r++) for (let c=0;c<BOARD_SIZE;c++) if(board[r][c]===player) n++;
  return n;
}
// شرط الفوز المحدّث
function checkWin(board, lastPlayer) {
  const opp = other(lastPlayer);
  const oppCount = countPieces(board, opp);
  const myCount  = countPieces(board, lastPlayer);
  if (oppCount <= 1) return lastPlayer;
  if (oppCount <= 2 && myCount >= 6) return lastPlayer;
  return null;
}

// ── AI قوي ────────────────────────────────────────────────
function evaluateBoard(board, player) {
  const opp = other(player);
  let score = 0;
  score += (countPieces(board,player) - countPieces(board,opp)) * 10;
  // تفضيل مناطق الأمان
  for (const key of SAFE_ZONES) {
    const [r,c] = key.split(',').map(Number);
    if (board[r][c]===player) score += 4;
    else if (board[r][c]===opp) score -= 4;
  }
  // تفضيل التمركز
  for (let r=0;r<BOARD_SIZE;r++) for (let c=0;c<BOARD_SIZE;c++) {
    if (board[r][c]===player) {
      const centrality = 2 - Math.max(Math.abs(r-2),Math.abs(c-2));
      score += centrality * 0.5;
    }
  }
  return score;
}

function aiBestMove(board, player, depth=2) {
  let bestScore=-Infinity, bestMove=null;
  const opp=other(player);

  for (let r=0;r<BOARD_SIZE;r++) for (let c=0;c<BOARD_SIZE;c++) {
    if (board[r][c]!==player) continue;
    for (const [tr,tc] of getValidMoves(board,r,c)) {
      const sim=board.map(r=>[...r]);
      const caps=getCaptures(board,r,c,tr,tc);
      sim[tr][tc]=player; sim[r][c]=EMPTY;
      for (const [cr,cc] of caps) sim[cr][cc]=EMPTY;

      let score = evaluateBoard(sim,player);
      // أكل إضافي
      if (caps.length>0) {
        score += caps.length*8;
        // الأكل المتسلسل
        const chain=getCaptureMoves(sim,tr,tc);
        score += chain.length*4;
      }
      // تجنب وضع الحجر في موقع يُحصره
      if (isBlocked(sim,player)) score -= 30;
      // تجنب وضع الحجر بجانب عدو يستطيع أكله
      const sim2=sim.map(r=>[...r]);
      for (const [dr,dc] of [[-1,0],[1,0],[0,-1],[0,1]]) {
        const nr=tr+dr,nc=tc+dc;
        if (nr>=0&&nr<BOARD_SIZE&&nc>=0&&nc<BOARD_SIZE&&sim2[nr][nc]===opp) {
          if (getCaptureMoves(sim2,nr,nc).length>0) score -= 5;
        }
      }
      // منطقة أمان قيّمة
      if (isSafe(tr,tc)) score += 6;

      score += Math.random()*0.5;
      if (score>bestScore) { bestScore=score; bestMove={fr:r,fc:c,tr,tc}; }
    }
  }
  return bestMove;
}

// ── SOUND ──────────────────────────────────────────────────
function playSound(type) {
  try {
    const ctx=new(window.AudioContext||window.webkitAudioContext)();
    if (type==="move") {
      const o=ctx.createOscillator(),g=ctx.createGain();
      o.connect(g);g.connect(ctx.destination);
      o.frequency.value=600;o.type="sine";
      g.gain.setValueAtTime(0.2,ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001,ctx.currentTime+0.12);
      o.start();o.stop(ctx.currentTime+0.12);
    } else if (type==="capture") {
      [320,180].forEach((f,i)=>{
        const o=ctx.createOscillator(),g=ctx.createGain();
        o.connect(g);g.connect(ctx.destination);
        o.frequency.value=f;o.type="triangle";
        g.gain.setValueAtTime(0.35,ctx.currentTime+i*0.08);
        g.gain.exponentialRampToValueAtTime(0.001,ctx.currentTime+i*0.08+0.18);
        o.start(ctx.currentTime+i*0.08);o.stop(ctx.currentTime+i*0.08+0.18);
      });
    } else if (type==="win") {
      [523,659,784,1047].forEach((f,i)=>{
        const o=ctx.createOscillator(),g=ctx.createGain();
        o.connect(g);g.connect(ctx.destination);
        o.frequency.value=f;o.type="sine";
        g.gain.setValueAtTime(0.25,ctx.currentTime+i*0.13);
        g.gain.exponentialRampToValueAtTime(0.001,ctx.currentTime+i*0.13+0.25);
        o.start(ctx.currentTime+i*0.13);o.stop(ctx.currentTime+i*0.13+0.25);
      });
    } else if (type==="safe") {
      const o=ctx.createOscillator(),g=ctx.createGain();
      o.connect(g);g.connect(ctx.destination);
      o.frequency.value=900;o.type="sine";
      g.gain.setValueAtTime(0.15,ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001,ctx.currentTime+0.2);
      o.start();o.stop(ctx.currentTime+0.2);
    }
  } catch(e){}
}

// ── CONFETTI ───────────────────────────────────────────────
const Confetti=()=>{
  const items=Array(55).fill(null).map((_,i)=>({
    id:i,x:Math.random()*100,delay:Math.random()*2.5,dur:2.5+Math.random()*2,
    color:["#d4a843","#f5d78a","#C8A96E","#fff8e7","#b8936a","#e8d5a3"][Math.floor(Math.random()*6)],
    size:5+Math.random()*9,
  }));
  return (
    <div style={{position:"fixed",inset:0,pointerEvents:"none",overflow:"hidden",zIndex:200}}>
      {items.map(p=>(
        <div key={p.id} style={{
          position:"absolute",left:`${p.x}%`,top:"-20px",
          width:p.size,height:p.size,background:p.color,
          borderRadius:Math.random()>.5?"50%":"2px",
          animation:`confettiFall ${p.dur}s ${p.delay}s ease-in infinite`,
        }}/>
      ))}
    </div>
  );
};

// ── ERROR BOUNDARY ─────────────────────────────────────────
class ErrorBoundary extends Component {
  constructor(props){super(props);this.state={hasError:false,error:null};}
  static getDerivedStateFromError(error){return{hasError:true,error};}
  render(){
    if(this.state.hasError) return (
      <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:16,padding:32,
        borderRadius:16,background:"rgba(150,30,20,0.15)",border:"1px solid rgba(220,80,60,0.3)",
        maxWidth:300,textAlign:"center"}}>
        <div style={{fontSize:"2.5rem"}}>⚠️</div>
        <div style={{color:"#ff9080",fontFamily:"'Cairo',sans-serif",fontSize:"0.9rem"}}>حدث خطأ غير متوقع</div>
        <button onClick={()=>this.setState({hasError:false,error:null})} style={{
          padding:"8px 20px",borderRadius:20,background:"rgba(212,168,67,0.2)",
          border:"1px solid rgba(212,168,67,0.4)",color:"#C8A96E",
          fontFamily:"'Cairo',sans-serif",fontSize:"0.8rem",cursor:"pointer"}}>🔄 إعادة تشغيل</button>
      </div>
    );
    return this.props.children;
  }
}

// ── PIECE ──────────────────────────────────────────────────
const Piece=({color,sel,dropping,shaking,size=46})=>(
  <div className={`${dropping?"piece-drop":""} ${shaking?"piece-shake":""}`} style={{
    width:size,height:size,borderRadius:"50%",flexShrink:0,position:"relative",overflow:"hidden",
    background:color===WHITE
      ?"radial-gradient(circle at 32% 28%,#FFFFF0 0%,#F5EDD0 35%,#E8D9A8 65%,#C8A96E 100%)"
      :"radial-gradient(circle at 32% 28%,#5a5a5a 0%,#2d2d2d 35%,#1a1a1a 65%,#0d0d0d 100%)",
    border:sel?"3px solid #D4A843":color===WHITE?"1.5px solid #B89850":"1.5px solid #404040",
    boxShadow:sel
      ?"0 0 0 3px rgba(212,168,67,0.3),0 6px 16px rgba(0,0,0,0.6),inset 0 1px 3px rgba(255,255,255,0.5)"
      :color===WHITE
        ?"0 4px 12px rgba(0,0,0,0.5),inset 0 1px 4px rgba(255,255,220,0.6)"
        :"0 4px 12px rgba(0,0,0,0.7),inset 0 1px 3px rgba(255,255,255,0.12)",
    transition:"box-shadow .2s,border .2s",
  }}>
    <div style={{position:"absolute",top:"10%",left:"15%",width:"35%",height:"25%",borderRadius:"50%",
      background:color===WHITE?"rgba(255,255,255,0.7)":"rgba(255,255,255,0.15)",
      filter:"blur(2px)",pointerEvents:"none"}}/>
  </div>
);

// ── GAME ───────────────────────────────────────────────────
const CELL=62, PS=46;

function Game({mode,onBack}) {
  const [board,    setBoard]    = useState(emptyBoard);
  const [phase,    setPhase]    = useState("placement");
  const [cur,      setCur]      = useState(WHITE);
  const [firstPlacer,setFirstPlacer]=useState(null);
  const [placedW,  setPlacedW]  = useState(0);
  const [placedB,  setPlacedB]  = useState(0);
  const [turnCount,setTurnCount]= useState(0);
  const [sel,      setSel]      = useState(null);
  const [locked,   setLocked]   = useState(null);
  const [vmoves,   setVmoves]   = useState([]);
  const [sikaState,setSikaState]= useState(null);
  const [sikaBlocked,setSikaBlocked]=useState(null);
  const [sikaGiver,setSikaGiver]=useState(null);
  const [sikaFrom, setSikaFrom] = useState(null);
  const [msg,      setMsg]      = useState("دور الأبيض ← ضع حجرين على اللوح");
  const [winner,   setWinner]   = useState(null);
  const [winReason,setWinReason]= useState("");
  const [capsW,    setCapsW]    = useState([]);
  const [capsB,    setCapsB]    = useState([]);
  const [lastCaps, setLastCaps] = useState([]);
  const [anim,     setAnim]     = useState([]);
  const [shaking,  setShaking]  = useState([]);
  const [lastFrom, setLastFrom] = useState(null);
  const [combo,    setCombo]    = useState(0);
  const [showCombo,setShowCombo]= useState(false);
  const [history,  setHistory]  = useState([]);
  const [moveLog,  setMoveLog]  = useState([]); // لتتبع التكرار
  const [aiThinking,setAiThinking]=useState(false);

  const isVsAI=mode==="vs-ai", aiPlayer=BLACK;

  const flash=cells=>{setAnim(cells);setTimeout(()=>setAnim([]),500);};
  const shake=cells=>{setShaking(cells);setTimeout(()=>setShaking([]),400);};

  const isSel  =(r,c)=>sel&&sel[0]===r&&sel[1]===c;
  const isVM   =(r,c)=>vmoves.some(([mr,mc])=>mr===r&&mc===c);
  const isCap  =(r,c)=>lastCaps.some(([cr,cc])=>cr===r&&cc===c);
  const isAnim =(r,c)=>anim.some(([ar,ac])=>ar===r&&ac===c);
  const isShake=(r,c)=>shaking.some(([sr,sc])=>sr===r&&sc===c);

  // ── تتبع التكرار ─────────────────────────────────────────
  const checkRepetition=(log, fr, fc, tr, tc, player)=>{
    const key=`${player}:${fr},${fc}->${tr},${tc}`;
    const count=log.filter(k=>k===key).length+1;
    if(count>3){
      return true; // تكرار زيادة عن 3 مرات
    }
    return false;
  };

  // ── نهاية الدور ──────────────────────────────────────────
  const endTurn=(nb,next,nCW,nCB)=>{
    setSel(null);setLocked(null);setVmoves([]);setCombo(0);
    if(nCW!==undefined){setCapsW(nCW);setCapsB(nCB);}
    if(isBlocked(nb,next)){
      setSikaBlocked(next);setSikaGiver(other(next));
      setSikaState("waiting");setSikaFrom(null);setCur(next);
      setMsg(`${next===WHITE?"الأبيض":"الأسود"} محصور! اضغط 🚪 طلب سكة`);
    } else {
      setCur(next);
      setMsg(`دور ${next===WHITE?"الأبيض":"الأسود"}`);
    }
  };

  // ── حفظ snapshot ─────────────────────────────────────────
  const saveSnapshot=(board,player,cw,cb,cmb,message)=>{
    setHistory(h=>[...h.slice(-12),{board:board.map(r=>[...r]),cur:player,
      capsW:[...cw],capsB:[...cb],combo:cmb,msg:message,
      placedW,placedB,phase,firstPlacer,turnCount}]);
  };

  // ── تنفيذ الحركة ──────────────────────────────────────────
  const executeMove=(board,fr,fc,tr,tc,player,cW,cB,cmb,log)=>{
    const nb=board.map(r=>[...r]);
    const captured=getCaptures(board,fr,fc,tr,tc);
    nb[tr][tc]=player;nb[fr][fc]=EMPTY;
    for(const [cr,cc] of captured) nb[cr][cc]=EMPTY;
    setBoard(nb);setLastCaps(captured);setLastFrom([fr,fc]);
    flash([[tr,tc]]);
    if(captured.length>0){shake(captured);playSound("capture");}
    else if(isSafe(tr,tc)) playSound("safe");
    else playSound("move");

    const newCW=player===WHITE?[...cW,...captured.map(()=>BLACK)]:cW;
    const newCB=player===BLACK?[...cB,...captured.map(()=>WHITE)]:cB;
    const newCombo=captured.length>0?cmb+1:0;
    if(captured.length>0&&newCombo>0){setCombo(newCombo);setShowCombo(true);setTimeout(()=>setShowCombo(false),1200);}

    // تحقق من التكرار
    const newKey=`${player}:${fr},${fc}->${tr},${tc}`;
    const newLog=[...(log||moveLog),newKey];
    const repCount=newLog.filter(k=>k===newKey).length;
    setMoveLog(newLog);

    if(repCount>3){
      // يفوز صاحب أكثر أحجار
      const wCount=countPieces(nb,WHITE), bCount=countPieces(nb,BLACK);
      const repWinner=wCount>bCount?WHITE:bCount>wCount?BLACK:null;
      if(repWinner){
        setWinner(repWinner);setWinReason("تكرار الحركة");
        setCapsW(newCW);setCapsB(newCB);
        setMsg(`🏆 ${repWinner===WHITE?"الأبيض":"الأسود"} فاز بسبب تكرار الحركة!`);
        playSound("win");return{done:true};
      }
    }

    // شرط الفوز
    const w=checkWin(nb,player);
    if(w){
      const oCount=countPieces(nb,other(player));
      const reason=oCount<=1?"حجر واحد متبقي":"حجران مقابل 6+";
      setWinner(w);setWinReason(reason);
      setSel(null);setLocked(null);setVmoves([]);
      setCapsW(newCW);setCapsB(newCB);
      setMsg(`🏆 ${w===WHITE?"الأبيض":"الأسود"} فاز!`);
      playSound("win");return{done:true};
    }

    // الأكل اختياري — لو في أكل ثاني يتيح للاعب الاختيار
    if(captured.length>0){
      const nc=getCaptureMoves(nb,tr,tc);
      if(nc.length>0){
        setCapsW(newCW);setCapsB(newCB);
        return{done:false,board:nb,r:tr,c:tc,cw:newCW,cb:newCB,combo:newCombo,log:newLog};
      }
    }
    endTurn(nb,other(player),newCW,newCB);
    return{done:true};
  };

  // ── AI ────────────────────────────────────────────────────
  useEffect(()=>{
    if(!isVsAI||cur!==aiPlayer||phase!=="movement"||winner||sikaState) return;
    const runAI=(currentBoard,lockedPiece,cW,cB,cmb,log)=>{
      setAiThinking(true);
      setTimeout(()=>{
        setAiThinking(false);
        let mv;
        if(lockedPiece){
          const capMoves=getCaptureMoves(currentBoard,lockedPiece[0],lockedPiece[1]);
          if(capMoves.length===0){endTurn(currentBoard,WHITE,cW,cB);return;}
          // AI يقرر إذا يكمل الأكل أو لا (اختياري) — يكمل إذا كان مفيداً
          const [tr,tc]=capMoves[0];
          mv={fr:lockedPiece[0],fc:lockedPiece[1],tr,tc};
        } else {
          mv=aiBestMove(currentBoard,aiPlayer);
          if(!mv){endTurn(currentBoard,WHITE,cW,cB);return;}
        }
        const result=executeMove(currentBoard,mv.fr,mv.fc,mv.tr,mv.tc,aiPlayer,cW,cB,cmb,log);
        if(!result.done){
          setLocked([result.r,result.c]);setSel([result.r,result.c]);
          setVmoves(getCaptureMoves(result.board,result.r,result.c));
          setCur(aiPlayer);setMsg("الكمبيوتر أكل! ← يقرر هل يكمل");
          setTimeout(()=>runAI(result.board,[result.r,result.c],result.cw,result.cb,result.combo,result.log),700);
        }
      },700);
    };
    runAI(board,locked,capsW,capsB,combo,moveLog);
  },[cur,phase,winner,sikaState,isVsAI]);

  // ── التوزيع ───────────────────────────────────────────────
  const endPlacementTurn=(nW,nB,lastPlacer)=>{
    const total=nW+nB;
    if(total>=PIECES_PER_PLAYER*2){
      const startMover=other(firstPlacer||lastPlacer);
      setPhase("movement");setCur(startMover);setTurnCount(0);
      setMsg(`مرحلة الحركة ← دور ${startMover===WHITE?"الأبيض":"الأسود"}`);
    } else {
      const next=other(lastPlacer);setCur(next);setTurnCount(0);
      setMsg(`دور ${next===WHITE?"الأبيض":"الأسود"} ← ضع حجرين (${PIECES_PER_PLAYER-(next===WHITE?nW:nB)} في اليد)`);
    }
  };
  const handlePlacement=(r,c)=>{
    if(winner||board[r][c]!==EMPTY) return;
    if(r===2&&c===2){setMsg("⛔ المركز لا يُوضع فيه حجر أثناء التوزيع");return;}
    if((cur===WHITE?placedW:placedB)>=PIECES_PER_PLAYER||turnCount>=2) return;
    saveSnapshot(board,cur,capsW,capsB,combo,msg);
    const nb=board.map(r=>[...r]);nb[r][c]=cur;
    let nW=placedW,nB=placedB;
    if(cur===WHITE)nW++;else nB++;
    const nt=turnCount+1;
    if(!firstPlacer&&nW+nB===1)setFirstPlacer(cur);
    setBoard(nb);setPlacedW(nW);setPlacedB(nB);setTurnCount(nt);
    flash([[r,c]]);playSound("move");
    if(nt>=2){setMsg("✅ وضعت حجرين...");setTimeout(()=>endPlacementTurn(nW,nB,cur),600);}
    else setMsg(`${cur===WHITE?"الأبيض":"الأسود"} ← ضع حجراً آخر (${PIECES_PER_PLAYER-(cur===WHITE?nW:nB)} في اليد)`);
  };

  // ── السكة ─────────────────────────────────────────────────
  const pressSika=()=>{
    setSikaState("pick-piece");setCur(sikaGiver);
    setMsg(`${sikaGiver===WHITE?"الأبيض":"الأسود"} ← اختر حجراً عنده مجال حركة لتفتح السكة`);
  };
  const handleSikaClick=(r,c)=>{
    if(sikaState==="pick-piece"){
      if(board[r][c]!==sikaGiver){setMsg("اختر حجراً من حجارك أنت!");return;}
      if(getValidMoves(board,r,c).length===0){setMsg("هذا الحجر ما عنده مجال حركة!");return;}
      setSikaFrom([r,c]);setSikaState("pick-cell");
      setMsg(`${sikaGiver===WHITE?"الأبيض":"الأسود"} ← اختر مربعاً مجاوراً فاضياً`);
    } else if(sikaState==="pick-cell"){
      if(board[r][c]!==EMPTY){setMsg("اختر مربعاً فاضياً!");return;}
      const dr=Math.abs(r-sikaFrom[0]),dc=Math.abs(c-sikaFrom[1]);
      if(!((dr===1&&dc===0)||(dr===0&&dc===1))){setMsg("الحركة لازم لمربع مجاور!");return;}
      const nb=board.map(r=>[...r]);
      nb[r][c]=sikaGiver;nb[sikaFrom[0]][sikaFrom[1]]=EMPTY;
      setBoard(nb);flash([[r,c]]);playSound("move");
      setSikaState(null);setSikaBlocked(null);setSikaGiver(null);setSikaFrom(null);
      setCur(sikaBlocked);setSel(null);setLocked(null);setVmoves([]);
      setMsg(`السكة اتفتحت ← دور ${sikaBlocked===WHITE?"الأبيض":"الأسود"}`);
    }
  };

  // ── حركة اللاعب ──────────────────────────────────────────
  const handleMovement=(r,c)=>{
    if(winner) return;
    if(sikaState==="pick-piece"||sikaState==="pick-cell"){handleSikaClick(r,c);return;}
    if(sikaState==="waiting") return;
    if(isVsAI&&cur===aiPlayer) return;
    if(sel){
      const valid=vmoves.some(([mr,mc])=>mr===r&&mc===c);
      if(valid){
        saveSnapshot(board,cur,capsW,capsB,combo,msg);
        const result=executeMove(board,sel[0],sel[1],r,c,cur,capsW,capsB,combo,moveLog);
        if(!result.done){
          setSel([result.r,result.c]);setLocked([result.r,result.c]);
          setVmoves(getCaptureMoves(result.board,result.r,result.c));
          setCapsW(result.cw);setCapsB(result.cb);setCombo(result.combo);
          setMsg("أكل! ← يمكنك الاستمرار أو الانتظار");
          // زر للاختيار: يكمل أو ينهي الدور
        }
      } else if(board[r][c]===cur&&!locked){
        setSel([r,c]);setVmoves(getValidMoves(board,r,c));
      } else if(!locked){setSel(null);setVmoves([]);}
    } else {
      if(board[r][c]===cur){
        if(locked&&!(locked[0]===r&&locked[1]===c)) return;
        setSel([r,c]);setVmoves(getValidMoves(board,r,c));
      }
    }
  };

  // زر "أنهِ دوري" بعد الأكل الاختياري
  const endMyTurn=()=>{
    if(!locked||winner) return;
    const nb=board.map(r=>[...r]);
    endTurn(nb,other(cur),capsW,capsB);
  };

  // ── رجوع خطوة ────────────────────────────────────────────
  const undoMove=()=>{
    if(history.length===0||winner) return;
    const prev=history[history.length-1];
    setHistory(h=>h.slice(0,-1));
    setBoard(prev.board);setCur(prev.cur);setCapsW(prev.capsW);setCapsB(prev.capsB);
    setCombo(prev.combo);setMsg(`↩️ رجعت خطوة`);
    if(prev.phase)setPhase(prev.phase);
    if(prev.placedW!==undefined){setPlacedW(prev.placedW);setPlacedB(prev.placedB);}
    if(prev.firstPlacer!==undefined)setFirstPlacer(prev.firstPlacer);
    if(prev.turnCount!==undefined)setTurnCount(prev.turnCount);
    setSel(null);setLocked(null);setVmoves([]);
    setSikaState(null);setSikaBlocked(null);setSikaGiver(null);setSikaFrom(null);
    setLastCaps([]);setAnim([]);setShaking([]);setShowCombo(false);
  };

  const resetGame=()=>{
    setBoard(emptyBoard());setPhase("placement");setCur(WHITE);setFirstPlacer(null);
    setPlacedW(0);setPlacedB(0);setTurnCount(0);
    setSel(null);setLocked(null);setVmoves([]);
    setSikaState(null);setSikaBlocked(null);setSikaGiver(null);setSikaFrom(null);
    setMsg("دور الأبيض ← ضع حجرين على اللوح");
    setWinner(null);setWinReason("");setCapsW([]);setCapsB([]);setLastCaps([]);
    setAnim([]);setShaking([]);setLastFrom(null);setCombo(0);setShowCombo(false);
    setHistory([]);setMoveLog([]);
  };

  const cellType=(r,c)=>{
    if(sikaState==="pick-piece"&&board[r][c]===sikaGiver&&getValidMoves(board,r,c).length>0) return "sika-piece";
    if(sikaState==="pick-cell"&&board[r][c]===EMPTY) return "sika-cell";
    if(isVM(r,c)) return "valid";
    return "";
  };

  const inSika=sikaState==="pick-piece"||sikaState==="pick-cell";
  const wOnBoard=countPieces(board,WHITE),bOnBoard=countPieces(board,BLACK);
  const wInHand=PIECES_PER_PLAYER-placedW,bInHand=PIECES_PER_PLAYER-placedB;

  // ── Hand Panel ────────────────────────────────────────────
  const HandPanel=({player})=>{
    const isW=player===WHITE;
    const inHand=isW?wInHand:bInHand,onBoard=isW?wOnBoard:bOnBoard;
    const myCaps=isW?capsW:capsB;
    const active=cur===player&&!winner&&!inSika;
    return (
      <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:7,
        padding:"12px 8px",borderRadius:16,minWidth:72,maxWidth:82,
        background:active?"linear-gradient(170deg,rgba(212,168,67,0.12),rgba(180,130,40,0.06))":"rgba(0,0,0,0.2)",
        border:`1.5px solid ${active?"rgba(212,168,67,0.5)":"rgba(212,168,67,0.1)"}`,
        boxShadow:active?"0 0 20px rgba(212,168,67,0.1)":"none",
        transition:"all .4s",backdropFilter:"blur(4px)"}}>
        <div style={{fontSize:"0.62rem",color:active?"#C8A96E":"#4a3010",
          fontFamily:"'Cairo',sans-serif",letterSpacing:1}}>
          {isW?"⚪ أبيض":"⚫ أسود"}{isVsAI&&!isW?" 🤖":""}
        </div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(4,14px)",gap:3}}>
          {Array(PIECES_PER_PLAYER).fill(null).map((_,i)=>(
            <div key={i} style={{width:14,height:14,borderRadius:"50%",
              background:i<inHand?(isW?"radial-gradient(circle at 32% 28%,#FFFFF0,#E8D9A8,#C8A96E)"
                                      :"radial-gradient(circle at 32% 28%,#4a4a4a,#1a1a1a)"):"rgba(255,255,255,0.04)",
              border:i<inHand?(isW?"1px solid #B89850":"1px solid #333"):"1px solid rgba(255,255,255,0.05)",
              boxShadow:i<inHand?(isW?"0 1px 3px rgba(0,0,0,0.4),inset 0 1px rgba(255,255,220,0.4)":"0 1px 3px rgba(0,0,0,0.6)"):"none",
              transition:"all .3s"}}/>
          ))}
        </div>
        <div style={{color:"#C8A96E",fontSize:"0.72rem",fontWeight:700,fontFamily:"'Cairo',sans-serif"}}>
          {inHand} <span style={{color:"#4a3010",fontSize:"0.58rem"}}>يد</span>
        </div>
        <div style={{color:"#3a2810",fontSize:"0.6rem",fontFamily:"'Cairo',sans-serif"}}>{onBoard} لوح</div>
        {myCaps.length>0&&(
          <div style={{width:"100%",borderTop:"1px solid rgba(212,168,67,0.1)",paddingTop:5}}>
            <div style={{color:"#3a2810",fontSize:"0.52rem",fontFamily:"'Cairo',sans-serif",marginBottom:2,textAlign:"center"}}>أكل</div>
            <div style={{display:"flex",flexWrap:"wrap",gap:2,justifyContent:"center"}}>
              {myCaps.map((_,i)=>(
                <div key={i} style={{width:9,height:9,borderRadius:"50%",
                  background:_===WHITE?"radial-gradient(circle,#f5f0e0,#a89870)":"radial-gradient(circle,#484848,#000)",
                  border:_===WHITE?"1px solid #a89870":"1px solid #333"}}/>
              ))}
            </div>
          </div>
        )}
        {active&&!winner&&<div style={{width:6,height:6,borderRadius:"50%",
          background:isW?"#E8D9A8":"#484848",border:"1.5px solid #C8A96E",
          boxShadow:"0 0 8px rgba(212,168,67,0.6)",animation:"beat .9s infinite"}}/>}
        {aiThinking&&isVsAI&&!isW&&(
          <div style={{color:"#C8A96E",fontSize:"0.52rem",fontFamily:"'Cairo',sans-serif",animation:"pulse 1s infinite"}}>يفكر...</div>
        )}
      </div>
    );
  };

  if(board.length!==BOARD_SIZE){resetGame();return null;}

  return (
    <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:10,width:"100%"}}>
      {winner&&<Confetti/>}

      {/* Combo */}
      {showCombo&&combo>1&&(
        <div style={{position:"fixed",top:"28%",left:"50%",transform:"translateX(-50%)",
          zIndex:150,padding:"8px 20px",borderRadius:20,
          background:"linear-gradient(135deg,rgba(212,168,67,0.9),rgba(160,100,20,0.9))",
          color:"#fff",fontFamily:"'Cairo',sans-serif",fontSize:"1.1rem",fontWeight:700,
          boxShadow:"0 0 30px rgba(212,168,67,0.6)",animation:"comboAnim .4s cubic-bezier(.34,1.56,.64,1)",
          pointerEvents:"none"}}>
          Combo ×{combo} 🔥
        </div>
      )}

      {/* Message */}
      <div style={{
        background:winner?"linear-gradient(135deg,rgba(212,168,67,0.2),rgba(160,100,20,0.15))"
          :inSika?"linear-gradient(135deg,rgba(200,80,20,0.2),rgba(150,40,10,0.15))"
          :"rgba(0,0,0,0.3)",
        border:`1px solid ${winner?"rgba(212,168,67,0.6)":inSika?"rgba(220,100,40,0.5)":"rgba(212,168,67,0.15)"}`,
        borderRadius:10,padding:"7px 18px",backdropFilter:"blur(8px)",
        color:winner?"#f5d78a":inSika?"#ffb080":"#C8A96E",
        fontFamily:"'Cairo',sans-serif",fontSize:"0.83rem",textAlign:"center",minWidth:240,
      }}>
        {winner?`🎉 ${winner===WHITE?"الأبيض":"الأسود"} فاز! ${winReason?`(${winReason})`:""}`:msg}
      </div>

      <div style={{display:"flex",alignItems:"center",gap:"clamp(5px,1.2vw,14px)"}}>
        <HandPanel player={WHITE}/>

        {/* BOARD */}
        <div style={{
          background:"linear-gradient(145deg,#2C1F0E,#1E1509,#251A0C,#1A1007)",
          border:"3px solid rgba(212,168,67,0.2)",borderRadius:12,padding:8,
          boxShadow:"0 20px 60px rgba(0,0,0,0.8),inset 0 1px 0 rgba(212,168,67,0.08)",
          position:"relative",
        }}>
          {[{top:5,right:5},{top:5,left:5},{bottom:5,right:5},{bottom:5,left:5}].map((s,i)=>(
            <div key={i} style={{position:"absolute",width:14,height:14,...s,
              borderTop:[0,1].includes(i)?"1.5px solid rgba(212,168,67,0.4)":"none",
              borderBottom:[2,3].includes(i)?"1.5px solid rgba(212,168,67,0.4)":"none",
              borderRight:[0,2].includes(i)?"1.5px solid rgba(212,168,67,0.4)":"none",
              borderLeft:[1,3].includes(i)?"1.5px solid rgba(212,168,67,0.4)":"none"}}/>
          ))}

          {Array(BOARD_SIZE).fill(null).map((_,r)=>(
            <div key={r} style={{display:"flex"}}>
              {Array(BOARD_SIZE).fill(null).map((_,c)=>{
                const piece=board[r][c];
                const ct=cellType(r,c);
                const center=r===2&&c===2;
                const corner=isSafe(r,c)&&!center;
                const isLF=lastFrom&&lastFrom[0]===r&&lastFrom[1]===c&&phase==="movement";
                const isLockedDim=locked&&!(locked[0]===r&&locked[1]===c)&&piece===cur&&phase==="movement";

                let cellBg,cellBorder;
                if(center){cellBg="rgba(212,168,67,0.08)";cellBorder="rgba(212,168,67,0.35)";}
                else if(corner){cellBg="rgba(212,168,67,0.05)";cellBorder="rgba(212,168,67,0.25)";}
                else if(isLF){cellBg="rgba(120,180,80,0.1)";cellBorder="rgba(140,200,80,0.3)";}
                else if(ct==="sika-piece"||ct==="sika-cell"){cellBg="rgba(200,80,20,0.1)";cellBorder="rgba(220,100,40,0.35)";}
                else{cellBg=(r+c)%2===0?"rgba(255,255,255,0.025)":"rgba(0,0,0,0.12)";cellBorder="rgba(212,168,67,0.07)";}

                return (
                  <div key={c}
                    className={ct==="valid"?"vm-cell":ct==="sika-piece"||ct==="sika-cell"?"sika-cell":""}
                    onClick={()=>{ if(phase==="placement")handlePlacement(r,c); else handleMovement(r,c); }}
                    style={{width:CELL,height:CELL,display:"flex",alignItems:"center",
                      justifyContent:"center",position:"relative",cursor:"pointer",
                      background:cellBg,border:`1px solid ${cellBorder}`,
                      borderRadius:4,boxSizing:"border-box",
                      opacity:isLockedDim?.3:1,transition:"opacity .3s,background .2s"}}>

                    {/* منطقة أمان الزوايا */}
                    {corner&&(
                      <div style={{position:"absolute",inset:3,borderRadius:3,
                        border:"1px solid rgba(212,168,67,0.2)",pointerEvents:"none",zIndex:1}}/>
                    )}

                    {/* المنتصف */}
                    {center&&(
                      <div style={{position:"absolute",inset:0,display:"flex",
                        alignItems:"center",justifyContent:"center",pointerEvents:"none",zIndex:1}}>
                        <div style={{width:30,height:30,borderRadius:"50%",
                          background:"radial-gradient(circle,rgba(212,168,67,0.2),rgba(212,168,67,0.03))",
                          border:"1px solid rgba(212,168,67,0.35)",
                          animation:"centerGlow 3s ease-in-out infinite",
                          display:"flex",alignItems:"center",justifyContent:"center"}}>
                          <div style={{width:14,height:14,background:"rgba(212,168,67,0.55)",
                            clipPath:"polygon(50% 0%,61% 35%,98% 35%,68% 57%,79% 91%,50% 70%,21% 91%,32% 57%,2% 35%,39% 35%)",
                            animation:"starSpin 8s linear infinite"}}/>
                        </div>
                      </div>
                    )}

                    {ct==="valid"&&!piece&&(
                      <div style={{position:"absolute",width:11,height:11,borderRadius:"50%",
                        background:"rgba(212,168,67,0.45)",border:"1px solid rgba(212,168,67,0.8)",
                        boxShadow:"0 0 8px rgba(212,168,67,0.3)",zIndex:2,pointerEvents:"none"}}/>
                    )}
                    {isCap(r,c)&&(
                      <div style={{position:"absolute",inset:0,borderRadius:4,
                        background:"rgba(220,60,40,0.18)",animation:"capFlash .4s ease",
                        zIndex:1,pointerEvents:"none"}}/>
                    )}
                    {piece&&(
                      <div style={{zIndex:3,position:"relative"}} className={isShake(r,c)?"piece-shake":""}>
                        <Piece color={piece} sel={isSel(r,c)} dropping={isAnim(r,c)} size={PS}/>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
        <HandPanel player={BLACK}/>
      </div>

      {/* Controls */}
      <div style={{display:"flex",gap:7,alignItems:"center",flexWrap:"wrap",justifyContent:"center"}}>
        {["placement","movement"].map(ph=>(
          <div key={ph} style={{padding:"3px 10px",borderRadius:20,
            background:phase===ph?"rgba(212,168,67,0.15)":"transparent",
            border:`1px solid ${phase===ph?"rgba(212,168,67,0.4)":"rgba(212,168,67,0.08)"}`,
            color:phase===ph?"#C8A96E":"#3a2810",fontFamily:"'Cairo',sans-serif",fontSize:"0.68rem"}}>
            {ph==="placement"?"التوزيع":"الحركة"}
          </div>
        ))}

        {/* زر أنهِ دوري — بعد أكل اختياري */}
        {locked&&!winner&&phase==="movement"&&(!isVsAI||cur!==aiPlayer)&&(
          <button onClick={endMyTurn} style={{padding:"4px 12px",borderRadius:20,
            background:"linear-gradient(135deg,rgba(80,180,80,0.2),rgba(40,120,40,0.15))",
            border:"1px solid rgba(100,200,100,0.4)",color:"#90e090",
            fontFamily:"'Cairo',sans-serif",fontSize:"0.7rem",cursor:"pointer",
            backdropFilter:"blur(4px)"}}>✅ أنهِ دوري</button>
        )}

        {sikaState==="waiting"&&!winner&&(
          <button onClick={pressSika} style={{padding:"4px 12px",borderRadius:20,
            background:"linear-gradient(135deg,rgba(200,60,20,0.5),rgba(150,40,10,0.35))",
            border:"1px solid rgba(220,100,40,0.5)",color:"#ffb080",
            fontFamily:"'Cairo',sans-serif",fontSize:"0.72rem",cursor:"pointer",fontWeight:700,
            animation:"sikaBeat 1s infinite"}}>🚪 طلب سكة</button>
        )}

        <button onClick={undoMove} disabled={history.length===0||!!winner} style={{
          padding:"3px 10px",borderRadius:20,
          background:history.length>0&&!winner?"rgba(100,160,220,0.12)":"rgba(255,255,255,0.02)",
          border:`1px solid ${history.length>0&&!winner?"rgba(100,160,220,0.35)":"rgba(255,255,255,0.04)"}`,
          color:history.length>0&&!winner?"#90c0f0":"#2a2010",
          fontFamily:"'Cairo',sans-serif",fontSize:"0.68rem",
          cursor:history.length>0&&!winner?"pointer":"not-allowed",
          backdropFilter:"blur(4px)",transition:"all .2s"}}>↩️ رجوع</button>

        <button onClick={resetGame} style={{padding:"3px 10px",borderRadius:20,
          background:"rgba(212,168,67,0.08)",border:"1px solid rgba(212,168,67,0.18)",
          color:"#C8A96E",fontFamily:"'Cairo',sans-serif",fontSize:"0.68rem",
          cursor:"pointer",backdropFilter:"blur(4px)"}}>🔄 جديد</button>

        <button onClick={onBack} style={{padding:"3px 10px",borderRadius:20,
          background:"transparent",border:"1px solid rgba(212,168,67,0.07)",
          color:"#3a2810",fontFamily:"'Cairo',sans-serif",fontSize:"0.68rem",cursor:"pointer"}}>← رجوع</button>
      </div>

      {phase==="placement"&&!winner&&(
        <div style={{display:"flex",gap:6,alignItems:"center"}}>
          {[0,1].map(i=>(
            <div key={i} style={{width:18,height:18,borderRadius:"50%",
              background:i<turnCount?(cur===WHITE?"radial-gradient(circle at 32% 28%,#FFFFF0,#E8D9A8,#C8A96E)"
                                                 :"radial-gradient(circle at 32% 28%,#4a4a4a,#1a1a1a)"):"rgba(212,168,67,0.08)",
              border:i<turnCount?"1.5px solid rgba(212,168,67,0.5)":"1px solid rgba(212,168,67,0.08)",
              boxShadow:i<turnCount?"0 0 8px rgba(212,168,67,0.35)":"none",transition:"all .3s"}}/>
          ))}
          <span style={{color:"#4a3810",fontFamily:"'Cairo',sans-serif",fontSize:"0.65rem"}}>
            {turnCount<2?`ضع ${2-turnCount} حجر${2-turnCount===2?"ين":""}`: "ينتقل الدور..."}
          </span>
        </div>
      )}
    </div>
  );
}

// ── MENU ───────────────────────────────────────────────────
function Menu({onSelect}) {
  const modes=[
    {id:"vs-ai",  icon:"🤖",title:"ضد الكمبيوتر",sub:"ذكاء اصطناعي استراتيجي"},
    {id:"2player",icon:"👥",title:"لاعبان",       sub:"على نفس الجهاز"},
    {id:"online", icon:"🌐",title:"أونلاين",      sub:"قريباً..."},
  ];
  return (
    <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:14}}>
      <p style={{color:"rgba(212,168,67,0.4)",fontFamily:"'Cairo',sans-serif",fontSize:"0.8rem",margin:"0 0 8px",letterSpacing:2}}>
        اختر وضع اللعب
      </p>
      {modes.map(m=>(
        <button key={m.id} onClick={()=>m.id!=="online"&&onSelect(m.id)} style={{
          width:260,padding:"15px 20px",borderRadius:14,
          background:m.id==="online"?"rgba(0,0,0,0.15)":"linear-gradient(135deg,rgba(212,168,67,0.1),rgba(160,100,20,0.07))",
          border:`1.5px solid ${m.id==="online"?"rgba(212,168,67,0.06)":"rgba(212,168,67,0.25)"}`,
          color:m.id==="online"?"#2a1808":"#C8A96E",
          fontFamily:"'Cairo',sans-serif",cursor:m.id==="online"?"not-allowed":"pointer",
          display:"flex",alignItems:"center",gap:16,
          backdropFilter:"blur(8px)",
          boxShadow:m.id!=="online"?"0 0 20px rgba(212,168,67,0.06)":"none",
          transition:"all .25s",opacity:m.id==="online"?.35:1,
        }}
        onMouseEnter={e=>{ if(m.id!=="online") e.currentTarget.style.background="linear-gradient(135deg,rgba(212,168,67,0.18),rgba(160,100,20,0.12))"; }}
        onMouseLeave={e=>{ if(m.id!=="online") e.currentTarget.style.background="linear-gradient(135deg,rgba(212,168,67,0.1),rgba(160,100,20,0.07))"; }}
        >
          <span style={{fontSize:"1.7rem"}}>{m.icon}</span>
          <div style={{textAlign:"right"}}>
            <div style={{fontWeight:700,fontSize:"0.92rem"}}>{m.title}</div>
            <div style={{fontSize:"0.65rem",color:m.id==="online"?"#2a1808":"#6a4820",marginTop:2}}>{m.sub}</div>
          </div>
        </button>
      ))}

      {/* ملخص القوانين */}
      <div style={{marginTop:8,display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:6,maxWidth:280,width:"100%"}}>
        {[
          {e:"🛡️",t:"مناطق أمان",d:"4 زوايا + المنتصف"},
          {e:"🍽️",t:"أكل اختياري",d:"يمكنك تجاوزه للفخ"},
          {e:"🔁",t:"تكرار",d:"أكثر من 3× يفوز الأكثر"},
          {e:"🏆",t:"فوز",d:"حجر واحد أو حجران مقابل 6+"},
        ].map((x,i)=>(
          <div key={i} style={{background:"rgba(0,0,0,0.2)",border:"1px solid rgba(212,168,67,0.08)",
            borderRadius:8,padding:"6px 8px",backdropFilter:"blur(4px)"}}>
            <div style={{fontSize:"0.9rem"}}>{x.e}</div>
            <div style={{color:"#8a6830",fontFamily:"'Cairo',sans-serif",fontSize:"0.62rem",fontWeight:600}}>{x.t}</div>
            <div style={{color:"#3a2810",fontFamily:"'Cairo',sans-serif",fontSize:"0.56rem",lineHeight:1.3}}>{x.d}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── ROOT ───────────────────────────────────────────────────
export default function AlSija() {
  const [screen,setScreen]=useState("menu");
  const [mode,  setMode  ]=useState(null);

  return (
    <div style={{minHeight:"100vh",
      background:"linear-gradient(160deg,#0F0A05 0%,#1A0F07 40%,#120B04 70%,#0A0602 100%)",
      display:"flex",flexDirection:"column",alignItems:"center",
      justifyContent:"center",fontFamily:"'Amiri','Cairo',serif",
      direction:"rtl",padding:16,userSelect:"none"}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Amiri:wght@400;700&family=Cairo:wght@400;600;700&display=swap');
        @keyframes pulse{0%,100%{transform:scale(1)}50%{transform:scale(1.25)}}
        @keyframes piece-drop{0%{transform:scale(0)rotate(-180deg);opacity:0}100%{transform:scale(1)rotate(0);opacity:1}}
        @keyframes piece-shake{0%,100%{transform:translateX(0)}20%{transform:translateX(-4px)}40%{transform:translateX(4px)}60%{transform:translateX(-3px)}80%{transform:translateX(3px)}}
        @keyframes shimmer{0%{background-position:200% center}100%{background-position:-200% center}}
        @keyframes beat{0%,100%{box-shadow:0 0 6px rgba(212,168,67,.5)}50%{box-shadow:0 0 16px rgba(212,168,67,.9)}}
        @keyframes sikaBeat{0%,100%{box-shadow:0 0 8px rgba(220,80,20,.4)}50%{box-shadow:0 0 20px rgba(220,80,20,.8)}}
        @keyframes centerGlow{0%,100%{box-shadow:0 0 8px rgba(212,168,67,.25)}50%{box-shadow:0 0 20px rgba(212,168,67,.55)}}
        @keyframes starSpin{0%{transform:rotate(0deg)}100%{transform:rotate(360deg)}}
        @keyframes capFlash{0%{opacity:1}100%{opacity:0}}
        @keyframes confettiFall{0%{transform:translateY(-20px)rotate(0deg);opacity:1}100%{transform:translateY(100vh)rotate(720deg);opacity:0}}
        @keyframes comboAnim{0%{transform:translateX(-50%)scale(0)}100%{transform:translateX(-50%)scale(1)}}
        .vm-cell{animation:pulse .85s infinite;cursor:pointer;}
        .sika-cell{animation:pulse .7s infinite;cursor:pointer;}
        .piece-drop{animation:piece-drop .4s cubic-bezier(.34,1.56,.64,1) forwards;}
        .piece-shake{animation:piece-shake .4s ease;}
      `}</style>

      <div style={{marginBottom:screen==="menu"?22:14,textAlign:"center"}}>
        <h1 style={{fontSize:"clamp(2rem,5vw,3rem)",margin:"0 0 2px",
          fontFamily:"'Amiri',serif",fontWeight:700,letterSpacing:2,
          background:"linear-gradient(135deg,#f5d78a,#d4a843,#a07030,#d4a843,#f5d78a)",
          backgroundSize:"300% auto",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",
          animation:"shimmer 5s linear infinite"}}>السيجة</h1>
        <p style={{color:"rgba(212,168,67,0.25)",fontSize:"0.62rem",margin:0,
          fontFamily:"'Cairo',sans-serif",letterSpacing:3}}>MODERN HERITAGE</p>
      </div>

      {screen==="menu"
        ?<Menu onSelect={m=>{setMode(m);setScreen("game");}}/>
        :<ErrorBoundary><Game mode={mode} onBack={()=>setScreen("menu")}/></ErrorBoundary>
      }
    </div>
  );
}
