
(()=>{
"use strict";
const KEY="mirei-counter-v1-final",MAX=9999999,FACES=["⚀","⚁","⚂","⚃","⚄","⚅"];
const fresh=()=>({e:0,persona:false,bow:false,diava:false,diavaFirst:true,diavaDriveReady:true,bowFirst:true,bowUsed:false,bowPower:0,bowPending:false,bowPhase:"off",fxEnabled:true,dice:null,characterAlt:false,rideUnlocked:false,counters:Array.from({length:3},()=>({power:0,star:0,drive:0}))});
let state=load();
let cinematicBusy=false;
let battleCycle=0;

if(state.diavaFirst===undefined)state.diavaFirst=true;
if(state.diavaDriveReady===undefined)state.diavaDriveReady=true;
if(state.bowFirst===undefined)state.bowFirst=true;
if(state.bowUsed===undefined)state.bowUsed=false;
if(state.bowPower===undefined)state.bowPower=0;
if(state.bowPending===undefined)state.bowPending=false;
if(state.bowPhase===undefined)state.bowPhase=state.bowUsed?"used":(state.bowPower?"active":"off");

// PHASE4.2.1: every page launch begins in sealed state.
state.rideUnlocked=false;
state.persona=false;
state.diava=false;
state.diavaFirst=true;
state.bow=false;
state.bowFirst=true;
state.bowUsed=false;
state.bowPower=0;
state.bowPending=false;
state.bowPhase="off";
state.characterAlt=false;



const countersEl=document.getElementById("counters"),tpl=document.getElementById("counterTemplate"),cards=[];
for(let i=0;i<3;i++){const card=tpl.content.firstElementChild.cloneNode(true);card.dataset.i=i;countersEl.appendChild(card);cards.push(card);wireCard(card,i)}

const eDisplay=document.getElementById("eDisplay"),persona=document.getElementById("persona"),diava=document.getElementById("diava"),bow=document.getElementById("bow"),fxSwitch=document.getElementById("fxSwitch");
const dice=document.getElementById("dice"),dieFace=document.getElementById("dieFace"),dieResult=document.getElementById("dieResult");
const allReset=document.getElementById("allReset"),progress=document.getElementById("progress"),character=document.getElementById("characterStage");
const rideStateBadge=document.getElementById("rideStateBadge");

["contextmenu","selectstart","dragstart"].forEach(type=>{
 document.addEventListener(type,e=>{
  if(e.target.closest?.(".app,.ultimate-overlay,#personaCinematicFx,.bow-choice"))e.preventDefault();
 },{capture:true});
});
document.querySelectorAll("img").forEach(img=>img.draggable=false);


document.querySelectorAll("[data-e]").forEach(b=>repeat(b,()=>{state.e=clamp(state.e+Number(b.dataset.e),0,10);commit()}));
document.querySelectorAll("[data-front]").forEach(b=>repeat(b,()=>{const d=Number(b.dataset.front);state.counters.forEach(c=>c.power=clamp(c.power+d,0,MAX));commit()}));

persona.onclick=()=>{if(!state.rideUnlocked)return;
 const turningOn=!state.persona;
 const d=state.persona?-10000:10000;
 state.persona=!state.persona;
 state.counters.forEach(c=>c.power=clamp(c.power+d,0,MAX));
 commit();
 if(turningOn&&state.fxEnabled)playPersonaCinematic();
};
diava.onclick=()=>{if(!state.rideUnlocked||cinematicBusy)return;
 const longVersion=state.diavaFirst!==false;
 const addDrive=state.diavaDriveReady!==false;
 const cycle=battleCycle;
 cinematicBusy=true;
 playDiavaCinematic(longVersion,addDrive,()=>{
  if(cycle!==battleCycle)return;
  state.counters.forEach(c=>c.power=clamp(c.power+5000,0,MAX));
  if(addDrive){
   state.counters[1].drive=clamp(state.counters[1].drive+1,-9,9);
   state.diavaDriveReady=false;
  }
  if(longVersion)state.diavaFirst=false;
  state.diava=true;
  cinematicBusy=false;
  commit();
 });
};
bow.onclick=()=>{if(!state.rideUnlocked||cinematicBusy)return;
 if(state.bowPhase==="used")return;

 if(state.bowPhase==="active"){
  if(state.bowPower){
   state.counters[1].power=clamp(state.counters[1].power-state.bowPower,0,MAX);
  }
  state.bowPower=0;
  state.bow=false;
  state.bowUsed=true;
  state.bowPending=false;
  state.bowPhase="used";
  commit();
  return;
 }

 cinematicBusy=true;
 const bowFirst=state.bowFirst!==false;
 const cycle=battleCycle;
 playBowCinematic(()=>{
  if(cycle!==battleCycle)return;
  state.bowFirst=false;
  state.bowPending=true;
  state.bowPhase="select";
  cinematicBusy=false;
  commit();
  showBowChoice();
 });
};

function lockedFeedback(button){
 button.classList.remove("locked-feedback");void button.offsetWidth;
 button.classList.add("locked-feedback");
 setTimeout(()=>button.classList.remove("locked-feedback"),400);
 navigator.vibrate?.([22,28,22]);
}
[persona,diava,bow].forEach(button=>{
 button.addEventListener("pointerdown",()=>{
  if(!state.rideUnlocked)lockedFeedback(button);
 },{passive:true});
});

fxSwitch.onclick=()=>{
 state.fxEnabled=!state.fxEnabled;
 commit();
};
dice.onclick=rollDice;
wireAllReset();
wireRideLongPress();
render();

function wireRideLongPress(){
 let timer=null,p=null;
 const cancel=()=>{clearTimeout(timer);timer=null;p=null};
 character.addEventListener("pointerdown",e=>{
  if(state.rideUnlocked||p!==null)return;
  e.preventDefault();p=e.pointerId;character.setPointerCapture?.(p);
  timer=setTimeout(()=>{
   if(state.rideUnlocked)return;
   playRideUnlock(()=>{
    resetAbilityCinematics();
    state.rideUnlocked=true;
    state.persona=false;state.diava=false;state.diavaFirst=true;state.diavaDriveReady=true;state.bow=false;state.bowFirst=true;state.bowUsed=false;state.bowPower=0;state.bowPending=false;state.bowPhase="off";
    commit();
   });
  },1000);
 });
 character.addEventListener("pointerup",cancel);
 character.addEventListener("pointercancel",cancel);
 character.addEventListener("lostpointercapture",cancel);
 character.oncontextmenu=e=>e.preventDefault();
}

function wireCard(card,i){
 card.querySelectorAll("[data-delta]").forEach(b=>repeat(b,()=>{
  const delta=Number(b.dataset.delta);
  state.counters[i].power=clamp(state.counters[i].power+delta,0,MAX);
  if(delta===1000000){ state.characterAlt=true; if(state.fxEnabled)playOverTrigger(); }
  commit();
}));
 card.querySelector(".star-plus").onclick=()=>{state.counters[i].star=clamp(state.counters[i].star+1,0,99);commit()};
 card.querySelector(".star-minus").onclick=()=>{state.counters[i].star=clamp(state.counters[i].star-1,0,99);commit()};
 card.querySelector(".drive-plus").onclick=()=>{state.counters[i].drive=clamp(state.counters[i].drive+1,-9,9);commit()};
 card.querySelector(".drive-minus").onclick=()=>{state.counters[i].drive=clamp(state.counters[i].drive-1,-9,9);commit()};
 card.querySelector(".reset-btn").onclick=()=>{
   state.counters[i]={power:0,star:0,drive:0};
   commit();
 };
}
function rollDice(){
 if(dice.classList.contains("rolling"))return;
 dice.classList.add("rolling");let n=0;
 const t=setInterval(()=>{const v=rand();dieFace.textContent=FACES[v-1];dieResult.textContent=v;
 if(++n>=12){clearInterval(t);state.dice=rand();dice.classList.remove("rolling");commit()}},65)
}
function wireAllReset(){
 let p=null,longTimer=null,progTimer=null,longDone=false,start=0;
 const clear=()=>{clearTimeout(longTimer);clearInterval(progTimer);progress.style.width="0%"};
 allReset.addEventListener("pointerdown",e=>{if(p!==null)return;e.preventDefault();p=e.pointerId;longDone=false;start=performance.now();allReset.setPointerCapture?.(p);
 progTimer=setInterval(()=>progress.style.width=Math.min(100,(performance.now()-start)/10)+"%",50);
 longTimer=setTimeout(()=>{longDone=true;resetAll(true);allReset.classList.add("success");setTimeout(()=>allReset.classList.remove("success"),500);navigator.vibrate?.(40)},1000)});
 allReset.addEventListener("pointerup",e=>{if(e.pointerId!==p)return;e.preventDefault();clear();if(!longDone)resetAll(false);p=null});
 allReset.addEventListener("pointercancel",()=>{clear();p=null});allReset.addEventListener("lostpointercapture",()=>{clear();p=null});allReset.oncontextmenu=e=>e.preventDefault()
}
function resetAbilityCinematics(){
 battleCycle++;
 cinematicBusy=false;
 hideBowChoice();
 document.querySelectorAll(
  "#diavaFx,#diavaRepeatFx,#bowFx,#shieldFx,#personaCinematicFx"
 ).forEach(fx=>{
  fx.classList.remove("active");
  fx.setAttribute("aria-hidden","true");
  fx.querySelectorAll("*").forEach(el=>{
   if(el.tagName==="CANVAS"){
    const ctx=el.getContext?.("2d");
    if(ctx)ctx.clearRect(0,0,el.width,el.height);
   }
   el.style.animation="none";
  });
  void fx.offsetWidth;
  fx.querySelectorAll("*").forEach(el=>el.style.animation="");
 });
 document.documentElement.classList.remove("phase3-shake");
}
function resetAll(sealMode){
 if(!sealMode){
  // Short press: reset battle state, keep E and the current unlock state.
  resetAbilityCinematics();
  state.counters=Array.from({length:3},()=>({power:0,star:0,drive:0}));
  state.persona=false;
  state.diava=false;
  state.diavaDriveReady=true;
  state.bow=false;
  state.bowFirst=true;
  state.bowUsed=false;
  state.bowPower=0;
  state.bowPending=false;
  state.bowPhase="off";
  state.dice=null;
  state.characterAlt=false;
  commit();
  return;
 }
 const finish=()=>{
  resetAbilityCinematics();
  state.counters=Array.from({length:3},()=>({power:0,star:0,drive:0}));
  state.persona=false;
  state.diava=false;
  state.diavaFirst=true;
  state.diavaDriveReady=true;
  state.bow=false;
  state.bowFirst=true;
  state.bowUsed=false;
  state.bowPower=0;
  state.bowPending=false;
  state.bowPhase="off";
  state.dice=null;
  state.characterAlt=false;
  state.rideUnlocked=false;
  state.e=0;
  commit();
 };
 if(state.rideUnlocked&&state.fxEnabled){
  window.phase436FightEnd?.(finish);
 }else finish();
}
function repeat(el,fn){
 let p=null,startTimer=null,repeatTimer=null,ms=190;
 const stop=e=>{if(e&&p!==null&&e.pointerId!==p)return;clearTimeout(startTimer);clearTimeout(repeatTimer);p=null;ms=190};
 const go=()=>{fn();ms=Math.max(55,ms-14);repeatTimer=setTimeout(go,ms)};
 el.addEventListener("pointerdown",e=>{if(p!==null)return;e.preventDefault();p=e.pointerId;el.setPointerCapture?.(p);fn();startTimer=setTimeout(go,420)});
 el.addEventListener("pointerup",stop);el.addEventListener("pointercancel",stop);el.addEventListener("lostpointercapture",()=>stop());el.oncontextmenu=e=>e.preventDefault()
}


function restartCinematicOverlay(fx){
 if(!fx)return;
 fx.classList.remove("active");
 const animated=fx.querySelectorAll(".weapon-dark,.weapon-art,.weapon-title,.weapon-call,.weapon-result,.weapon-flash,.weapon-impact-ring");
 animated.forEach(el=>{el.style.animation="none";el.style.opacity="0";});
 void fx.offsetWidth;
 animated.forEach(el=>{el.style.animation="";el.style.opacity="";});
 void fx.offsetWidth;
 fx.classList.add("active");
}

function playDiavaCinematic(longVersion,addDrive,done){
 if(!longVersion){
  const fx=document.getElementById("diavaRepeatFx");
  const text=fx.querySelector(".diava-repeat-text");
  text.innerHTML=addDrive
   ? '<small>封焔の剣</small><strong>ディヤーヴァ</strong><b>装備！</b><em>前列のパワー＋5000！<br>ドライブ＋1！</em>'
   : '<small>封焔の剣</small><strong>ディヤーヴァ</strong><b>右神装備！</b><em>前列のパワー＋5000！</em>';
  fx.classList.remove("active");void fx.offsetWidth;fx.classList.add("active");
  navigator.vibrate?.([35,25,70]);
  setTimeout(()=>{fx.classList.remove("active");done?.()},1020);
  return;
 }
 const fx=document.getElementById("diavaFx"),result=document.getElementById("diavaResult");
 result.innerHTML="前列のパワー<br><b>＋5000！</b><br>ドライブ <b>＋1！</b>";
 restartCinematicOverlay(fx);
 simpleFlameCanvas("diavaFlameCanvas",3700);setTimeout(phase3Shake,1150);
 navigator.vibrate?.([45,35,90,35,140]);
 setTimeout(()=>{fx.classList.remove("active");done?.()},3740);
}
function playBowCinematic(done){
 const fx=document.getElementById("bowFx");
 restartCinematicOverlay(fx);
 simpleFlameCanvas("bowFlameCanvas",3700);setTimeout(phase3Shake,1150);
 navigator.vibrate?.([55,35,110]);
 setTimeout(()=>{fx.classList.remove("active");done?.()},3740);
}
function showBowChoice(){document.getElementById("bowChoice")?.classList.add("active")}
function hideBowChoice(){document.getElementById("bowChoice")?.classList.remove("active")}
document.querySelectorAll("[data-bow-power]").forEach(btn=>btn.onclick=()=>{
 if(!state.bowPending||cinematicBusy)return;
 const value=Number(btn.dataset.bowPower);
 const cycle=battleCycle;
 state.bowPending=false;state.bowPhase="select";hideBowChoice();cinematicBusy=true;
 playShieldCinematic(value,()=>{
  if(cycle!==battleCycle)return;
  state.counters[1].power=clamp(state.counters[1].power+value,0,MAX);
  state.bow=true;state.bowUsed=false;state.bowPower=value;state.bowPhase="active";
  cinematicBusy=false;commit();
 });
});
function playShieldCinematic(value,done){
 const fx=document.getElementById("shieldFx");
 document.getElementById("shieldPowerText").textContent="パワー ＋"+value.toLocaleString("ja-JP")+"！";
 fx.classList.remove("active");void fx.offsetWidth;fx.classList.add("active");
 phase3Shake();
 burstParticles("shieldParticleCanvas",950,"blue");
 navigator.vibrate?.([35,25,80]);
 setTimeout(()=>{fx.classList.remove("active");done?.()},1020);
}

function render(){
 document.body.classList.toggle("ride-unlocked",!!state.rideUnlocked);
 rideStateBadge.textContent=state.rideUnlocked?"解放状態":"封印状態";
 rideStateBadge.classList.toggle("released",!!state.rideUnlocked);
 rideStateBadge.classList.toggle("sealed",!state.rideUnlocked);
 [persona,diava,bow].forEach(b=>b.classList.toggle("locked",!state.rideUnlocked));

 fxSwitch.classList.toggle("on",state.fxEnabled);
 fxSwitch.classList.toggle("off",!state.fxEnabled);
 fxSwitch.querySelector(".fx-state").textContent=state.fxEnabled?"ON":"OFF";

 character.classList.toggle("is-held",!!state.characterAlt);
 eDisplay.textContent="E"+state.e;
 persona.classList.toggle("off",!state.persona);
 diava.classList.toggle("off",!state.diava);
 bow.classList.toggle("off",!state.bow);
 bow.classList.remove("used","bow-off","bow-active","bow-used");
 bow.classList.toggle("bow-off",state.bowPhase==="off"||state.bowPhase==="select");
 bow.classList.toggle("bow-active",state.bowPhase==="active");
 bow.classList.toggle("bow-used",state.bowPhase==="used");
 if(state.rideUnlocked){
  if(state.bowPhase==="active"){
   bow.innerHTML='<span class="bow-main-label">ボウダナート</span><span class="bow-sub-label">発動中</span>';
  }else if(state.bowPhase==="used"){
   bow.innerHTML='<span class="bow-main-label">ボウダナート</span><span class="bow-sub-label">使用済</span>';
  }else{
   bow.innerHTML='<span class="bow-main-label">ボウダナート</span><span class="bow-sub-label">未使用</span>';
  }
 }
 cards[1].classList.toggle("hex-guard",state.bowPhase==="active"&&!!state.bowPower);
 if(state.bowPending)showBowChoice(); else hideBowChoice();
 dieResult.textContent=state.dice??"−";dieFace.textContent=state.dice?FACES[state.dice-1]:"⚄";
 cards.forEach((card,i)=>{const c=state.counters[i],shown=c.power<=99999?String(c.power):String(c.power).padStart(7,"0"),p=card.querySelector(".power");
 p.querySelector(".first").textContent=shown.length===7?shown[0]:"";
 p.querySelector(".rest").textContent=shown.length===7?shown.slice(1):shown;
 p.classList.toggle("nonzero",c.power>0);
 const starEl=card.querySelector(".star"),driveEl=card.querySelector(".drive");starEl.textContent=c.star===0?"":(c.star>0?"☆+"+c.star:"☆"+c.star);driveEl.textContent=c.drive===0?"":(c.drive>0?"D+"+c.drive:"D"+c.drive);starEl.classList.toggle("value-zero",c.star===0);driveEl.classList.toggle("value-zero",c.drive===0)})
}
function commit(){render();localStorage.setItem(KEY,JSON.stringify(state))}
function load(){
 try{
  const x=JSON.parse(localStorage.getItem(KEY));
  const loaded=x&&x.counters?.length===3?{...fresh(),...x}:fresh();
  const migrationKey=KEY+"_phase431";
  if(!localStorage.getItem(migrationKey)){
   loaded.counters.forEach(c=>{if(c.star===1)c.star=0});
   localStorage.setItem(migrationKey,"1");
  }
  return loaded;
 }catch{return fresh()}
}
function clamp(v,a,b){return Math.min(b,Math.max(a,v))}function rand(){return Math.floor(Math.random()*6)+1}
})();



function phase3Shake(){
 const root=document.documentElement;
 root.classList.remove("phase3-shake");void root.offsetWidth;
 root.classList.add("phase3-shake");
 setTimeout(()=>root.classList.remove("phase3-shake"),520);
}
function burstParticles(canvasId,duration=2000,mode="blue"){
 const c=document.getElementById(canvasId);if(!c)return;
 const ctx=c.getContext("2d"),dpr=Math.min(devicePixelRatio||1,2);
 c.width=innerWidth*dpr;c.height=innerHeight*dpr;c.style.width=innerWidth+"px";c.style.height=innerHeight+"px";
 ctx.setTransform(dpr,0,0,dpr,0,0);
 const start=performance.now(),cx=innerWidth/2,cy=innerHeight/2,parts=[];
 for(let i=0;i<150;i++){
  const a=Math.random()*Math.PI*2,s=2+Math.random()*11;
  parts.push({x:cx,y:cy,vx:Math.cos(a)*s,vy:Math.sin(a)*s,r:1+Math.random()*5,life:1,spin:Math.random()*6.28});
 }
 function frame(now){
  const t=now-start;ctx.clearRect(0,0,innerWidth,innerHeight);
  ctx.globalCompositeOperation="lighter";
  for(const p of parts){
   p.life-=.012;p.vx*=.985;p.vy*=.985;p.vy+=.02;p.x+=p.vx;p.y+=p.vy;p.spin+=.12;
   if(p.life<=0)continue;
   ctx.save();ctx.translate(p.x,p.y);ctx.rotate(p.spin);
   if(mode==="rainbow"){
    ctx.fillStyle=`hsla(${(p.spin*90+t*.12)%360},100%,65%,${p.life})`;
   }else{
    ctx.fillStyle=`rgba(${Math.random()>.7?220:30},${190+Math.random()*65|0},255,${p.life})`;
   }
   ctx.fillRect(-p.r*2,-p.r/2,p.r*4,p.r);
   ctx.restore();
  }
  ctx.globalCompositeOperation="source-over";
  if(t<duration)requestAnimationFrame(frame);else ctx.clearRect(0,0,innerWidth,innerHeight);
 }
 requestAnimationFrame(frame);
}

function simpleFlameCanvas(canvasId,duration=8000){
 const canvas=document.getElementById(canvasId);if(!canvas)return;
 const ctx=canvas.getContext("2d"),dpr=Math.min(devicePixelRatio||1,2);
 canvas.width=innerWidth*dpr;canvas.height=innerHeight*dpr;
 canvas.style.width=innerWidth+"px";canvas.style.height=innerHeight+"px";
 ctx.setTransform(dpr,0,0,dpr,0,0);
 const start=performance.now(),parts=[];
 function spawn(power){
  for(let i=0;i<7;i++)parts.push({
   x:Math.random()*innerWidth,y:innerHeight+30,
   vx:(Math.random()-.5)*2,vy:-(1.8+Math.random()*4+power*3),
   r:18+Math.random()*58,life:1,dec:.008+Math.random()*.012
  });
 }
 function frame(now){
  const t=now-start;ctx.clearRect(0,0,innerWidth,innerHeight);
  const p=Math.min(1,t/(duration*.7));spawn(p);
  ctx.globalCompositeOperation="lighter";
  for(let i=parts.length-1;i>=0;i--){
   const q=parts[i];q.life-=q.dec;q.x+=q.vx;q.y+=q.vy;
   if(q.life<=0){parts.splice(i,1);continue}
   const g=ctx.createRadialGradient(q.x,q.y,0,q.x,q.y,q.r*q.life);
   g.addColorStop(0,`rgba(255,255,255,${q.life*.9})`);
   g.addColorStop(.2,`rgba(90,240,255,${q.life*.75})`);
   g.addColorStop(.55,`rgba(0,100,255,${q.life*.55})`);
   g.addColorStop(1,"rgba(0,20,120,0)");
   ctx.fillStyle=g;ctx.beginPath();ctx.ellipse(q.x,q.y,q.r*.45,q.r,0,0,Math.PI*2);ctx.fill();
  }
  ctx.globalCompositeOperation="source-over";
  if(t<duration)requestAnimationFrame(frame);else ctx.clearRect(0,0,innerWidth,innerHeight);
 }
 requestAnimationFrame(frame);
}
function playRideUnlock(done){
 const fx=document.getElementById("rideUnlockFx");if(!fx)return done?.();
 fx.classList.remove("active");void fx.offsetWidth;fx.classList.add("active");
 simpleFlameCanvas("rideFlameCanvas",8000);setTimeout(phase3Shake,6050);
 setTimeout(()=>window.phase435RideBurst?.(),6050);
 navigator.vibrate?.([60,60,80,60,120,50,200]);
 setTimeout(()=>{fx.classList.remove("active");done?.()},8050);
}
function playOverTrigger(){
 const fx=document.getElementById("overTriggerFx");if(!fx)return;
 fx.classList.remove("active");void fx.offsetWidth;fx.classList.add("active");
 burstParticles("overParticleCanvas",3000,"rainbow");setTimeout(phase3Shake,620);
 navigator.vibrate?.([40,30,80,30,120]);
 setTimeout(()=>fx.classList.remove("active"),3250);
}
function playSealReset(){
 const fx=document.getElementById("sealResetFx");if(!fx)return;
 fx.classList.remove("active");void fx.offsetWidth;fx.classList.add("active");
 navigator.vibrate?.([80,30,160]);
 setTimeout(()=>fx.classList.remove("active"),2850);
}

let personaCinematicBusy=false;
let blueFlameAnimationId=0;

function startRealBlueFlames(){
 const canvas=document.getElementById("blueFlameCanvas");
 const fx=document.getElementById("personaCinematicFx");
 if(!canvas||!fx)return;
 const ctx=canvas.getContext("2d");
 let W=canvas.width=innerWidth*devicePixelRatio;
 let H=canvas.height=innerHeight*devicePixelRatio;
 canvas.style.width=innerWidth+"px";
 canvas.style.height=innerHeight+"px";
 ctx.setTransform(devicePixelRatio,0,0,devicePixelRatio,0,0);
 W=innerWidth;H=innerHeight;
 let start=performance.now();
 const particles=[];
 const sparks=[];
 const resize=()=>{
  canvas.width=innerWidth*devicePixelRatio;
  canvas.height=innerHeight*devicePixelRatio;
  canvas.style.width=innerWidth+"px";canvas.style.height=innerHeight+"px";
  ctx.setTransform(devicePixelRatio,0,0,devicePixelRatio,0,0);
  W=innerWidth;H=innerHeight;
 };
 addEventListener("resize",resize,{once:true});

 function spawnFlame(strength){
  const side=Math.random()<.5?0:1;
  const edgeBias=Math.random();
  const x=side===0 ? W*(.02+edgeBias*.34) : W*(.64+edgeBias*.34);
  const baseY=H*(.82+Math.random()*.22);
  const count=Math.floor(2+strength*5);
  for(let i=0;i<count;i++){
   particles.push({
    x:x+(Math.random()-.5)*70,
    y:baseY+(Math.random()-.5)*24,
    vx:(Math.random()-.5)*.55+(W/2-x)*.0003,
    vy:-(1.1+Math.random()*2.2+strength*1.7),
    life:1,
    decay:.007+Math.random()*.012,
    size:18+Math.random()*40+strength*34,
    sway:Math.random()*6.28,
    hue:195+Math.random()*35,
   });
  }
 }
 function spawnBurst(){
  for(let i=0;i<140;i++){
   const a=Math.random()*Math.PI*2;
   const speed=2+Math.random()*11;
   particles.push({
    x:W*.5,y:H*.55,vx:Math.cos(a)*speed,vy:Math.sin(a)*speed,
    life:1,decay:.012+Math.random()*.016,size:14+Math.random()*45,
    sway:Math.random()*6.28,hue:190+Math.random()*35
   });
  }
  for(let i=0;i<80;i++){
   const a=Math.random()*Math.PI*2,s=3+Math.random()*10;
   sparks.push({x:W*.5,y:H*.55,vx:Math.cos(a)*s,vy:Math.sin(a)*s,life:1,decay:.018+Math.random()*.02});
  }
 }
 let burstDone=false;
 function draw(now){
  const t=(now-start)/1000;
  ctx.clearRect(0,0,W,H);
  const strength=Math.min(1,Math.max(.12,t/5.3));
  if(t<5.55){ for(let i=0;i<3;i++)spawnFlame(strength); }
  if(t>=5.55&&!burstDone){burstDone=true;spawnBurst();}
  if(t>=5.55&&t<6.75){for(let i=0;i<6;i++)spawnFlame(1.4);}
  ctx.globalCompositeOperation="lighter";
  for(let i=particles.length-1;i>=0;i--){
   const p=particles[i];
   p.life-=p.decay;
   p.x+=p.vx+Math.sin(now*.003+p.sway)*.65;
   p.y+=p.vy;
   p.vx*=.992;p.vy*=.995;
   if(p.life<=0){particles.splice(i,1);continue;}
   const r=p.size*p.life;
   const g=ctx.createRadialGradient(p.x,p.y,0,p.x,p.y,r);
   g.addColorStop(0,`rgba(255,255,255,${p.life*.8})`);
   g.addColorStop(.16,`rgba(120,245,255,${p.life*.7})`);
   g.addColorStop(.42,`hsla(${p.hue},100%,58%,${p.life*.58})`);
   g.addColorStop(.72,`rgba(0,70,255,${p.life*.34})`);
   g.addColorStop(1,"rgba(0,0,80,0)");
   ctx.fillStyle=g;
   ctx.beginPath();
   ctx.ellipse(p.x,p.y,r*.55,r,Math.sin(p.sway)*.45,0,Math.PI*2);
   ctx.fill();
  }
  ctx.lineCap="round";
  for(let i=sparks.length-1;i>=0;i--){
   const s=sparks[i];s.life-=s.decay;s.x+=s.vx;s.y+=s.vy;s.vx*=.985;s.vy*=.985;
   if(s.life<=0){sparks.splice(i,1);continue;}
   ctx.strokeStyle=`rgba(160,245,255,${s.life})`;ctx.lineWidth=2;
   ctx.beginPath();ctx.moveTo(s.x,s.y);ctx.lineTo(s.x-s.vx*4,s.y-s.vy*4);ctx.stroke();
  }
  ctx.globalCompositeOperation="source-over";
  if(t<7.1){blueFlameAnimationId=requestAnimationFrame(draw)}
  else ctx.clearRect(0,0,W,H);
 }
 blueFlameAnimationId=requestAnimationFrame(draw);
}

function playPersonaCinematic(){
 if(personaCinematicBusy)return;
 const fx=document.getElementById("personaCinematicFx");
 if(!fx)return;
 personaCinematicBusy=true;
 fx.classList.remove("active");
 document.body.classList.remove("pcf-running");
 void fx.offsetWidth;
 fx.classList.add("active");
 document.body.classList.add("pcf-running");
 // PHASE3.5 starts immediately from the central magic-circle sequence.
 if(navigator.vibrate){
  setTimeout(()=>navigator.vibrate([40,45,65]),420);
  setTimeout(()=>navigator.vibrate([75,35,115]),1650);
  setTimeout(()=>navigator.vibrate([90,30,150]),2900);
 }
 setTimeout(()=>{
  fx.classList.remove("active");
  document.body.classList.remove("pcf-running");
  personaCinematicBusy=false;
  cancelAnimationFrame(blueFlameAnimationId);
 },4500);
}


/* ===== PHASE4.3.5 portrait + ride enhancements ===== */
(()=>{
 const wrap=document.getElementById("portraitImageWrap");
 const heart=document.getElementById("tsundereHeart");
 const thoughts=[...document.querySelectorAll(".thought")];
 let heartCount=0;
 let puiNext=false;
 let thoughtTimer=null;

 function isPortrait(){return matchMedia("(orientation: portrait)").matches}
 function triggerHeart(){
  if(!isPortrait()||!wrap||!heart)return;
  heart.classList.remove("pop");void heart.offsetWidth;heart.classList.add("pop");
  wrap.classList.remove("heart-jolt");void wrap.offsetWidth;wrap.classList.add("heart-jolt");
  setTimeout(()=>wrap.classList.remove("heart-jolt"),280);
  heartCount++;
  if(heartCount>=5){puiNext=true;heartCount=0}
 }
 function showRarePui(){
  const target=thoughts[Math.floor(Math.random()*thoughts.length)];
  if(!target)return;
  const text=target.querySelector(".thought-text");
  const old=text.textContent;
  text.textContent="プイッ！";
  wrap?.classList.add("pui");
  setTimeout(()=>{
   text.textContent=old;
   wrap?.classList.remove("pui");
  },900);
 }
 function thoughtTick(){
  if(!isPortrait())return;
  if(puiNext){
   showRarePui();
   puiNext=false;
  }else if(Math.random()<.25){
   triggerHeart();
  }
 }
 function startPortraitExtras(){
  clearInterval(thoughtTimer);
  if(isPortrait())thoughtTimer=setInterval(thoughtTick,2000);
 }
 addEventListener("orientationchange",()=>setTimeout(startPortraitExtras,250));
 matchMedia("(orientation: portrait)").addEventListener?.("change",startPortraitExtras);
 startPortraitExtras();

 window.phase435RideBurst=function(){
  const flash=document.getElementById("rideFlash");
  const layer=document.getElementById("rideSparkLayer");
  if(flash){flash.classList.remove("active");void flash.offsetWidth;flash.classList.add("active")}
  if(layer){
   layer.innerHTML="";
   for(let i=0;i<38;i++){
    const s=document.createElement("i");
    s.className="ride-spark";
    const angle=Math.random()*Math.PI*2;
    const dist=90+Math.random()*260;
    s.style.setProperty("--x",Math.cos(angle)*dist+"px");
    s.style.setProperty("--y",Math.sin(angle)*dist+"px");
    s.style.setProperty("--r",(Math.random()*180-90)+"deg");
    s.style.setProperty("--dur",(.48+Math.random()*.5)+"s");
    s.style.left=(46+Math.random()*8)+"%";
    s.style.top=(46+Math.random()*10)+"%";
    layer.appendChild(s);
   }
   setTimeout(()=>layer.innerHTML="",1100);
  }
  const rideFx=document.getElementById("rideUnlockFx");
  const candidates=rideFx?.querySelectorAll(".ride-text,.ride-impact,.ride-title,h1,h2,strong");
  if(candidates?.length){
   const el=candidates[candidates.length-1];
   el.classList.remove("impact");void el.offsetWidth;el.classList.add("impact");
   setTimeout(()=>el.classList.remove("impact"),420);
  }
 };
})();


/* PHASE4.3.6 */
(()=>{
 const wrap=document.getElementById("portraitImageWrap"),layer=document.getElementById("portraitSpecialLayer"),angry=document.getElementById("angryMode"),smile=document.getElementById("smileMode"),sparks=document.getElementById("smileSparkles"),end=document.getElementById("fightEndFx");
 let mode="muu",idle=null,lastTap=0,taps=0,busy=false,smileTimer=null;
 const portrait=()=>matchMedia("(orientation: portrait)").matches;
 const arm=()=>{clearTimeout(idle);if(portrait()&&mode==="muu")idle=setTimeout(showAngry,10000)};
 const clearModes=()=>{angry?.classList.remove("on");smile?.classList.remove("on","returning");layer?.classList.remove("on","blurout")};
 function showAngry(){if(!portrait()||mode!=="muu"||busy)return;mode="angry";layer.classList.add("on");angry.classList.add("on");navigator.vibrate?.([35,25,75])}
 function backFromAngry(){if(mode!=="angry"||busy)return;busy=true;layer.classList.add("blurout");setTimeout(()=>{clearModes();mode="muu";busy=false;arm()},440)}
 function makeSparks(){sparks.innerHTML="";for(let i=0;i<30;i++){const s=document.createElement("i");s.className="sp436";s.textContent=["✦","✧","★","♡"][Math.floor(Math.random()*4)];const a=Math.random()*Math.PI*2,d=70+Math.random()*220;s.style.setProperty("--x",Math.cos(a)*d+"px");s.style.setProperty("--y",Math.sin(a)*d+"px");s.style.setProperty("--d",(.65+Math.random()*.55)+"s");s.style.left=(42+Math.random()*16)+"%";s.style.top=(37+Math.random()*24)+"%";sparks.appendChild(s)}}
 function showSmile(){if(!portrait()||mode!=="muu"||busy)return;mode="smile";clearTimeout(idle);layer.classList.add("on");smile.classList.add("on");makeSparks();navigator.vibrate?.([20,20,35]);clearTimeout(smileTimer);smileTimer=setTimeout(()=>{smile.classList.add("returning");layer.classList.add("blurout");setTimeout(()=>{clearModes();mode="muu";arm()},620)},3000)}
 wrap?.addEventListener("pointerup",e=>{if(mode!=="muu"||!portrait())return;const r=wrap.getBoundingClientRect(),x=e.clientX-r.left,y=e.clientY-r.top;if(!(x>r.width*.25&&x<r.width*.75&&y<r.height*.42))return;const n=performance.now();taps=n-lastTap<430?taps+1:1;lastTap=n;if(taps>=2){taps=0;showSmile()}});layer?.addEventListener("pointerup",()=>mode==="angry"&&backFromAngry());
 const sync=()=>{if(portrait())arm();else{clearTimeout(idle);clearTimeout(smileTimer);clearModes();mode="muu";busy=false}};addEventListener("orientationchange",()=>setTimeout(sync,250));matchMedia("(orientation: portrait)").addEventListener?.("change",sync);sync();
 window.phase436FightEnd=done=>{if(!end){done?.();return}end.classList.remove("out");end.classList.add("on");navigator.vibrate?.([25,30,55]);setTimeout(()=>{end.classList.add("out");setTimeout(()=>{end.classList.remove("on","out");done?.()},520)},2000)};
})();


/* PHASE4.3.7 random smoke */
(()=>{
 const layer=document.getElementById("dynamicSmokeLayer");
 const angry=document.getElementById("angryMode");
 let timer=null;
 function spawn(){
  if(!layer||!angry?.classList.contains("on"))return;
  const count=1+Math.floor(Math.random()*3);
  const dirs=[{x:-110,y:-35,r:-22},{x:110,y:-35,r:22},{x:-85,y:-115,r:-38},{x:0,y:-135,r:0},{x:85,y:-115,r:38}];
  for(let i=0;i<count;i++){
   const d=dirs[Math.floor(Math.random()*dirs.length)];
   const img=document.createElement("img");
   img.className="dynamic-smoke"; img.src="data:image/gif;base64,R0lGODdhOAQ4BOYAAAAAAAAA/1VVqmZmmUlttlV0ql10omJ2nVZ7qVl9plx/qECAv02As1WAqlqApWCAn4CAgF2BqWKFq2iHrGaJrmiLr2uNsXCPs26Rs3OUtXeXuHmXuXaYt3eYuHucu4GevX+gvYKivoWlwYqmw4eowoysxZGtx5OuyJCwx5S0ypq1zZ+20Ju6zp+90KG90am/1aXD1K7F2KnG1rHG2qrI163K2brM37LN3L3P4LbR3rjS373V4cPV5MjZ58Ta5cfd6Mve6dDf7M7h69Pk7tnm8dbn8Nfo8dzr8+Hu9uPw9+by+ev1/O/4/vH6/////wAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACH/C05FVFNDQVBFMi4wAwEAAAAh+QQJCgBPACwAAAAAOAQ4BAAH/4BPgoOEhYaHiImKi4yNjo+QkZKTlJWWl5iZmpucnZ6foKGio6SlpqeoqaqrrK2ur7CxsrO0tba3uLm6u7y9vr/AwcLDxMXGx8jJysvMzc7P0NHS09TV1tfY2drb3N3e3+Dh4uPk5ebn6Onq6+zt7u/w8fLz9PX29/j5+vv8/f7/AAMKHEiwoMGDCBMqXMiwocOHECNKnEixosWLGDNq3Mixo8ePIEOKHEmypMmTKFOqXMmypcuXMGPKnEmzps2bOHPq3Mmzp8+fQIMKHUq0qNGjSJMqXcq0qdOnUKNKnUq1qtWrWLNq3cq1q9evYMOKHUu2rNmzaNOqXcu2rdu3cP/jyp1Lt67du3jz6t3Lt6/fv4ADCx5MuLDhw4gTK17MuLHjx5AjS55MubLly5gza97MubPnz6BDix5NurTp06hTq17NurXr17Bjy55Nu7bt27hz697Nu7fv38CDCx9OvLjx48iTK1/OvLnz59CjS59Ovbr169iza9/Ovbv37+DDix9Pvrz58+jTq1/Pvr379/Djy59Pv779+/jz69/Pv7///wAGKOCABBZo4IEIJqjgggw26OCDEEYo4YQUVmjhhRhmqOGGHHbo4YcghijiiCSWaOKJKKao4oostujiizDGKOOMNNZo44045qjjjjz26OOPQAYp5JBEFmnkkUgmqeT/kkw26eSTUEYp5ZRUVmnllVhmqeWWXHbp5ZdghinmmGSWaeaZaKap5ppstunmm3DGKeecdNZp55145qnnnnz26eefgAYq6KCEFmrooYgmquiijDbq6KOQRirppJRWaumlmGaq6aacdurpp6CGKuqopJZq6qmopqrqqqy26uqrsMYq66y01mrrrbjmquuuvPbq66/ABivssMQWa+yxyCar7LLMNuvss9BGK+201FZr7bXYZqvtttx26+234IYr7rjklmvuueimq+667Lbr7rvwxivvvPTWa++9+Oar77789uvvvwAHLPDABBds8MEIJ6zwwgw37PDDEEcs8cQUV2zx/8UYZ6zxxhx37PHHIIcs8sgkl2zyySinrPLKLLfs8sswxyzzzDTXbPPNOOes88489+zzz0AHLfTQRBdt9NFIJ6300kw37fTTUEct9dRUV2311VhnrfXWXHft9ddghy322GSXbfbZaKet9tpst+3223DHLffcdNdt991456333nz37fffgAcu+OCEF2744YgnrvjijDfu+OOQRy755JRXbvnlmGeu+eacd+7556CHLvropJdu+umop6766qy37vrrsMcu++y012777bjnrvvuvPfu++/ABy/88MQXb/zxyCev/PLMN+/889BHL/301Fdv/fXYZ6/99tx37/334Icv/v/45Jdv/vnop6/++uy37/778Mcv//z012///fjnr//+/Pfv//8ADKAAB0jAAhrwgAhMoAIXyMAGOvCBEIygBCdIwQpa8IIYzKAGN8jBDnrwgyAMoQhHSMISmvCEKEyhClfIwha68IUwjKEMZ0jDGtrwhjjMoQ53yMMe+vCHQAyiEIdIxCIa8YhITKISl8jEJjrxiVCMohSnSMUqWvGKWMyiFrfIxS568YtgDKMYx0jGMprxjGhMoxrXyMY2uvGNcIyjHOdIxzra8Y54zKMe98jHPvrxj4AMpCAHSchCGvKQiEykIhfJyEY68pGQjKQkJ0nJSlrykpjMpCY3yclOevL/k6AMpShHScpSmvKUqEylKlfJyla68pWwjKUsZ0nLWtrylrjMpS53ycte+vKXwAymMIdJzGIa85jITKYyl8nMZjrzmdCMpjSnSc1qWvOa2MymNrfJ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xsfIycrLzM3Oz9DR0tPU1dbX2Nna29zd3t/g4eLj5OXm5+jp6uvs7e7v8PHy8/T19vf4+fr7/P3+/wADChxIsKDBgwgTKlzIsKHDhxAjSpxIsaLFixgzatzIsaPHjyBDihxJsqTJkyhTqlzJsqXLlzBjypxJs6bNmzhz6tzJs6fPn0CDCh1KtKjRo0iTKl3KtKnTp1CjSp1KtarVq1izat3KtavXr2DDih1LtqzZs2jTql3Ltq3bt3D/48qdS7eu3bt48+rdy7ev37+AAwseTLiw4cOIEytezLix48eQI0ueTLmy5cuYM2vezLmz58+gQ4seTbq06dOoU6tezbq169ewY8ueTbu27du4c+vezbu379/AgwsfTry48ePIkytfzry58+fQo0ufTr269evYs2vfzr279+/gw4sfT768+fPo06tfz769+/fw48ufT7++/fv48+vfz7+///8ABijggAQWaOCBCCao4IIMNujggxBGKOGEFFZo4YUYZqjhhhx26OGHIIYo4ogklmjiiSimqOKKLLbo4oswxijjjDTWaOONOOao44489ujjj0AGKeSQRBZp5JFIJqnk/5JMNunkk1BGKeWUVFZp5ZVYZqnlllx26eWXYIYp5phklmnmmWimqeaabLbp5ptwxinnnHTWaeedeOap55589unnn4AGKuighBZq6KGIJqrooow26uijkEYq6aSUVmrppZhmqummnHbq6aeghirqqKSWauqpqKaq6qqsturqq7DGKuustNZq66245qrrrrz26uuvwAYr7LDEFmvsscgmq+yyzDbr7LPQRivttNRWa+212Gar7bbcduvtt+CGK+645JZr7rnopqvuuuy26+678MYr77z01mvvvfjmq+++/Pbr778AByzwwAQXbPDBCCes8MIMN+zwwxBHLPHEFFds8f/FGGes8cYcd+zxxyCHLPLIJJds8skop6zyyiy37PLLMMcs88w012zzzTjnrPPOPPfs889ABy300EQXbfTRSCet9NJMN+3001BHLfXUVFdt9dVYZ6311lx37fXXYIct9thkl2322WinrfbabLft9ttwxy333HTXbffdeOet99589+3334AHLvjghBdu+OGIJ6744ow37vjjkEcu+eSUV2755ZhnrvnmnHfu+eeghy766KSXbvrpqKeu+uqst+7667DHLvvstNdu++24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JBoz0MztJYIKNuz6ww4qVOCzYUwnlJmHV/+atXlyfcCDwjDeaUMJFnT989da05Ue29DF1QELutIp77D2Sgd3Q2/vjVtcEZDQA9nz9WADCR5MMJrfEgHIOGtxBYksnT6ckLZqj7+FdeanwaWktDCK6cMLDn84GecWPYy6aZKhheLkD/Kwww7iefDfY6t7xGfupMFFQQutiqxBe4vzbvzx5LR+1oKGVnvCsKshL/304KT1+3z2zaCB2qpT7/331qAVQf8IO9D3gggalL45+Oy3D01aGyD7wwsW5I27+/jnv4z41QGRg7Y50p8ABzgMtFgACDh4AQkCSMAGOpAXc/EP9Nb2wApacBZ9u6AGN7gKzHHwgyA8hfLuF8ISmpBLuzmhCleYCRKy8IUwhMT6YkjDGiqCgjbMoQ7dNpfy7PCHPxwYEIdIxCIa8YhITKISl8jEJjrxiVCMohSnSMUqWvGKWMyiFrfIxS568YtgDKMYx0jGMprxjGhMoxrXyMY2uvGNcIyjHOdIxzra8Y54zKMe98jHPvrxj4AMpCAHSchCGvKQiEykIhfJyEY68pGQjKQkJ0nJSlrykpjMpCY3yclOevL/k6AMpShHScpSmvKUqEylKlfJyla68pWwjKUsZ0nLWtrylrjMpS53ycte+vKXwAymMIdJzGIa85jITKYyl8nMZjrzmdCMpjSnSc1qWvOa2MymNrfJzW5685vgDKc4x0nOcprznOhMpzrXyc52uvOd8IynPOdJz3ra8574zKc+98nPfvrznwANqEAHStCCGvSgCE2oQhfK0IY69KEQjahEJ0rRilr0ohjNqEY3ytGOevSjIA2pSEdK0pKa9KQoTalKV8rSlrr0pTCNqUxnStOa2vSmOM2pTnfK05769KdADapQh0rUohr1qEhNqlKXytSmOvWpUI2qVKdK1apa9apY/82qVrfK1a569atgDatYx0rWspr1rGhNq1rXyta2uvWtcI2rXOdK17ra9a54zate98rXvvr1r4ANrGAHS9jCGvawiE2sYhfL2MY69rGQjaxkJ0vZylr2spjNrGY3y9nOevazoA2taEdL2tKa9rSoTa1qV8va1rr2tbCNrWxnS9va2va2uM2tbnfL29769rfADa5wh0vc4hr3uMhNrnKXy9zmOve50I2udKdL3epa97rYza52t8vd7nr3u+ANr3jHS97y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4sWMGzt+DDmy5MmUK1u+jDmz5s2cO3v+DDq06NGkS5s+jTq16tWsW7t+DTu27Nm0a9u+jTu37t28e/v+DTy48OHEixs/jjy58uXMmzt/Dj269OnUq1u/jj279u3cu3v/Dj68+PHky5s/jz69+vXs27t/Dz++/Pn069u/jz+//v38+/v//w9ggAIOSGCBBh6IYIIKLshggw4+CGGEEk5IYYUWXohhhhpuyGGHHn4IYogijkhiiSaeiGKKKq7IYosuvghjjDLOSGONNt6IY4467shjjz7+CGSQQg5JZJFGHolkkkouyWSTTj4JZZRSTklllVZeiWWWWm7JZZdefglmmGKOSWaZZp6JZppqrslmm26+CWeccs5JZ5123olnnnruyWeffv4JaKCCDkpooYYeimiiii7KaKOOPgpppJJOSmmlll6Kaaaabsppp55+Cmqooo5Kaqmmnopqqqquymqrrr4Ka6yyzkprrbbeimuuuu7Ka6++/gpssMIOS2yxxh6LbLLK/y7LbLPOPgtttNJOS2211l6Lbbbabsttt95+C2644o5Lbrnmnotuuuquy2677r4Lb7zyzktvvfbei2+++u7Lb7/+/gtwwAIPTHDBBh+McMIKL8xwww4/DHHEEk9MccUWX4xxxhpvzHHHHn8Mcsgij0xyySafjHLKKq/McssuvwxzzDLPTHPNNt+Mc84678xzzz7/DHTQQg9NdNFGH4100kovzXTTTj8NddRST0111VZfjXXWWm/Ndddefw122GKPTXbZZp+Ndtpqr812226/DXfccs9Nd91234133nrvzXfffv8NeOCCD0544YYfjnjiii/OeOOOPw555JJPTnnllv9fjnnmmm/Oeeeefw566KKPTnrppp+Oeuqqr856666/Dnvsss9Oe+2234577rrvznvvvv8OfPDCD0988cYfj3zyyi/PfPPOPw999NJPT3311l+Pffbab899995/D3744o9Pfvnmn49++uqvz3777r8Pf/zyz09//fbfj3/++u/Pf//+/w/AAApwgAQsoAEPiMAEKnCBDGygAx8IwQhKcIIUrKAFL4jBDGpwgxzsoAc/CMIQinCEJCyhCU+IwhSqcIUsbKELXwjDGMpwhjSsoQ1viMMc6nCHPOyhD38IxCAKcYhELKIRj4jEJCpxiUxsohOfCMUoSnGKVKyiFa+IxSz/anGLXOyiF78IxjCKcYxkLKMZz4jGNKpxjWxsoxvfCMc4ynGOdKyjHe+IxzzqcY987KMf/wjIQApykIQspCEPichEKnKRjGykIx8JyUhKcpKUrKQlL4nJTGpyk5zspCc/CcpQinKUpCylKU+JylSqcpWsbKUrXwnLWMpylrSspS1victc6nKXvOylL38JzGAKc5jELKYxj4nMZCpzmcxspjOfCc1oSnOa1KymNa+JzWxqc5vc7KY3vwnOcIpznOQspznPic50qnOd7GynO98Jz3jKc570rKc974nPfOpzn/zspz//CdCACnSgBC2oQQ+K0IQqdKEMbahDHwrRiEp0/6IUrahFL4rRjGp0oxztqEc/CtKQinSkJC2pSU+K0pSqdKUsbalLXwrTmMp0pjStqU1vitOc6nSnPO2pT38K1KAKdahELapRj4rUpCp1qUxtqlOfCtWoSnWqVK2qVa+K1axqdatc7apXvwrWsIp1rGQtq1nPita0qnWtbG2rW98K17jKda50ratd74rXvOp1r3ztq1//CtjACnawhC2sYQ+L2MQqdrGMbaxjHwvZyEp2spStrGUvi9nManaznO2sZz8L2tCKdrSkLa1pT4va1Kp2taxtrWtfC9vYyna2tK2tbW+L29zqdre87a1vfwvc4Ap3uMQtrnGPi9zkKne5zENtrnOfC93oSne61K2uda+L3exqd7vc7a53vwve8Ip3vOQtr3nPi970qne97G2ve98L3/jKd770ra9974vf/Or3ogUAACH5BAkKAAIALAAAAAA4BDgEgQAAAP///wAAAAAAAAL/lI+py+0Po5y02ouz3rz7D4biSJbmiabqyrbuC8fyTNf2jef6zvf+DwwKh8Si8YhMKpfMpvMJjUqn1Kr1is1qt9yu9wsOi8fksvmMTqvX7Lb7DY/L5/S6/Y7P6/f8vv8PGCg4SFhoeIiYqLjI2Oj4CBkpOUlZaXmJmam5ydnp+QkaKjpKWmp6ipqqusra6voKGys7S1tre4ubq7vL2+v7CxwsPExcbHyMnKy8zNzs/AwdLT1NXW19jZ2tvc3d7f0NHi4+Tl5ufo6err7O3u7+Dh8vP09fb3+Pn6+/z9/v/w8woMCBBAsaPIgwocKFDBs6fAgxosSJFCtavIgxo8aN/xw7evwIMqTIkSRLmjyJMqXKlSxbunwJM6bMmTRr2ryJM6fOnTx7+vwJNKjQoUSLGj2KNKnSpUybOn0KNarUqVSrWr2KNavWrVy7ev0KNqzYsWTLmj2LNq3atWzbun0LN67cuXTr2r2LN6/evXz7+v0LOLDgwYQLGz6MOLHixYwbO34MObLkyZQrW76MObPmzZw7e/4MOrTo0aRLmz6NOrXq1axbu34NO7bs2bRr276NO7fu3bx7+/4NPLjw4cSLGz+OPLny5cybO38OPbr06dSrW7+OPbv27dy7e/8OPrz48eTLmz+PPr369ezbu38PP778+fTr27+PP7/+/fz7+///D2CAAg5IYIEGHohgggouyGCDDj4IYYQSTkhhhRZeiGGGGm7IYYcefghiiCKOSGKJJp6IYooqrshiiy6+CGOMMs5IY4023ohjjjruyGOPPv4IZJBCDklkkUYeiWSSSi7JZJNOPglllFJOSWWVVl6JZZZabslll15+CWaYYo5JZplmnolmmmquyWabbr4JZ5xyzklnnXbeiWeeeu7JZ59+/glooIIOSmihhh6KaKKKLspoo44+Cmmkkk5KaaWWXopppppuymmnnn4Kaqiijkpqqaaeimqqqq7KaquuvgprrLLOSmuttt6Ka6667sprr77+Cmywwg5LbLHGHotsssr/Lstss84+C2200k5LbbXWXottttpuy2233n4Lbrjijktuueaei2666q7LbrvuvgtvvPLOS2+99t6Lb7767stvv/7+C3DAAg9McMEGH4xwwgovzHDDDj8MccQST0xxxRZfjHHGGm/McccefwxyyCKPTHLJJp+Mcsoqr8xyyy6/DHPMMs9Mc80234xzzjrvzHPPPv8MdNBCD0100UYfjXTSSi/NdNNOPw111FJPTXXVVl+NddZab811115/DXbYYo9Ndtlmn4122mqvzXbbbr8Nd9xyz0133XbfjXfeeu/Nd99+/w144IIPTnjhhh+OeOKKL854444/Dnnkkk9OeeWW/1+Oeeaab855555/Dnrooo9Oeummn4566qqvznrrrr8Oe+yyz0577bbfjnvuuu/Oe+++/w588MIPT3zxxh+PfPLKL898884/D3300k9PffXWX4999tpvz3333n8Pfvjij09++eafj3766q/Pfvvuvw9//PLPT3/99t+Pf/76789///7/D8AACnCABCygAQ+IwAQqcIEMbKADHwjBCEpwghSsoAUviMEManCDHOygBz8IwhCKcIQkLKEJT4jCFKpwhSxsoQtfCMMYynCGNKyhDW+IwxzqcIc87KEPfwjEIApxiEQsohGPiMQkKnGJTGyiE58IxShKcYpUrKIVr4jFLP9qcYtc7KIXvwjGMIpxjGQsoxnPiMY0qnGNbGyjG98IxzjKcY50rKMd74jHPOpxj3zsox//CMhACnKQhCykIQ+JyEQqcpGMbKQjHwnJSEpykpSspCUviclManKTnOykJz8JylCKcpSkLKUpT4nKVKpylaxspStfCctYynKWtKylLW+Jy1zqcpe87KUvfwnMYApzmMQspjGPicxkKnOZzGymM58JzWhKc5rUrKY1r4nNbGpzm9zspje/Cc5winOc5CynOc+JznSqc53sbKc73wnPeMpznvSspz3vic986nOf/OynP/8J0IAKdKAELahBD4rQhCp0oQxtqEMfCtGISnT/ohStqEUvitGManSjHO2oRz8K0pCKdKQkLalJT4rSlKp0pSxtqUtfCtOYynSmNK2pTW+K05zqdKc87alPfwrUoAp1qEQtqlGPitSkKnWpTG2qU58K1ahKdapUrapVr4rVrGp1q1ztqle/CtawinWsZC2rWc+K1rSqda1sbatb3wrXuMp1rnStq13vite86nWvfO2rX/8K2MAKdrCELaxhD4vYxCp2sYxtrGMfC9nISnaylK2sZS+L2cxqdrOc7axnPwva0Ip2tKQtrWlPi9rUqna1rG2ta18L29jKdra0ra1tb4vb3Op2t7ztrW9/C9zgCne4xC2ucY+L3OQqd7nMQ22uc58L3ehKd7rUra51r4vd7Gp3u9ztrne/C97wine85C2vec+L3vSqd73sba973wvf+Mp3vvStr33vi9/86veiBQAAOw==";
   img.style.left=(12+Math.random()*14)+"%"; img.style.top=(23+Math.random()*9)+"%";
   img.style.setProperty("--x",(d.x*(.75+Math.random()*.45))+"px");
   img.style.setProperty("--y",(d.y*(.8+Math.random()*.4))+"px");
   img.style.setProperty("--rot0",(d.r-10+Math.random()*20)+"deg");
   img.style.setProperty("--rot1",(d.r-18+Math.random()*36)+"deg");
   img.style.setProperty("--sc",(.9+Math.random()*.45).toFixed(2));
   img.style.setProperty("--dur",(1.05+Math.random()*.75).toFixed(2)+"s");
   layer.appendChild(img); setTimeout(()=>img.remove(),2200);
  }
 }
 function start(){clearInterval(timer);spawn();timer=setInterval(spawn,2000)}
 function stop(){clearInterval(timer);timer=null;if(layer)layer.innerHTML=""}
 if(angry)new MutationObserver(()=>angry.classList.contains("on")?start():stop()).observe(angry,{attributes:true,attributeFilter:["class"]});
})();


/* ===== PHASE4.3.7.1 impact replay ===== */
(()=>{
 const angry=document.getElementById("angryMode");
 if(!angry)return;
 new MutationObserver(()=>{
  if(!angry.classList.contains("on"))return;
  const items=angry.querySelectorAll(".kick-word,.kick-ring,.speed-lines,.ground-crack");
  items.forEach(el=>{
   el.style.animation="none";
   void el.offsetWidth;
   el.style.animation="";
  });
 }).observe(angry,{attributes:true,attributeFilter:["class"]});
})();

