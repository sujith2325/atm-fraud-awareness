'use strict';

// ── STATE ──────────────────────────────────────
const S = { scene:0, step:-1, timers:[], speaking:false, auto:false, done:new Set() };
const $  = id => document.getElementById(id);

// ── BUILD SCENARIO PILLS ─────────────────────
function buildPills(){
  const c = $('scenarioPills'); c.innerHTML='';
  SCENARIOS.forEach((sc,i)=>{
    const b=document.createElement('button');
    b.className='spill'+(i===S.scene?' active':'')+(S.done.has(i)?' done':'');
    b.textContent=sc.title;
    b.onclick=()=>load(i);
    c.appendChild(b);
  });
}

// ── LOAD SCENARIO ────────────────────────────
function load(i){
  clearAll();
  S.scene=i;
  S.step=-1;

  const sc=SCENARIOS[i];

  $('flowBadge').textContent=String(i+1).padStart(2,'0');
  $('flowTitle').textContent=sc.title;
  $('flowMeta').textContent =`${sc.steps.length} steps`;

  setProgress(0,sc.steps.length);
  $('floatDone').classList.remove('show');

  showPlaceholder();
  buildRail(sc);

  document.querySelectorAll('.spill').forEach((b,j)=>{
    b.className='spill'+(j===i?' active':'')+(S.done.has(j)?' done':'');
  });
}

// ── BUILD RAIL ────────────────────────────────
function buildRail(sc){
  const rail=$('stepsRail');
  rail.innerHTML='';

  sc.steps.forEach((step,i)=>{
    const colorCls='c-'+step.color;
    const badgeCls='badge-'+step.color;

    const row=document.createElement('div');
    row.className='step-row';
    row.id='row_'+i;

    row.innerHTML=`
      <div class="step-connector">
        <div class="step-dot ${colorCls}" id="dot_${i}">${i+1}</div>
        ${i<sc.steps.length-1?`<div class="step-line" id="line_${i}"></div>`:''}
      </div>

      <div class="step-card-wrap">
        <div class="step-cube ${colorCls}" id="cube_${i}">
          <span class="cube-icon">${step.emoji}</span>
          <div class="cube-text">
            <div class="cube-label">${step.label}</div>
            <div class="cube-hint">${step.hint}</div>
          </div>
          <span class="cube-badge ${badgeCls}">${step.badge}</span>
        </div>
      </div>
    `;

    rail.appendChild(row);

    $('cube_'+i).onclick=()=>selectStep(i);
  });
}

// ── ANIMATE STEPS (PROMISE) ─────────────────
function animateSteps(sc){
  return new Promise((resolve)=>{

    sc.steps.forEach((step,i)=>{
      const t=setTimeout(()=>{

        const row=$('row_'+i);
        if(!row) return;

        row.classList.add('visible');

        const line=$('line_'+i);
        if(line) setTimeout(()=>line.classList.add('animated'),200);

        S.step=i;
        highlightStep(i,sc);

        if(i===sc.steps.length-1){
          setTimeout(()=>{
            showDone(sc);
            resolve(); // ✅ animation finished
          },800);
        }

      },300+i*850);

      S.timers.push(t);
    });

  });
}

// ── HIGHLIGHT STEP ────────────────────────────
function highlightStep(i,sc){
  sc.steps.forEach((_,j)=>{
    const cube=$('cube_'+j), dot=$('dot_'+j);
    if(!cube) return;

    cube.classList.remove('is-active','is-done');
    dot.classList.remove('is-active','is-done');

    if(j<i){ cube.classList.add('is-done'); dot.classList.add('is-done'); }
    if(j===i){ cube.classList.add('is-active'); dot.classList.add('is-active'); }
  });

  setProgress(i+1,sc.steps.length);
  showDetail(i,sc);
}

// ── SELECT STEP ──────────────────────────────
function selectStep(i){
  showDetail(i,SCENARIOS[S.scene]);
}

// ── DETAIL PANEL ─────────────────────────────
function showDetail(i,sc){
  const step=sc.steps[i];

  $('detailPlaceholder').classList.add('hidden');
  $('detailActive').classList.remove('hidden');

  $('daTitle').textContent=step.label;
  $('daDesc').textContent=step.desc;

  $('daImage').innerHTML=`${step.emoji} ${step.label}`;
}

// ── PROGRESS ─────────────────────────────────
function setProgress(curr,total){
  const pct=Math.round((curr/total)*100);
  $('fpBar').style.setProperty('--pct', pct+'%');
  $('fpLabel').textContent=`${curr}/${total}`;
}

// ── DONE ─────────────────────────────────────
function showDone(sc){
  S.done.add(S.scene);
  $('fdSub').textContent=`"${sc.title}" completed`;
  $('floatDone').classList.add('show');
}

// ── CLEAR ────────────────────────────────────
function clearAll(){
  S.timers.forEach(clearTimeout);
  S.timers=[];
  stopSpeech();
}

// ── SPEECH (PROMISE) ─────────────────────────
function speak(text){
  return new Promise((resolve)=>{
    stopSpeech();

    if(!window.speechSynthesis){
      resolve();
      return;
    }

    const u=new SpeechSynthesisUtterance(text);
    u.rate=0.9;
    u.pitch=1.05;

    u.onend=()=>{
      S.speaking=false;
      resolve(); // ✅ important
    };

    S.speaking=true;
    speechSynthesis.speak(u);
  });
}

function stopSpeech(){
  if(window.speechSynthesis) speechSynthesis.cancel();
  S.speaking=false;
}

// ── AUTO PLAY (FINAL FIX) ────────────────────
async function runAutoPlay(){

  S.auto = !S.auto;

  const btn=$('btnAuto');

  if(!S.auto){
    btn.classList.remove('running');
    btn.textContent='▶ Auto Play';
    stopSpeech();
    clearAll();
    return;
  }

  btn.classList.add('running');
  btn.textContent='⏹ Stop';

  while(S.auto){

    const sc=SCENARIOS[S.scene];

    load(S.scene);

    await new Promise(r=>setTimeout(r,300));

    await Promise.all([
      animateSteps(sc),
      speak(sc.steps.map(s=>s.label+'. '+s.desc).join('. '))
    ]);

    await new Promise(r=>setTimeout(r,800));

    const next=(S.scene+1)%SCENARIOS.length;

    if(next===0){
      S.auto=false;
      break;
    }

    S.scene=next;
  }

  btn.classList.remove('running');
  btn.textContent='▶ Auto Play';
}

// ── EVENTS ───────────────────────────────────
$('btnAuto').addEventListener('click',runAutoPlay);

$('btnPrev').onclick=()=>{ if(S.scene>0) load(S.scene-1); };
$('btnNext').onclick=()=>{ if(S.scene<SCENARIOS.length-1) load(S.scene+1); };

$('fdReplay').onclick=()=>load(S.scene);
$('fdNext').onclick=()=>load((S.scene+1)%SCENARIOS.length);

// ── INIT ─────────────────────────────────────
buildPills();
load(0);