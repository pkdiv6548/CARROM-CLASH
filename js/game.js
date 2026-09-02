'use strict';

const $ = (s) => document.querySelector(s);
const canvas = $('#board');
const ctx = canvas.getContext('2d', { alpha: false });
const W = 900;
const C = { cx: 450, cy: 450, R: 365, pocket: 31, baseline: 315 };
const COLORS = ['#f3e5c7', '#22252b'];

let mode = 'ai', turn = 0, players = [], coins = [], drag = null;
let running = false, shotInProgress = false, last = 0, gameOver = false;
let timer = 20, timerId = null, sound = true;
let stats = JSON.parse(localStorage.getItem('carromStats') || '{"wins":0,"games":0}');

function initPlayers() {
  if (mode === '4p') {
    players = [1,2,3,4].map((n) => ({ name:`Player ${n}`, score:0, fouls:0 }));
  } else {
    players = [
      { name:'Player 1', score:0, fouls:0 },
      { name: mode === 'ai' ? 'Computer' : 'Player 2', score:0, fouls:0 }
    ];
  }
}

function setup() {
  stopLoop();
  coins = [];
  const spacing = 27;
  let idx = 0;
  coins.push({x:C.cx,y:C.cy,r:12,color:'#c33b3b',type:'queen',vx:0,vy:0,pocketed:false});
  for (let ring=1; ring<=2; ring++) {
    for (let i=0; i<ring*6; i++) {
      const a = i*Math.PI*2/(ring*6) + (ring%2 ? .12 : 0);
      coins.push({x:C.cx+Math.cos(a)*spacing*ring,y:C.cy+Math.sin(a)*spacing*ring,r:11,color:COLORS[idx++%2],type:'coin',vx:0,vy:0,pocketed:false});
    }
  }
  coins.push({x:C.cx-160,y:C.cy,r:11,color:'#f3e5c7',type:'coin',vx:0,vy:0,pocketed:false});
  coins.push({x:C.cx+160,y:C.cy,r:11,color:'#22252b',type:'coin',vx:0,vy:0,pocketed:false});
  turn = 0; gameOver = false; shotInProgress = false; drag = null;
  $('#turnName').textContent = players[0].name;
  $('#status').textContent = 'Aim and shoot';
  updateMeta();
  clearFeed();
  feed('Match started. Player 1 to break.');
  setTimer();
  draw();
}

function start(m) {
  mode = m;
  initPlayers();
  $('#home').classList.remove('active');
  $('#game').classList.add('active');
  $('#p1Name').textContent = players[0].name;
  $('#p2Name').textContent = players[1]?.name || '';
  setup();
}

function reset() { setup(); }
function stopLoop() { running = false; last = 0; }
function clearFeed() { $('#feed').innerHTML = ''; }
function feed(t) {
  const e = document.createElement('div');
  e.textContent = '› ' + t;
  $('#feed').prepend(e);
  while ($('#feed').children.length > 8) $('#feed').lastChild.remove();
}

function setTimer() {
  clearInterval(timerId);
  timer = 20;
  $('#timer').textContent = timer;
  $('#timerBar').style.width = '100%';
  timerId = setInterval(() => {
    if (gameOver || shotInProgress) return;
    timer--;
    $('#timer').textContent = timer;
    $('#timerBar').style.width = `${Math.max(0,timer)/20*100}%`;
    if (timer <= 0) {
      players[turn].fouls++;
      feed(`${players[turn].name} timed out.`);
      nextTurn();
    }
  }, 1000);
}

function nextTurn() {
  if (gameOver) return;
  shotInProgress = false;
  turn = (turn + 1) % players.length;
  $('#turnName').textContent = players[turn].name;
  $('#status').textContent = mode === 'ai' && turn === 1 ? 'Computer is thinking…' : 'Aim and shoot';
  updateMeta();
  setTimer();
  draw();
  if (mode === 'ai' && turn === 1) setTimeout(aiShot, 500);
}

function updateMeta() {
  $('#p1Score').textContent = players[0]?.score ?? 0;
  $('#p2Score').textContent = players[1]?.score ?? 0;
  $('#p1Meta').textContent = players[0] ? `${players[0].score} coins • ${players[0].fouls} fouls` : '';
  $('#p2Meta').textContent = players[1] ? `${players[1].score} coins • ${players[1].fouls} fouls` : '';
}

function pocketFor(x,y) {
  return [[35,35],[865,35],[35,865],[865,865]].some(([px,py]) => Math.hypot(x-px,y-py) < C.pocket);
}

function activePieces() { return coins.filter(o => !o.pocketed); }
function movingPieces() { return activePieces().filter(o => Math.abs(o.vx)+Math.abs(o.vy) > .04); }

function pocketPiece(o) {
  if (o.pocketed) return;
  o.pocketed = true; o.vx = o.vy = 0;
  if (o.type === 'striker') {
    players[turn].fouls++;
    feed(`${players[turn].name} fouled: striker pocketed.`);
  } else {
    const points = o.type === 'queen' ? 3 : 1;
    players[turn].score += points;
    feed(`${players[turn].name} pocketed ${o.type === 'queen' ? 'the Queen' : 'a coin'} (+${points}).`);
  }
  updateMeta();
}

function physics(dt) {
  const pieces = activePieces();
  for (const o of pieces) {
    if (Math.abs(o.vx)+Math.abs(o.vy) < .001) { o.vx = o.vy = 0; continue; }
    o.x += o.vx * dt;
    o.y += o.vy * dt;
    const friction = Math.pow(.985, dt * 60);
    o.vx *= friction; o.vy *= friction;
    if (pocketFor(o.x,o.y)) { pocketPiece(o); continue; }
    const dx=o.x-C.cx, dy=o.y-C.cy, d=Math.hypot(dx,dy);
    if (d > C.R-o.r) {
      const nx=dx/(d||1), ny=dy/(d||1);
      const dot=o.vx*nx+o.vy*ny;
      o.vx -= 2*dot*nx; o.vy -= 2*dot*ny;
      o.x=C.cx+nx*(C.R-o.r); o.y=C.cy+ny*(C.R-o.r);
      o.vx*=.94; o.vy*=.94;
    }
  }

  const live = activePieces();
  for (let i=0;i<live.length;i++) for (let j=i+1;j<live.length;j++) {
    const a=live[i], b=live[j];
    const dx=b.x-a.x, dy=b.y-a.y, d=Math.hypot(dx,dy), min=a.r+b.r;
    if (!d || d >= min) continue;
    const nx=dx/d, ny=dy/d, overlap=min-d;
    a.x-=nx*overlap/2; a.y-=ny*overlap/2;
    b.x+=nx*overlap/2; b.y+=ny*overlap/2;
    const rel=(a.vx-b.vx)*nx+(a.vy-b.vy)*ny;
    if (rel > 0) {
      const impulse=rel*.96;
      a.vx-=impulse*nx; a.vy-=impulse*ny;
      b.vx+=impulse*nx; b.vy+=impulse*ny;
    }
  }

  if (shotInProgress && movingPieces().length === 0) finishShot();
}

function finishShot() {
  shotInProgress = false;
  coins = coins.filter(o => !o.pocketed);
  const playable = coins.filter(o => o.type === 'coin').length;
  if (playable === 0) {
    gameOver = true;
    clearInterval(timerId);
    stats.games++;
    if (mode === 'ai' && turn === 0) stats.wins++;
    localStorage.setItem('carromStats', JSON.stringify(stats));
    showEnd();
    return;
  }
  nextTurn();
}

function shoot(sx,sy,p) {
  if (gameOver || shotInProgress || (mode === 'ai' && turn === 1)) return;
  const dx=sx-p.x, dy=sy-p.y, len=Math.hypot(dx,dy);
  if (len < 15) return;
  const power=Math.min(22, len/8);
  coins.push({x:sx,y:sy,r:17,color:'#d5ad63',type:'striker',vx:dx/len*power,vy:dy/len*power,pocketed:false});
  shotInProgress = true;
  $('#powerFill').style.width = '0%';
  $('#status').textContent = `${players[turn].name} shot in progress`;
  feed(`${players[turn].name} fired.`);
  startLoop();
}

function aiShot() {
  if (gameOver || shotInProgress || mode !== 'ai' || turn !== 1) return;
  const sx=C.cx-160, sy=C.cy+220;
  const targets=coins.filter(o=>!o.pocketed && o.type!=='striker');
  if (!targets.length) return finishShot();
  let t=targets[Math.floor(Math.random()*Math.min(4,targets.length))];
  const dx=sx-t.x, dy=sy-t.y, len=Math.hypot(dx,dy)||1;
  coins.push({x:sx,y:sy,r:17,color:'#d5ad63',type:'striker',vx:dx/len*10,vy:dy/len*10,pocketed:false});
  shotInProgress=true;
  $('#status').textContent='Computer shot in progress';
  feed('Computer fired.');
  startLoop();
}

function startLoop() {
  if (running) return;
  running=true; last=0;
  requestAnimationFrame(loop);
}
function loop(ts) {
  if (!running) return;
  if (!last) last=ts;
  const dt=Math.min(2,(ts-last)/16.67);
  last=ts;
  physics(dt); draw();
  if (running && (shotInProgress || movingPieces().length)) requestAnimationFrame(loop);
  else stopLoop();
}

function draw() {
  ctx.clearRect(0,0,W,W);
  ctx.fillStyle='#151a22'; ctx.fillRect(0,0,W,W);
  ctx.save(); ctx.translate(C.cx,C.cy);
  ctx.fillStyle='#b8894f'; ctx.shadowColor='#0008'; ctx.shadowBlur=30;
  ctx.beginPath(); ctx.arc(0,0,395,0,Math.PI*2); ctx.fill(); ctx.shadowBlur=0;
  ctx.fillStyle='#f0d7a5'; ctx.beginPath(); ctx.arc(0,0,C.R+15,0,Math.PI*2); ctx.fill();
  ctx.strokeStyle='#6f4b2a'; ctx.lineWidth=9; ctx.beginPath(); ctx.arc(0,0,C.R,0,Math.PI*2); ctx.stroke();
  ctx.strokeStyle='#a06b36'; ctx.lineWidth=3; ctx.beginPath(); ctx.arc(0,0,95,0,Math.PI*2); ctx.stroke(); ctx.restore();
  for (const [x,y] of [[35,35],[865,35],[35,865],[865,865]]) {
    ctx.fillStyle='#211c19'; ctx.beginPath(); ctx.arc(x,y,C.pocket,0,Math.PI*2); ctx.fill();
    ctx.fillStyle='#070707'; ctx.beginPath(); ctx.arc(x,y,C.pocket-8,0,Math.PI*2); ctx.fill();
  }
  ctx.strokeStyle='#9b6939'; ctx.lineWidth=3;
  for (const y of [315,585]) { ctx.beginPath(); ctx.moveTo(120,y); ctx.lineTo(780,y); ctx.stroke(); }
  for (const x of [315,585]) { ctx.beginPath(); ctx.moveTo(x,120); ctx.lineTo(x,780); ctx.stroke(); }
  for (const o of coins) if (!o.pocketed) {
    ctx.save(); ctx.shadowColor='#0008'; ctx.shadowBlur=7; ctx.fillStyle=o.color;
    ctx.beginPath(); ctx.arc(o.x,o.y,o.r,0,Math.PI*2); ctx.fill(); ctx.shadowBlur=0;
    ctx.strokeStyle=o.type==='queen'?'#f5e0a0':'#8a7b62'; ctx.lineWidth=2; ctx.stroke(); ctx.restore();
  }
  drawStriker();
}

function drawStriker() {
  if (shotInProgress) return;
  const sx=turn%2 ? C.cx-160 : C.cx+160, sy=C.cy+220;
  ctx.save(); ctx.fillStyle='#d5ad63'; ctx.shadowColor='#0009'; ctx.shadowBlur=10;
  ctx.beginPath(); ctx.arc(sx,sy,17,0,Math.PI*2); ctx.fill(); ctx.shadowBlur=0;
  ctx.strokeStyle='#6d4c2d'; ctx.stroke();
  if (drag) { ctx.strokeStyle='#fff8'; ctx.lineWidth=3; ctx.beginPath(); ctx.moveTo(sx,sy); ctx.lineTo(drag.x,drag.y); ctx.stroke(); }
  ctx.restore();
}

function pointer(e) {
  const r=canvas.getBoundingClientRect();
  return {x:Math.max(0,Math.min(W,(e.clientX-r.left)*W/r.width)),y:Math.max(0,Math.min(W,(e.clientY-r.top)*W/r.height))};
}

canvas.addEventListener('pointerdown', (e) => {
  if (gameOver || shotInProgress || (mode==='ai' && turn===1)) return;
  const p=pointer(e), sx=turn%2 ? C.cx-160 : C.cx+160, sy=C.cy+220;
  if (Math.hypot(p.x-sx,p.y-sy)<40) { drag=p; canvas.setPointerCapture?.(e.pointerId); draw(); }
});
canvas.addEventListener('pointermove', (e) => {
  if (!drag) return;
  drag=pointer(e);
  const sx=turn%2 ? C.cx-160 : C.cx+160, sy=C.cy+220;
  const power=Math.min(100,Math.hypot(drag.x-sx,drag.y-sy)/2);
  $('#powerFill').style.width=power+'%'; draw();
});
canvas.addEventListener('pointerup', (e) => {
  if (!drag) return;
  const p=pointer(e), sx=turn%2 ? C.cx-160 : C.cx+160, sy=C.cy+220;
  shoot(sx,sy,p); drag=null; draw();
});
canvas.addEventListener('pointercancel', () => { drag=null; $('#powerFill').style.width='0%'; draw(); });

function modal(html) { $('#modalBody').innerHTML=html; $('#modal').classList.remove('hidden'); }
function closeModal() { $('#modal').classList.add('hidden'); }

$('#helpBtn').onclick=()=>modal('<h2>How to play</h2><ul><li>Drag from the striker and release to shoot.</li><li>Pocket coins to score.</li><li>The Queen is worth 3 points.</li><li>Striker pocketing is a foul.</li><li>Clear the playable coins to win.</li><li>Timer: 20 seconds per turn.</li></ul><p>Tip: use short shots for control and bank shots for corners.</p>');
$('#closeModal').onclick=closeModal;
$('#soundBtn').onclick=()=>{sound=!sound;$('#soundBtn').textContent=sound?'🔊':'🔇';};
$('#homeBtn').onclick=()=>{clearInterval(timerId);stopLoop();$('#game').classList.remove('active');$('#home').classList.add('active');};
$('#newBtn').onclick=reset;
document.querySelectorAll('.mode').forEach(b=>b.addEventListener('click',()=>start(b.dataset.mode)));
window.addEventListener('resize',draw);
window.addEventListener('orientationchange',()=>setTimeout(draw,100));

initPlayers();
draw();
