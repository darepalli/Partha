// Path of the Inner Warrior — Final Integrated Build
(()=>{
  const $=s=>document.querySelector(s); const $$=s=>document.querySelectorAll(s);
  const audio={
    ctx:null,
    muted:false,
    buffers:{},
    ambience:{ oscA:null, oscB:null, gain:null, lfo:null, lfoGain:null, filter:null, started:false },
    files:{ bell:'audio/bell_epic.wav', hum:'audio/hum_epic.wav', swoosh:'audio/swoosh.wav' }
  };
  const state={
    chapter:1,maxChapters:18,path:null,
    sattva:30,rajas:30,tamas:30,clarity:0,purity:0,devotion:0,
    focus:50, karmaStreak:0, bestStreak:0,
    traits:{ discipline:0, compassion:0, insight:0, faith:0, ambition:0, avoidance:0, rigidity:0, restless:0 },
    serviceCount:0, rngSeed: Date.now()%2147483647, bossProgress:0
  };

  const traitLabels={
    discipline:'Discipline',
    compassion:'Compassion',
    insight:'Insight',
    faith:'Faith',
    ambition:'Ambition',
    avoidance:'Avoidance',
    rigidity:'Rigidity',
    restless:'Restlessness'
  };

  const bossProfiles={
    3:{ name:'Anger', holdBoost:0.95, decayBoost:0.2, tamasDrain:2, focusDrain:3, note:'Breathe through the heat.' },
    6:{ name:'Restlessness', holdBoost:0.75, decayBoost:0.55, tamasDrain:1, focusDrain:4, note:'Steady movement into stillness.' },
    12:{ name:'Attachment', holdBoost:0.7, decayBoost:0.45, tamasDrain:2, focusDrain:5, note:'Release what clings.' },
    16:{ name:'Despair', holdBoost:0.65, decayBoost:0.35, tamasDrain:3, focusDrain:6, note:'Hold light in the dark.' }
  };

  const eraProfiles={
    dawn:{
      oscTypes:['triangle','sine'],
      ratio:1.5,
      filterBase:980,
      gainBias:0.01
    },
    zenith:{
      oscTypes:['sine','triangle'],
      ratio:1.333,
      filterBase:820,
      gainBias:0.018
    },
    twilight:{
      oscTypes:['sawtooth','triangle'],
      ratio:1.2,
      filterBase:670,
      gainBias:0.025
    }
  };

  function currentEra(){
    if(state.chapter<=6) return 'dawn';
    if(state.chapter<=12) return 'zenith';
    return 'twilight';
  }

  function applyThemeByChapter(){
    const era=currentEra();
    document.body.classList.remove('theme-dawn','theme-zenith','theme-twilight');
    document.body.classList.add(`theme-${era}`);
  }

  function rand(){ state.rngSeed=(1103515245*state.rngSeed+12345)%2147483647; return state.rngSeed/2147483647; }

  // Init chapters bar
  const chaptersDots=$('#chapters');
  if(chaptersDots){
    for(let i=1;i<=18;i++){
      const d=document.createElement('div');
      d.className='dot'+(i===1?' active':'');
      chaptersDots.appendChild(d);
    }
  }

  // Load scenes JSON
  const scenes={};
  async function loadScenes(){
    const map= await (await fetch('scenes/map.json')).json();
    for(let i=1;i<=18;i++){
      const ch= await (await fetch(`scenes/chapter_${String(i).padStart(2,'0')}.json`)).json();
      scenes[i]=ch;
    }
    scenes.map=map;
  }

  // Dialogue
  const dialogue={};
  async function loadDialogue(){
    dialogue.krishna= await (await fetch('dialogue/krishna.json')).json();
    dialogue.mentor= await (await fetch('dialogue/mentor.json')).json();
    dialogue.adversary= await (await fetch('dialogue/adversary.json')).json();
  }

  // Audio
  async function ensureAudio(){ if(audio.ctx) return; audio.ctx= new (window.AudioContext||window.webkitAudioContext)(); }
  async function getBuffer(name){
    if(audio.buffers[name]) return audio.buffers[name];
    const res= await fetch(audio.files[name]);
    const ab= await res.arrayBuffer();
    const buf= await audio.ctx.decodeAudioData(ab);
    audio.buffers[name]=buf;
    return buf;
  }
  async function play(name, vol=0.8, rateJitter=0.06){
    try{
      if(audio.muted) return;
      await ensureAudio();
      const buf=await getBuffer(name);
      const src= audio.ctx.createBufferSource();
      src.buffer=buf;
      src.playbackRate.value=Math.max(0.75, 1 + (rand()-0.5)*rateJitter);
      const gain= audio.ctx.createGain();
      gain.gain.value=vol;
      src.connect(gain).connect(audio.ctx.destination);
      src.start();
    }catch(e){/* ignore */}
  }

  function ensureAmbience(){
    if(!audio.ctx || audio.ambience.started) return;
    const a=audio.ambience;
    a.oscA=audio.ctx.createOscillator();
    a.oscB=audio.ctx.createOscillator();
    a.filter=audio.ctx.createBiquadFilter();
    a.gain=audio.ctx.createGain();
    a.lfo=audio.ctx.createOscillator();
    a.lfoGain=audio.ctx.createGain();

    a.oscA.type='sine';
    a.oscB.type='triangle';
    a.oscA.frequency.value=110;
    a.oscB.frequency.value=164.81;
    a.filter.type='lowpass';
    a.filter.frequency.value=900;
    a.filter.Q.value=0.7;
    a.gain.gain.value=0.0001;
    a.lfo.type='sine';
    a.lfo.frequency.value=0.08;
    a.lfoGain.gain.value=0.12;

    a.lfo.connect(a.lfoGain).connect(a.gain.gain);
    a.oscA.connect(a.filter);
    a.oscB.connect(a.filter);
    a.filter.connect(a.gain).connect(audio.ctx.destination);

    const t=audio.ctx.currentTime;
    a.oscA.start(t);
    a.oscB.start(t);
    a.lfo.start(t);
    a.started=true;
  }

  function updateAmbience(mood){
    if(audio.muted || !audio.ctx) return;
    ensureAmbience();
    const a=audio.ambience;
    if(!a.started) return;
    const now=audio.ctx.currentTime;
    const calm=Math.max(0, Math.min(1, (state.sattva + state.focus - state.tamas)/180));
    const energy=Math.max(0, Math.min(1, state.rajas/100));
    const danger=Math.max(0, Math.min(1, state.tamas/100));
    const era=currentEra();
    const eraProfile=eraProfiles[era];
    a.oscA.type=eraProfile.oscTypes[0];
    a.oscB.type=eraProfile.oscTypes[1];
    const moodBoost=mood==='boss'?0.12:mood==='meditation'?-0.03:0;
    const targetGain=Math.max(0.015, Math.min(0.08, 0.02 + eraProfile.gainBias + energy*0.02 - danger*0.01 + moodBoost));
    const base=98 + state.chapter*2 + calm*18;
    a.oscA.frequency.linearRampToValueAtTime(base, now+0.4);
    a.oscB.frequency.linearRampToValueAtTime(base*eraProfile.ratio, now+0.4);
    a.filter.frequency.linearRampToValueAtTime(eraProfile.filterBase + calm*360 - danger*180, now+0.4);
    a.gain.gain.linearRampToValueAtTime(targetGain, now+0.6);
  }

  // UI helpers
  function clampStats(){ ['sattva','rajas','tamas','clarity','purity','devotion','focus'].forEach(k=>{ state[k]=Math.max(0,Math.min(100,Math.round(state[k])));} ); }
  function renderHUD(){ clampStats(); applyThemeByChapter(); $('#sattva').value=state.sattva; $('#rajas').value=state.rajas; $('#tamas').value=state.tamas; $('#clarity').value=state.clarity; $('#purity').value=state.purity; $('#devotion').value=state.devotion; $('#focus').value=state.focus; $('#chapterLabel').textContent=`Chapter ${state.chapter}`; $('#streakLabel').textContent=`Karma Streak: ${state.karmaStreak} (Best ${state.bestStreak})`; const dots=$$('#chapters .dot'); dots.forEach((d,i)=>{ d.classList.toggle('active', i===state.chapter-1); d.classList.toggle('done', i<state.chapter-1); }); renderConsequences(); updateAmbience('narrative'); save(); }
  function show(id){ $$('.screen').forEach(s=>s.classList.add('hidden')); $('#'+id).classList.remove('hidden'); }

  function applyEffects(eff){ for(const k in eff){ if(k==='serviceCount'){ state.serviceCount+=(eff[k]||0); } else { state[k]=(state[k]||0)+eff[k]; } } }
  function addTrait(key, amount, reason){
    if(!state.traits[key]) state.traits[key]=0;
    const beforeTier=Math.floor(state.traits[key]/3);
    state.traits[key]=Math.max(0, state.traits[key]+amount);
    const afterTier=Math.floor(state.traits[key]/3);
    if(afterTier>beforeTier && afterTier>0){
      logEvent(`Trait deepened: ${traitLabels[key]} (${reason}).`);
    }
  }

  function deriveTraits(choice){
    const label=(choice.label||'').toLowerCase();
    const effects=choice.effects||{};
    if(/duty|serve|kind|compassion|help|answer|selfless/.test(label)) addTrait('compassion',2,'choice');
    if(/reflect|deeply|introspection|insight|wisdom/.test(label)) addTrait('insight',2,'choice');
    if(/trust|divine|devotional|worship|love as|faith/.test(label)) addTrait('faith',2,'choice');
    if(/discipline|steady|gentle/.test(label)) addTrait('discipline',2,'choice');
    if(/avoid|withdraw|give in/.test(label)) addTrait('avoidance',2,'choice');
    if(/grasp|gain|demand|reward/.test(label)) addTrait('ambition',2,'choice');
    if(/forceful|suppression|control/.test(label)) addTrait('rigidity',2,'choice');
    if(/restless|restlessness/.test(label)) addTrait('restless',2,'choice');

    if((effects.sattva||0)>=5 || (effects.purity||0)>=5) addTrait('discipline',1,'effect');
    if((effects.clarity||0)>=5) addTrait('insight',1,'effect');
    if((effects.devotion||0)>=5) addTrait('faith',1,'effect');
    if((effects.rajas||0)>=6) addTrait('ambition',1,'effect');
    if((effects.tamas||0)>=5) addTrait('avoidance',1,'effect');
  }

  function traitModifiers(){
    const t=state.traits;
    return {
      selfless: t.compassion*1.6 + t.faith*1.1 - t.ambition*0.8,
      skilled: t.discipline*1.4 + t.insight*1.2 - t.restless*0.9 - t.rigidity*0.3,
      reward: t.ambition*1.3 + t.restless*0.9,
      hold: t.discipline*0.05 + t.faith*0.04,
      decay: t.restless*0.05 + t.avoidance*0.04,
      medEase: t.discipline*0.06 + t.insight*0.04 - t.restless*0.06 - t.avoidance*0.04
    };
  }

  function renderConsequences(){
    const el=$('#consequenceSummary');
    if(!el || !state.traits) return;
    const positives=['discipline','compassion','insight','faith'];
    const negatives=['ambition','avoidance','rigidity','restless'];
    const topPos=positives.sort((a,b)=>state.traits[b]-state.traits[a]).slice(0,2).filter(k=>state.traits[k]>0);
    const topNeg=negatives.sort((a,b)=>state.traits[b]-state.traits[a]).slice(0,2).filter(k=>state.traits[k]>0);
    const posText=topPos.length?topPos.map(k=>`${traitLabels[k]} ${state.traits[k]}`).join(' | '):'None yet';
    const negText=topNeg.length?topNeg.map(k=>`${traitLabels[k]} ${state.traits[k]}`).join(' | '):'None yet';
    el.textContent=`Virtues: ${posText}. Burdens: ${negText}.`;
  }
  function logEvent(msg){
    const list=$('#eventLog');
    if(!list) return;
    const li=document.createElement('li');
    li.textContent=msg;
    list.prepend(li);
    while(list.children.length>5) list.removeChild(list.lastChild);
  }

  function gainStreak(){
    state.karmaStreak++;
    state.bestStreak=Math.max(state.bestStreak,state.karmaStreak);
  }

  function breakStreak(reason){
    if(state.karmaStreak>=3) logEvent(`Streak lost: ${reason}`);
    state.karmaStreak=0;
  }

  function startGame(path){ state.path=path; if(path==='warrior'){ state.purity+=4; state.rajas+=6; state.sattva+=2;} if(path==='scholar'){ state.clarity+=6; state.sattva+=6;} if(path==='steward'){ state.purity+=3; state.rajas+=3; state.sattva+=3;} if(path==='worker'){ state.purity+=6; state.tamas+=2; } state.chapter=1; state.devotion+=2; state.focus+=6; renderHUD(); show('screen-hud'); logEvent(`Path chosen: ${path}`); if(!$('#skipIntro').checked) tutorial(); else nextPhase(); play('swoosh',0.5); }

  function tutorial(){ setNarrative('Welcome, Seeker.','Across 18 chapters, you will face dilemmas, choose actions, and steady your mind in meditation. Balance Sattva, purify action, and deepen devotion.',[{label:'Begin',effect: s=>{}}]); }

  function setNarrative(title,text,options){ const box=$('#narrative'); box.innerHTML=`<h3>${title}</h3><p>${text}</p>`; const choicesBox=$('#choices'); choicesBox.innerHTML=''; options.forEach(op=>{ const b=document.createElement('button'); b.className='choice'; b.textContent=op.label; b.addEventListener('click',()=>{ op.effect(state); renderHUD(); startActionPhase(); }); choicesBox.appendChild(b); }); }

  function nextPhase(){ const ch=scenes[state.chapter]; setNarrative(`Chapter ${ch.chapter}: ${ch.title}`, ch.text, ch.choices.map(o=>({ label:o.label, effect:(s)=>{ applyEffects(o.effects); deriveTraits(o); s.focus+=2; if(s.sattva>60){ s.rajas=Math.max(0,s.rajas-1); s.tamas=Math.max(0,s.tamas-1);} logEvent(`Choice made: ${o.label}`); } })) ); $('#actionName').textContent=ch.action; }

  function startActionPhase(){ $('#actionPhase').classList.remove('hidden'); $('#actionResult').textContent=''; }

  function resolveActionChoice(type){ const ch=scenes[state.chapter]; const name=ch.action; let msg=''; const streakBonus=Math.min(6, state.karmaStreak); const mods=traitModifiers();
    if(type==='selfless'){ const score= state.sattva*0.7 + state.purity*0.8 - state.tamas*0.2 + state.focus*0.15 + mods.selfless + rand()*25; if(score>65){ state.purity+=8+streakBonus; state.serviceCount++; state.focus+=6; addTrait('compassion',1,'action'); gainStreak(); msg=`You perform: ${name}. Deep purity arises.`; } else { state.purity+=4; state.focus+=2; gainStreak(); msg=`You attempt: ${name}. Some purity is gained.`; } }
    if(type==='skilled'){ const score= state.rajas*0.6 + state.sattva*0.3 - state.tamas*0.3 + state.focus*0.1 + mods.skilled + rand()*25; if(score>65){ state.clarity+=5+Math.floor(streakBonus/2); state.purity+=2; state.focus+=4; addTrait('discipline',1,'action'); gainStreak(); msg=`${name} executed with skill and balance.`; } else { state.clarity+=3; state.focus+=1; msg=`${name} has mixed results but teaches you.`; } }
    if(type==='reward'){ const score= state.rajas*0.7 + mods.reward + rand()*25 - state.sattva*0.3; if(score>60){ state.rajas+=7; state.clarity-=2; state.focus-=8; addTrait('ambition',1,'action'); msg=`${name} yields rewards but binds you.`; } else { state.tamas+=5; state.clarity-=3; state.focus-=10; addTrait('restless',1,'action'); msg=`${name} done for gain increases restlessness.`; } breakStreak('reward-seeking action'); }
    $('#actionResult').textContent=msg; $('#actionPhase').classList.add('hidden'); if(scenes.map.boss_nodes.includes(state.chapter)){ startBossPhase(); } else { startMeditationPhase(); }
    logEvent(msg);
    renderHUD();
  }

  // Boss phase — tap/hold to fill meter
  function startBossPhase(){
    $('#bossPhase').classList.remove('hidden');
    updateAmbience('boss');
    state.bossProgress=0;
    const profile=bossProfiles[state.chapter]||{ name:'Shadow', holdBoost:0.8, decayBoost:0.3, tamasDrain:1, focusDrain:2, note:'Stay present.' };
    $('#bossName').textContent=`Inner Enemy: ${profile.name} — ${profile.note}`;
    $('#bossMeter').style.width='0%';
    const tap=$('#bossTap');
    let pressing=false, raf=null;
    let elapsed=0;
    function step(){
      const mods=traitModifiers();
      const holdGain=0.75+profile.holdBoost+state.sattva*0.01+state.focus*0.004+mods.hold;
      const releaseDecay=0.45+profile.decayBoost-state.tamas*0.002+mods.decay;
      if(pressing){
        state.bossProgress=Math.min(100, state.bossProgress+holdGain);
      } else {
        state.bossProgress=Math.max(0, state.bossProgress-releaseDecay);
      }
      elapsed++;
      if(elapsed%120===0 && !pressing){
        state.focus=Math.max(0,state.focus-profile.focusDrain);
      }
      if(elapsed%180===0 && pressing){
        state.tamas=Math.max(0,state.tamas-profile.tamasDrain);
      }
      $('#bossMeter').style.width=state.bossProgress+'%';
      if(state.bossProgress>=100){
        cancelAnimationFrame(raf);
        $('#bossPhase').classList.add('hidden');
        play('bell',0.6);
        state.clarity+=6;
        state.sattva+=4;
        state.focus+=5;
        logEvent(`Inner enemy dissolved: ${profile.name}.`);
        renderHUD();
        startMeditationPhase();
        return;
      }
      renderHUD();
      raf=requestAnimationFrame(step);
    }
    tap.onpointerdown=()=>{ pressing=true; play('hum',0.15); };
    tap.onpointerup=()=>{ pressing=false; };
    tap.onpointerleave=()=>{ pressing=false; };
    raf=requestAnimationFrame(step);
  }

  function startMeditationPhase(){ $('#meditationPhase').classList.remove('hidden'); updateAmbience('meditation'); $('#medPrompt').textContent=scenes[state.chapter].meditation; $('#medResult').textContent='Steady your mind...'; $('#nextChapter').disabled=true; startMeditation(); }

  // Meditation mini‑game
  let med={ x:150,y:90,vx:2.2,vy:1.6,insideTime:0 };
  const medCanvas=$('#medCanvas'); const ctx= medCanvas.getContext('2d');
  function drawMeditation(){ const w=medCanvas.width,h=medCanvas.height; ctx.clearRect(0,0,w,h); ctx.strokeStyle='#4cc9f0'; ctx.lineWidth=2; ctx.beginPath(); ctx.arc(w*0.75,h*0.5,28,0,Math.PI*2); ctx.stroke(); ctx.fillStyle='#e6edf3'; ctx.beginPath(); ctx.arc(med.x,med.y,6,0,Math.PI*2); ctx.fill(); ctx.fillStyle='#9fb3c8'; ctx.fillRect(10,h-18,(med.insideTime/7)*(w-20),8); }
  function updateMeditation(dt,targetTime){ const w=medCanvas.width,h=medCanvas.height; const ease=1+Math.max(0,(state.rajas+state.tamas-state.sattva)/120)-Math.min(0.2,state.focus/600); med.x+=med.vx*dt*ease; med.y+=med.vy*dt*ease; if(med.x<10||med.x>w-10) med.vx*=-1; if(med.y<10||med.y>h-10) med.vy*=-1; const dx=med.x-w*0.75, dy=med.y-h*0.5; const inside= Math.sqrt(dx*dx+dy*dy)<=28; if(inside) med.insideTime+=dt; if(!inside) state.focus=Math.max(0,state.focus-0.02); $('#medTarget').textContent=`Hold center for ${targetTime.toFixed(1)}s`; drawMeditation(); }
  function nudgeMeditation(mx,my){ const dx=mx-med.x, dy=my-med.y; med.vx+=dx*0.005; med.vy+=dy*0.005; }
  function startMeditation(){ med={ x:50+rand()*60,y:50+rand()*60,vx:(rand()*2+1.8),vy:(rand()*2+1.2),insideTime:0 }; const mods=traitModifiers(); const targetTime=Math.max(4.2, 7 - state.focus/80 + state.chapter*0.03 - mods.medEase); drawMeditation(); let last=performance.now(); function loop(now){ const dt=Math.min(0.05,(now-last)/1000); last=now; updateMeditation(dt,targetTime); if(med.insideTime>=targetTime){ cancelAnimationFrame(anim); const streakBonus=Math.floor(state.karmaStreak/3); const bonus=6+Math.floor(state.sattva/20)+streakBonus; state.devotion+=bonus; state.clarity+=3; state.focus+=8; addTrait('faith',1,'meditation'); $('#medResult').textContent=`Meditation successful. Devotion +${bonus}, Clarity +3`; $('#nextChapter').disabled=false; logEvent(`Meditation complete (+${bonus} devotion).`); renderHUD(); play('bell',0.5); return; } anim=requestAnimationFrame(loop);} let anim=requestAnimationFrame(loop); }
  medCanvas?.addEventListener('mousemove', e=> nudgeMeditation(e.offsetX,e.offsetY));
  medCanvas?.addEventListener('touchmove', e=>{ const r=medCanvas.getBoundingClientRect(); const t=e.touches[0]; nudgeMeditation(t.clientX-r.left, t.clientY-r.top); e.preventDefault(); }, {passive:false});

  // Krishna events
  function applyBlessingWithTradeoff(v){
    if(v==='clarity'){
      state.clarity+=8;
      state.devotion=Math.max(0,state.devotion-2);
      state.focus+=4;
      logEvent('Blessing: clarity gained, devotion tempered.');
    }
    if(v==='strength'){
      state.rajas+=5;
      state.sattva+=2;
      state.tamas+=1;
      logEvent('Blessing: strength gained, restlessness stirred.');
    }
    if(v==='devotion'){
      state.devotion+=10;
      state.clarity=Math.max(0,state.clarity-1);
      state.focus+=2;
      logEvent('Blessing: devotion deepened, analysis softened.');
    }
    if(v==='detachment'){
      state.purity+=6;
      state.rajas=Math.max(0,state.rajas-3);
      state.focus=Math.max(0,state.focus-1);
      logEvent('Blessing: detachment purified action, momentum slowed.');
    }
  }

  function krishnaEventIfAny(){ if(scenes.map.krishna_events.includes(state.chapter)){ const dlg=$('#krishnaDlg'); dlg.returnValue=''; dlg.showModal(); play('hum',0.35); dlg.addEventListener('close',()=>{ const v=dlg.returnValue; applyBlessingWithTradeoff(v); state.focus+=6; logEvent(`Guidance received: ${v||'none'}`); proceedChapter(); }, {once:true}); } else { proceedChapter(); } }

  function proceedChapter(){ // check win
    if(state.clarity>=60 && state.purity>=60 && state.devotion>=60){ if(state.chapter>=18){ win(); return; } }
    if(state.focus<=0){ gameOver('Your focus was depleted.'); return; }
    state.chapter++; if(state.chapter>state.maxChapters){ gameOver(); return; } renderHUD(); nextPhase(); play('swoosh',0.45); }

  function buildEnding(){
    const balance=Math.abs(state.sattva-state.rajas)+Math.abs(state.rajas-state.tamas);
    if(state.devotion>=80 && state.purity>=75) return { title:'🕉 Path of Surrender', text:'Through devotion and service, you dissolved the self and entered quiet freedom.' };
    if(state.clarity>=80 && state.focus>=70) return { title:'🪞 Path of Insight', text:'Steady attention cut through confusion; liberation came as clear seeing.' };
    if(state.karmaStreak>=7) return { title:'⚖️ Path of Karma Mastery', text:'Consistent right action transformed your nature chapter by chapter.' };
    if(balance<25) return { title:'🌿 Path of Harmony', text:'You balanced the gunas with uncommon steadiness and reached Moksha in equipoise.' };
    return { title:'🔥 Path of Transformation', text:'You turned conflict into growth and crossed beyond bondage.' };
  }

  function win(){
    const ending=buildEnding();
    $('#winTitle').textContent=ending.title;
    $('#winText').textContent=ending.text;
    logEvent(`Ending unlocked: ${ending.title.replace(/[\u{1F300}-\u{1FAFF}]/gu,'').trim()}`);
    $('#winDlg').showModal();
    $('#winDlg').addEventListener('close', reset, {once:true});
  }
  function gameOver(message){ if(message) $('#gameOverReason').textContent=message; $('#gameOverDlg').showModal(); $('#gameOverDlg').addEventListener('close', reset, {once:true}); }

  function save(){ localStorage.setItem('pow_state', JSON.stringify(state)); }
  function load(){ try{ const s=JSON.parse(localStorage.getItem('pow_state')); if(s) Object.assign(state,s); }catch(e){} ensureStateShape(); }

  function ensureStateShape(){
    if(!state.traits || typeof state.traits!=='object'){
      state.traits={ discipline:0, compassion:0, insight:0, faith:0, ambition:0, avoidance:0, rigidity:0, restless:0 };
      return;
    }
    Object.keys(traitLabels).forEach(k=>{ if(typeof state.traits[k]!=='number') state.traits[k]=0; });
  }

  // Survival mode
  const survival={
    running:false,
    paused:false,
    awaitingChoice:false,
    time:0,
    chapter:1,
    maxChapters:18,
    chapterClock:0,
    chapterDuration:14,
    chapterMod:{ enemyScale:1, scarcity:1, moralPressure:1, tradeBonus:0 },
    player:{ x:380,y:210,speed:190,health:100,foodReserve:100,waterReserve:100,fullness:20,strength:24,dharma:70,kills:0,righteousKills:0,hoursSinceFood:0,hoursSinceWater:0 },
    inventory:{ grain:2, herb:1, meat:0, tonic:0, ration:0 },
    foods:[],
    waters:[],
    enemies:[],
    merchants:[],
    shrines:[],
    warriors:[],
    nonHumans:{ trees:[], animals:[], divines:[], immobiles:[] },
    rebirthCycle:[],
    karmaLedger:[],
    keys:{},
    lastTs:0,
    raf:0,
    spawnFoodAt:4,
    spawnEnemyAt:7,
    hostilePulseAt:3,
    summary:'Survive with discernment.'
  };

  const warriorArchetypes={
    warrior:{ color:'#ff8a7a', speed:72, aggression:0.78 },
    scholar:{ color:'#7cbcff', speed:58, aggression:0.2 },
    steward:{ color:'#8fe18a', speed:62, aggression:0.35 },
    worker:{ color:'#f2cf72', speed:64, aggression:0.46 }
  };

  function svClamp(v,min,max){ return Math.max(min,Math.min(max,v)); }
  function svRnd(min,max){ return min+rand()*(max-min); }

  function resetSurvival(){
    survival.running=true;
    survival.paused=true;
    survival.awaitingChoice=true;
    survival.time=0;
    survival.chapter=1;
    survival.chapterClock=0;
    survival.chapterDuration=14;
    survival.chapterMod={ enemyScale:1, scarcity:1, moralPressure:1, tradeBonus:0 };
    survival.lastTs=0;
    survival.spawnFoodAt=2.5;
    survival.spawnEnemyAt=4.2;
    survival.hostilePulseAt=3;
    survival.player={ x:380,y:210,speed:190,health:100,foodReserve:100,waterReserve:100,fullness:20,strength:24,dharma:70,kills:0,righteousKills:0,hoursSinceFood:0,hoursSinceWater:0 };
    survival.peaceActions=0;
    survival.inventory={ grain:2, herb:1, meat:0, tonic:0, ration:0 };
    survival.foods=[];
    survival.waters=[];
    survival.enemies=[];
    survival.merchants=[];
    survival.shrines=[];
    survival.warriors=[];
    survival.nonHumans={ trees:[], animals:[], divines:[], immobiles:[] };
    survival.rebirthCycle=[];
    survival.karmaLedger=[];
    survival.summary='Survive with discernment.';
    for(let i=0;i<6;i++) spawnFood();
    for(let i=0;i<5;i++) spawnWater();
    for(let i=0;i<4;i++) spawnEnemy();
    for(let i=0;i<2;i++) spawnMerchant();
    for(let i=0;i<2;i++) spawnShrine();
    spawnWarriorPopulation();
    spawnNonHumans();
    pushKarmaLedger('The cycle begins. Karma now shapes rebirth.');
    showChapterChoice();
    renderSurvivalHUD();
    drawSurvival();
  }

  function karmaStamp(){
    const h=Math.floor(survival.time);
    const day=Math.floor(h/24)+1;
    const hour=(h%24).toString().padStart(2,'0');
    return `D${day} H${hour}`;
  }

  function pushKarmaLedger(msg){
    survival.karmaLedger.unshift(`${karmaStamp()} - ${msg}`);
    if(survival.karmaLedger.length>10) survival.karmaLedger.length=10;
  }

  function applyKarma(warrior,delta,reason){
    const before=getRebirthState(warrior.karma||0);
    warrior.karma=(warrior.karma||0)+delta;
    const after=getRebirthState(warrior.karma||0);
    if(before!==after){
      const dir=delta>=0?'promoted':'demoted';
      pushKarmaLedger(`${warrior.trait} ${dir} tendency ${before} -> ${after} (${reason})`);
    }
  }

  function renderKarmaLedger(){
    const el=$('#svLedger');
    if(!el) return;
    el.innerHTML='';
    survival.karmaLedger.forEach((line)=>{
      const li=document.createElement('li');
      li.textContent=line;
      el.appendChild(li);
    });
  }

  function getChapterData(ch){
    const titles=[
      'The Call to Duty','Discipline of Action','Right Intention','Heat of Conflict','Service Over Ego','Steady Mind',
      'Knowledge in Action','Renunciation of Excess','Guarding the Heart','Trials of Responsibility','Compassion in Power','Path of Devotion',
      'Field of Consequences','Witness and Will','Surrendered Strength','Dharma Under Shadow','Final Restraint','Liberating Action'
    ];
    const themes=[
      'Choose how to begin your duty.',
      'Choose the mind with which you act.',
      'Decide your motive before pressure rises.',
      'Conflict intensifies; choose restraint or force.',
      'Resources thin; choose service or self-protection.',
      'Thoughts scatter; choose your discipline.',
      'Knowledge must become behavior.',
      'Renounce what binds you.',
      'Defend without hatred.',
      'Leadership carries karmic weight.',
      'Compassion is tested by scarcity.',
      'Devotion steadies the hand.',
      'Actions now have sharper consequences.',
      'Witness impulses before acting.',
      'Strength with surrender or aggression?',
      'Darkness rises; what anchors you?',
      'Final tests of hunger and anger.',
      'Act with freedom from attachment.'
    ];
    const stage=ch<=6?1:ch<=12?2:3;
    const choices=stage===1?
      [
        { id:'duty', label:'Answer Duty', apply:()=>{ survival.player.dharma+=5; survival.player.strength+=2; survival.chapterMod.enemyScale+=0.05; } },
        { id:'restraint', label:'Practice Restraint', apply:()=>{ survival.player.fullness=Math.max(0,survival.player.fullness-6); survival.chapterMod.scarcity-=0.06; survival.chapterMod.moralPressure-=0.05; } },
        { id:'study', label:'Reflect and Study', apply:()=>{ survival.player.dharma+=4; survival.player.health+=4; survival.chapterMod.tradeBonus+=1; } }
      ]:
      stage===2?
      [
        { id:'protect', label:'Protect the Weak', apply:()=>{ survival.player.dharma+=6; survival.player.strength+=3; survival.chapterMod.enemyScale+=0.08; } },
        { id:'serve', label:'Serve Through Trade', apply:()=>{ addResource('grain',1); addResource('herb',1); survival.chapterMod.tradeBonus+=2; survival.chapterMod.scarcity-=0.1; } },
        { id:'detach', label:'Detach From Reward', apply:()=>{ survival.player.dharma+=5; survival.player.hoursSinceFood=Math.max(0,survival.player.hoursSinceFood-8); survival.chapterMod.moralPressure-=0.08; } }
      ]:
      [
        { id:'sacrifice', label:'Sacrifice Comfort', apply:()=>{ survival.player.hoursSinceFood=Math.min(167,survival.player.hoursSinceFood+8); survival.player.dharma+=8; survival.chapterMod.enemyScale+=0.1; } },
        { id:'mercy', label:'Choose Mercy', apply:()=>{ survival.player.dharma+=7; survival.peaceActions+=1; survival.chapterMod.moralPressure-=0.12; } },
        { id:'resolve', label:'Unshaken Resolve', apply:()=>{ survival.player.strength+=5; survival.player.health+=3; survival.chapterMod.enemyScale+=0.12; survival.chapterMod.scarcity+=0.06; } }
      ];
    return { title:titles[ch-1]||`Chapter ${ch}`, text:themes[ch-1]||'Choose wisely.', choices };
  }

  function applyChapterBaseScaling(){
    const ch=survival.chapter;
    survival.chapterDuration=Math.max(12, 18 - Math.floor((ch-1)/3));
    survival.chapterMod.enemyScale=1 + (ch-1)*0.06;
    survival.chapterMod.scarcity=1 + (ch-1)*0.035;
    survival.chapterMod.moralPressure=1 + (ch-1)*0.03;
    survival.chapterMod.tradeBonus=Math.floor((ch-1)/6);
  }

  function showChapterChoice(){
    applyChapterBaseScaling();
    const data=getChapterData(survival.chapter);
    $('#svChapterTitle').textContent=`Chapter ${survival.chapter}: ${data.title}`;
    $('#svChapterText').textContent=data.text;
    const box=$('#svChapterChoices');
    box.innerHTML='';
    data.choices.forEach(c=>{
      const b=document.createElement('button');
      b.className='choice';
      b.textContent=c.label;
      b.addEventListener('click',()=>{
        c.apply();
        survival.awaitingChoice=false;
        survival.paused=false;
        survival.chapterClock=0;
        survival.summary=`Chapter ${survival.chapter} chosen: ${c.label}.`;
        renderSurvivalHUD();
      });
      box.appendChild(b);
    });
  }

  function spawnFood(){
    const valueScale=Math.max(0.7, 1.05 - (survival.chapterMod.scarcity-1)*0.35);
    survival.foods.push({ x:svRnd(24,736), y:svRnd(24,396), value:svRnd(14,24)*valueScale, kind:rand()<0.55?'grain':'herb' });
  }

  function spawnWater(){
    survival.waters.push({ x:svRnd(30,730), y:svRnd(30,390), purity:svRnd(0.8,1.1) });
  }

  function spawnEnemy(){
    const r=rand();
    const faction=r<0.36?'raider':r<0.68?'beast':'pilgrim';
    const hostileByDefault=faction==='raider' || (faction==='beast' && rand()<0.35);
    const scale=survival.chapterMod.enemyScale;
    survival.enemies.push({
      x:svRnd(24,736), y:svRnd(24,396), hp:svRnd(22,38)*scale, speed:svRnd(48,74)*(0.92+scale*0.12), hostile:hostileByDefault, threat:svRnd(10,70)+(survival.chapter-1)*1.4, cooldown:0,
      faction,
      wasAttacked:false,
      lastHarmToPlayer:0
    });
  }

  function spawnMerchant(){
    survival.merchants.push({ x:svRnd(40,720), y:svRnd(40,380), cooldown:0 });
  }

  function spawnShrine(){
    survival.shrines.push({ x:svRnd(40,720), y:svRnd(40,380), cooldown:0 });
  }

  function spawnWarriorPopulation(){
    Object.keys(warriorArchetypes).forEach((trait)=>{
      const profile=warriorArchetypes[trait];
      for(let i=0;i<18;i++){
        survival.warriors.push({
          trait,
          x:svRnd(20,740),
          y:svRnd(20,400),
          speed:profile.speed,
          strength:18 + rand()*12,
          health:38 + rand()*18,
          hoursSinceFood:rand()*24,
          hoursSinceWater:rand()*12,
          karma:0,
          alive:true,
          cooldown:0,
          dispute:0
        });
      }
    });
  }

  function spawnNonHumans(){
    for(let i=0;i<18;i++){
      survival.nonHumans.trees.push({ x:svRnd(20,740), y:svRnd(20,400), vitality:70+rand()*30, fruitCooldown:svRnd(8,20) });
      survival.nonHumans.animals.push({ x:svRnd(20,740), y:svRnd(20,400), vitality:40+rand()*20, hunger:svRnd(10,30), thirst:svRnd(8,24), alive:true });
    }
    for(let i=0;i<6;i++){
      survival.nonHumans.divines.push({ x:svRnd(30,730), y:svRnd(30,390), grace:60+rand()*35, pulse:svRnd(1,4) });
      survival.nonHumans.immobiles.push({ x:svRnd(18,742), y:svRnd(18,402), stillness:80+rand()*20 });
    }
  }

  function getRebirthState(karma){
    if(karma>=12) return 'divine';
    if(karma>=2) return 'human';
    if(karma>=-6) return 'animal';
    if(karma>=-14) return 'plant';
    return 'immobile';
  }

  function queueRebirth(warrior,cause){
    const state=getRebirthState(warrior.karma||0);
    const timer=state==='divine'?6:state==='human'?12:state==='animal'?10:state==='plant'?14:18;
    pushKarmaLedger(`${warrior.trait} died (${cause}) -> rebirth queued as ${state}`);
    survival.rebirthCycle.push({
      state,
      timer,
      trait:warrior.trait,
      karma:warrior.karma||0,
      cause
    });
  }

  function applyRebirth(entry){
    if(entry.state==='human'){
      const profile=warriorArchetypes[entry.trait]||warriorArchetypes.worker;
      survival.warriors.push({
        trait:entry.trait,
        x:svRnd(20,740), y:svRnd(20,400),
        speed:profile.speed,
        strength:16 + rand()*10,
        health:35 + rand()*18,
        hoursSinceFood:svRnd(0,8),
        hoursSinceWater:svRnd(0,6),
        karma:Math.max(-2,Math.min(6,entry.karma*0.4)),
        alive:true,
        cooldown:0,
        dispute:0
      });
      pushKarmaLedger(`${entry.trait} reborn as human with adjusted karma.`);
      return;
    }
    if(entry.state==='divine'){
      survival.nonHumans.divines.push({ x:svRnd(30,730), y:svRnd(30,390), grace:72+rand()*25, pulse:svRnd(1,3) });
      pushKarmaLedger(`${entry.trait} ascended into divine state.`);
      return;
    }
    if(entry.state==='animal'){
      survival.nonHumans.animals.push({ x:svRnd(20,740), y:svRnd(20,400), vitality:38+rand()*18, hunger:svRnd(6,20), thirst:svRnd(5,18), alive:true });
      pushKarmaLedger(`${entry.trait} reborn as animal.`);
      return;
    }
    if(entry.state==='plant'){
      survival.nonHumans.trees.push({ x:svRnd(20,740), y:svRnd(20,400), vitality:60+rand()*25, fruitCooldown:svRnd(10,24) });
      pushKarmaLedger(`${entry.trait} reborn as plant form.`);
      return;
    }
    survival.nonHumans.immobiles.push({ x:svRnd(18,742), y:svRnd(18,402), stillness:90+rand()*30 });
    pushKarmaLedger(`${entry.trait} fell to immobile rebirth.`);
  }

  function survivalInventoryText(){
    const i=survival.inventory;
    return `Inventory: grain ${i.grain}, herb ${i.herb}, meat ${i.meat}, ration ${i.ration}, tonic ${i.tonic}`;
  }

  function warriorSummaryText(){
    const counts={ warrior:0, scholar:0, steward:0, worker:0 };
    survival.warriors.forEach(w=>{ if(w.alive) counts[w.trait]++; });
    const trees=survival.nonHumans.trees.length;
    const animals=survival.nonHumans.animals.filter(a=>a.alive).length;
    const divines=survival.nonHumans.divines.length;
    return `Warriors alive: Warrior ${counts.warrior}/18 | Scholar ${counts.scholar}/18 | Steward ${counts.steward}/18 | Worker ${counts.worker}/18 | Trees ${trees} | Animals ${animals} | Divine ${divines} | Rebirths ${survival.rebirthCycle.length}`;
  }

  function updateHintLine(){
    const hints=[];
    if(nearestFoodInRange(30)>=0) hints.push('Food nearby: E');
    if(nearestWaterInRange(30)>=0) hints.push('Water nearby: R');
    if(nearestMerchantInRange(30)>=0) hints.push('Merchant nearby: T');
    if(nearestShrineInRange(30)>=0) hints.push('Shrine nearby: B');
    if(nearestEnemyInRange(40)>=0) hints.push('Enemy close: K only if just');
    $('#svHint').textContent=`Hint: ${hints.length?hints.join(' | '):'Watch labels on objects and keep food and water reserves above zero.'}`;
  }

  function addResource(kind,count=1){
    if(typeof survival.inventory[kind]!=='number') survival.inventory[kind]=0;
    survival.inventory[kind]+=count;
  }

  function craftItem(){
    if(!survival.running || survival.paused) return;
    const i=survival.inventory;
    const p=survival.player;
    if(i.herb>=2){
      i.herb-=2;
      i.tonic+=1;
      p.health=svClamp(p.health+10,0,100);
      p.dharma=svClamp(p.dharma+3,0,100);
      p.hoursSinceWater=Math.max(0,p.hoursSinceWater-10);
      survival.summary='Crafted and used a tonic: health restored.';
      play('hum',0.24,0.03);
    } else if(i.grain>=2){
      i.grain-=2;
      i.ration+=1;
      p.hoursSinceFood=Math.max(0,p.hoursSinceFood-56);
      p.fullness=svClamp(p.fullness+8,0,100);
      p.strength=svClamp(p.strength+2,0,100);
      survival.summary='Crafted and ate a ration.';
      play('hum',0.18,0.03);
    } else if(i.meat>=1 && i.herb>=1){
      i.meat-=1;
      i.herb-=1;
      p.hoursSinceFood=Math.max(0,p.hoursSinceFood-72);
      p.fullness=svClamp(p.fullness+16,0,100);
      p.strength=svClamp(p.strength+6,0,100);
      p.dharma=svClamp(p.dharma+1,0,100);
      survival.summary='Prepared a balanced meal from supplies.';
      play('hum',0.22,0.03);
    } else {
      survival.summary='Not enough materials to craft.';
    }
    renderSurvivalHUD();
  }

  function isRighteousTarget(enemy){
    if(enemy.faction==='raider') return true;
    if(enemy.hostile) return true;
    if(enemy.lastHarmToPlayer>0) return true;
    if(enemy.threat>=62) return true;
    return false;
  }

  function renderSurvivalHUD(){
    const p=survival.player;
    $('#svHealth').value=svClamp(Math.round(p.health),0,100);
    $('#svHunger').value=svClamp(Math.round(100*(1-p.hoursSinceFood/168)),0,100);
    $('#svWater').value=svClamp(Math.round(100*(1-p.hoursSinceWater/72)),0,100);
    $('#svFullness').value=svClamp(Math.round(p.fullness),0,100);
    $('#svStrength').value=svClamp(Math.round(p.strength),0,100);
    $('#svDharma').value=svClamp(Math.round(p.dharma),0,100);
    const remain=Math.max(0,Math.ceil(survival.chapterDuration-survival.chapterClock));
    $('#svSummary').textContent=`${survival.summary} | Chapter ${survival.chapter}/${survival.maxChapters} | T-${remain}s | Kills ${p.kills} (${p.righteousKills} righteous)`;
    $('#svInventory').textContent=survivalInventoryText();
    $('#svPeace').textContent=`Peace Path: ${survival.peaceActions} actions`;
    $('#svWarriors').textContent=warriorSummaryText();
    updateHintLine();
    renderKarmaLedger();
  }

  function drawSurvival(){
    const canvas=$('#survivalCanvas');
    const c=canvas.getContext('2d');
    c.clearRect(0,0,canvas.width,canvas.height);

    c.fillStyle='rgba(132,193,125,.18)';
    for(let i=0;i<11;i++) c.fillRect(i*70+8, 0, 2, canvas.height);
    for(let i=0;i<7;i++) c.fillRect(0, i*70+8, canvas.width, 2);

    survival.foods.forEach(f=>{
      c.fillStyle='#f7cd7a';
      c.beginPath(); c.arc(f.x,f.y,7,0,Math.PI*2); c.fill();
      c.fillStyle='#f39d66';
      c.beginPath(); c.arc(f.x+2,f.y-2,3,0,Math.PI*2); c.fill();
      c.fillStyle='rgba(255,255,255,.8)';
      c.font='10px Trebuchet MS';
      c.fillText('Food', f.x-10, f.y-10);
    });

    survival.waters.forEach(w=>{
      c.fillStyle='#75d0ff';
      c.beginPath(); c.arc(w.x,w.y,9,0,Math.PI*2); c.fill();
      c.fillStyle='rgba(255,255,255,.8)';
      c.font='10px Trebuchet MS';
      c.fillText('Water', w.x-12, w.y-12);
    });

    survival.enemies.forEach(e=>{
      c.fillStyle=e.faction==='raider'?'#ff7a88':e.faction==='beast'?'#f2c273':'#9aaec3';
      c.beginPath(); c.arc(e.x,e.y,10,0,Math.PI*2); c.fill();
      c.fillStyle='#0f1620';
      c.fillRect(e.x-4,e.y-1,8,2);
      c.strokeStyle='rgba(255,255,255,.35)';
      c.strokeRect(e.x-12,e.y-16,24,3);
      c.fillStyle=e.hostile?'#ffbc7a':'#8ae0c8';
      c.fillRect(e.x-12,e.y-16,24*(e.hp/38),3);
      if(e.hostile){ c.strokeStyle='rgba(255,130,140,.8)'; c.strokeRect(e.x-13,e.y-13,26,26); }
      c.fillStyle='rgba(255,255,255,.78)';
      c.font='10px Trebuchet MS';
      c.fillText(e.faction, e.x-16, e.y+22);
    });

    survival.merchants.forEach(m=>{
      c.fillStyle='#7cd2ff';
      c.fillRect(m.x-8,m.y-8,16,16);
      c.fillStyle='#d8f3ff';
      c.fillRect(m.x-3,m.y-12,6,4);
      c.fillStyle='rgba(255,255,255,.8)';
      c.font='10px Trebuchet MS';
      c.fillText('Trade', m.x-12, m.y-14);
    });

    survival.shrines.forEach(s=>{
      c.strokeStyle='#f2d58a';
      c.lineWidth=2;
      c.beginPath(); c.arc(s.x,s.y,10,0,Math.PI*2); c.stroke();
      c.beginPath(); c.moveTo(s.x,s.y-6); c.lineTo(s.x,s.y+6); c.stroke();
      c.beginPath(); c.moveTo(s.x-6,s.y); c.lineTo(s.x+6,s.y); c.stroke();
      c.fillStyle='rgba(255,255,255,.82)';
      c.font='10px Trebuchet MS';
      c.fillText('Shrine', s.x-14, s.y-14);
    });

    survival.nonHumans.trees.forEach(t=>{
      c.fillStyle='#5dbb63';
      c.fillRect(t.x-3,t.y-7,6,12);
      c.fillStyle='#3f8e4a';
      c.beginPath(); c.arc(t.x,t.y-10,8,0,Math.PI*2); c.fill();
    });

    survival.nonHumans.animals.forEach(a=>{
      if(!a.alive) return;
      c.fillStyle='#dcb57a';
      c.beginPath(); c.arc(a.x,a.y,4,0,Math.PI*2); c.fill();
    });

    survival.nonHumans.divines.forEach(d=>{
      c.strokeStyle='rgba(176,233,255,.9)';
      c.lineWidth=1.5;
      c.beginPath(); c.arc(d.x,d.y,7+d.pulse,0,Math.PI*2); c.stroke();
      c.fillStyle='rgba(195,241,255,.65)';
      c.beginPath(); c.arc(d.x,d.y,3,0,Math.PI*2); c.fill();
    });

    survival.nonHumans.immobiles.forEach(i=>{
      c.fillStyle='#7f8792';
      c.fillRect(i.x-4,i.y-3,8,6);
    });

    survival.warriors.forEach(w=>{
      if(!w.alive) return;
      c.fillStyle=warriorArchetypes[w.trait].color;
      c.beginPath(); c.arc(w.x,w.y,5,0,Math.PI*2); c.fill();
      c.fillStyle='rgba(255,255,255,.72)';
      c.font='9px Trebuchet MS';
      c.fillText(w.trait[0].toUpperCase(), w.x-3, w.y-8);
    });

    const p=survival.player;
    c.fillStyle='#79d7ff';
    c.beginPath(); c.arc(p.x,p.y,10,0,Math.PI*2); c.fill();
    c.strokeStyle='rgba(255,255,255,.8)';
    c.strokeRect(p.x-14,p.y-20,28,4);
    c.fillStyle='#8ae051';
    c.fillRect(p.x-14,p.y-20,28*(p.health/100),4);
  }

  function nearestFoodInRange(range){
    const p=survival.player;
    let best=-1,bestD=1e9;
    survival.foods.forEach((f,i)=>{ const d=(f.x-p.x)**2+(f.y-p.y)**2; if(d<range*range && d<bestD){best=i;bestD=d;} });
    return best;
  }

  function nearestWaterInRange(range){
    const p=survival.player;
    let best=-1,bestD=1e9;
    survival.waters.forEach((w,i)=>{ const d=(w.x-p.x)**2+(w.y-p.y)**2; if(d<range*range && d<bestD){best=i;bestD=d;} });
    return best;
  }

  function nearestEnemyInRange(range){
    const p=survival.player;
    let best=-1,bestD=1e9;
    survival.enemies.forEach((e,i)=>{ const d=(e.x-p.x)**2+(e.y-p.y)**2; if(d<range*range && d<bestD){best=i;bestD=d;} });
    return best;
  }

  function nearestMerchantInRange(range){
    const p=survival.player;
    let best=-1,bestD=1e9;
    survival.merchants.forEach((m,i)=>{ const d=(m.x-p.x)**2+(m.y-p.y)**2; if(d<range*range && d<bestD){best=i;bestD=d;} });
    return best;
  }

  function nearestShrineInRange(range){
    const p=survival.player;
    let best=-1,bestD=1e9;
    survival.shrines.forEach((s,i)=>{ const d=(s.x-p.x)**2+(s.y-p.y)**2; if(d<range*range && d<bestD){best=i;bestD=d;} });
    return best;
  }

  function eatFood(){
    if(!survival.running || survival.paused) return;
    const idx=nearestFoodInRange(26);
    if(idx<0){ survival.summary='No food close enough to eat.'; renderSurvivalHUD(); return; }
    const meal=survival.foods.splice(idx,1)[0];
    const p=survival.player;
    addResource(meal.kind,1);
    p.hoursSinceFood=Math.max(0,p.hoursSinceFood-meal.value*4.5);
    p.fullness=svClamp(p.fullness+meal.value*0.9,0,100);
    if(p.fullness>82){
      p.health-=4;
      p.dharma-=2;
      survival.summary='Overeating clouds discipline.';
    } else {
      p.strength=svClamp(p.strength+2,0,100);
      survival.summary=`You gather ${meal.kind} and eat mindfully.`;
    }
    play('hum',0.2,0.03);
    renderSurvivalHUD();
  }

  function drinkWater(){
    if(!survival.running || survival.paused) return;
    const idx=nearestWaterInRange(26);
    if(idx<0){ survival.summary='No water source close enough.'; renderSurvivalHUD(); return; }
    const p=survival.player;
    const source=survival.waters[idx];
    p.hoursSinceWater=Math.max(0,p.hoursSinceWater-42*source.purity);
    p.fullness=Math.max(0,p.fullness-3);
    survival.summary='You drink water and steady yourself.';
    play('hum',0.16,0.02);
    renderSurvivalHUD();
  }

  function tradeMerchant(){
    if(!survival.running || survival.paused) return;
    const idx=nearestMerchantInRange(28);
    if(idx<0){ survival.summary='No merchant nearby.'; renderSurvivalHUD(); return; }
    const m=survival.merchants[idx];
    if(m.cooldown>0){ survival.summary='Merchant is not ready to trade yet.'; renderSurvivalHUD(); return; }
    const i=survival.inventory;
    const p=survival.player;
    if(i.grain>=1){
      i.grain-=1;
      i.herb+=1;
      p.dharma=svClamp(p.dharma+2+survival.chapterMod.tradeBonus*0.5,0,100);
      survival.peaceActions++;
      survival.summary='Trade complete: grain exchanged for herb.';
      m.cooldown=8;
      play('hum',0.2,0.03);
    } else if(i.meat>=1){
      i.meat-=1;
      i.ration+=1;
      p.dharma=svClamp(p.dharma+1+survival.chapterMod.tradeBonus*0.5,0,100);
      survival.peaceActions++;
      survival.summary='Trade complete: meat exchanged for ration.';
      m.cooldown=8;
      play('hum',0.2,0.03);
    } else {
      survival.summary='No goods to trade. Gather resources first.';
    }
    renderSurvivalHUD();
  }

  function blessShrine(){
    if(!survival.running || survival.paused) return;
    const idx=nearestShrineInRange(28);
    if(idx<0){ survival.summary='No shrine nearby.'; renderSurvivalHUD(); return; }
    const s=survival.shrines[idx];
    if(s.cooldown>0){ survival.summary='Shrine energy is replenishing.'; renderSurvivalHUD(); return; }
    const i=survival.inventory;
    const p=survival.player;
    if(i.herb>=1){
      i.herb-=1;
      p.dharma=svClamp(p.dharma+6,0,100);
      p.health=svClamp(p.health+6,0,100);
      p.fullness=svClamp(p.fullness-4,0,100);
      survival.peaceActions++;
      survival.summary='You offer herbs and receive a blessing.';
      s.cooldown=12;
      play('bell',0.32,0.02);
    } else {
      survival.summary='An offering is required (need 1 herb).';
    }
    renderSurvivalHUD();
  }

  function strikeEnemy(){
    if(!survival.running || survival.paused) return;
    const idx=nearestEnemyInRange(38);
    if(idx<0){ survival.summary='No enemy in striking range.'; renderSurvivalHUD(); return; }
    const p=survival.player;
    const e=survival.enemies[idx];
    e.wasAttacked=true;
    e.hostile=true;
    const damage=6 + p.strength*0.18 + svRnd(0,4);
    e.hp-=damage;
    const righteous=isRighteousTarget(e);
    if(righteous){ p.dharma=svClamp(p.dharma+1.4,0,100); p.righteousKills++; survival.summary='You strike in defense of dharma.'; }
    else { p.dharma=svClamp(p.dharma-8,0,100); p.health-=3; survival.summary='Unjust harm weakens your spirit.'; }
    play('swoosh',0.28,0.09);
    if(e.hp<=0){
      p.kills++;
      p.strength=svClamp(p.strength+3,0,100);
      if(e.faction==='raider') addResource('grain',1);
      if(e.faction==='beast') addResource('meat',1);
      if(e.faction==='pilgrim') p.dharma=svClamp(p.dharma-10,0,100);
      survival.enemies.splice(idx,1);
      if(righteous) spawnFood();
    }
    renderSurvivalHUD();
  }

  function nearestFoodFor(x,y){
    let best=null,bestD=1e9;
    survival.foods.forEach((f)=>{ const d=(f.x-x)**2+(f.y-y)**2; if(d<bestD){best=f;bestD=d;} });
    return best;
  }

  function nearestWaterFor(x,y){
    let best=null,bestD=1e9;
    survival.waters.forEach((w)=>{ const d=(w.x-x)**2+(w.y-y)**2; if(d<bestD){best=w;bestD=d;} });
    return best;
  }

  function nearestWarriorFor(actor){
    let best=null,bestD=1e9;
    survival.warriors.forEach((w)=>{ if(!w.alive || w===actor) return; const d=(w.x-actor.x)**2+(w.y-actor.y)**2; if(d<bestD){best=w;bestD=d;} });
    return best;
  }

  function nearestTreeFor(x,y){
    let best=null,bestD=1e9;
    survival.nonHumans.trees.forEach((t)=>{ const d=(t.x-x)**2+(t.y-y)**2; if(d<bestD){best=t;bestD=d;} });
    return best;
  }

  function nearestAnimalFor(x,y){
    let best=null,bestD=1e9;
    survival.nonHumans.animals.forEach((a)=>{ if(!a.alive) return; const d=(a.x-x)**2+(a.y-y)**2; if(d<bestD){best=a;bestD=d;} });
    return best;
  }

  function nearestDivineFor(x,y){
    let best=null,bestD=1e9;
    survival.nonHumans.divines.forEach((d)=>{ const dist=(d.x-x)**2+(d.y-y)**2; if(dist<bestD){best=d;bestD=dist;} });
    return best;
  }

  function processRebirth(dt){
    for(let i=survival.rebirthCycle.length-1;i>=0;i--){
      const r=survival.rebirthCycle[i];
      r.timer-=dt;
      if(r.timer<=0){
        applyRebirth(r);
        survival.rebirthCycle.splice(i,1);
      }
    }
  }

  function updateWarriors(dt){
    survival.warriors.forEach((warrior)=>{
      if(!warrior.alive) return;
      warrior.hoursSinceFood+=dt;
      warrior.hoursSinceWater+=dt;
      warrior.cooldown=Math.max(0,warrior.cooldown-dt);
      warrior.dispute=Math.max(0,warrior.dispute-dt);
      if(warrior.hoursSinceFood>=168 || warrior.hoursSinceWater>=72 || warrior.health<=0){
        warrior.alive=false;
        queueRebirth(warrior,'depletion');
        return;
      }

      let target=null;
      if(warrior.hoursSinceWater>44) target=nearestWaterFor(warrior.x,warrior.y);
      else if(warrior.hoursSinceFood>96) target=nearestFoodFor(warrior.x,warrior.y);
      else if(rand()<0.04) target=nearestFoodFor(warrior.x,warrior.y) || nearestWaterFor(warrior.x,warrior.y);

      if(target){
        const dx=target.x-warrior.x, dy=target.y-warrior.y;
        const dist=Math.hypot(dx,dy)||1;
        warrior.x+=dx/dist*warrior.speed*dt;
        warrior.y+=dy/dist*warrior.speed*dt;
        if(target.purity && dist<12){ warrior.hoursSinceWater=Math.max(0,warrior.hoursSinceWater-38*target.purity); }
        if(target.kind && dist<12){
          warrior.hoursSinceFood=Math.max(0,warrior.hoursSinceFood-target.value*4);
          const idx=survival.foods.indexOf(target);
          if(idx>=0) survival.foods.splice(idx,1);
        }
      } else {
        warrior.x+=svRnd(-1,1)*warrior.speed*0.2*dt;
        warrior.y+=svRnd(-1,1)*warrior.speed*0.2*dt;
      }

      const rival=nearestWarriorFor(warrior);
      if(rival && rival.alive){
        const dist=Math.hypot(rival.x-warrior.x, rival.y-warrior.y);
        const profile=warriorArchetypes[warrior.trait];
        const scarcity=Math.max(0, survival.chapterMod.scarcity-1);
        const pressure=(warrior.hoursSinceFood>120 || warrior.hoursSinceWater>52)?0.18:0;
        if(dist<14 && warrior.cooldown<=0 && rival.cooldown<=0 && rand()<profile.aggression*(0.1+scarcity*0.08+pressure)){
          rival.health-=2+warrior.strength*0.08;
          applyKarma(warrior,-0.45,'harm to rival');
          applyKarma(rival,-0.15,'in conflict');
          warrior.cooldown=1.6;
          warrior.dispute=1.6;
          rival.dispute=1.6;
        }

        if(dist<18 && warrior.cooldown<=0 && (warrior.trait==='scholar' || warrior.trait==='steward') && rand()<0.12){
          rival.health=Math.min(100,rival.health+2.4);
          rival.hoursSinceWater=Math.max(0,rival.hoursSinceWater-2.5);
          applyKarma(warrior,0.55,'aid to rival');
          warrior.cooldown=1.1;
        }
      }

      const tree=nearestTreeFor(warrior.x,warrior.y);
      if(tree && Math.hypot(tree.x-warrior.x,tree.y-warrior.y)<16 && warrior.cooldown<=0){
        if((warrior.trait==='steward' || warrior.trait==='scholar') && rand()<0.18){
          tree.vitality=Math.min(120,tree.vitality+3);
          applyKarma(warrior,0.5,'nurtured tree');
          warrior.cooldown=0.8;
        } else if(warrior.trait==='warrior' && rand()<0.1){
          tree.vitality-=4;
          applyKarma(warrior,-0.5,'harmed tree');
          warrior.cooldown=1.1;
        }
      }

      const animal=nearestAnimalFor(warrior.x,warrior.y);
      if(animal && Math.hypot(animal.x-warrior.x,animal.y-warrior.y)<14 && warrior.cooldown<=0){
        if(warrior.trait==='worker' && rand()<0.1){
          animal.alive=false;
          warrior.hoursSinceFood=Math.max(0,warrior.hoursSinceFood-38);
          applyKarma(warrior,-0.4,'killed animal');
          warrior.cooldown=1.3;
        } else if((warrior.trait==='steward' || warrior.trait==='scholar') && rand()<0.12){
          animal.hunger=Math.max(0,animal.hunger-4);
          applyKarma(warrior,0.45,'fed animal');
          warrior.cooldown=0.9;
        }
      }

      const divine=nearestDivineFor(warrior.x,warrior.y);
      if(divine && Math.hypot(divine.x-warrior.x,divine.y-warrior.y)<20 && warrior.cooldown<=0 && warrior.karma>3 && rand()<0.08){
        warrior.health=Math.min(100,warrior.health+4);
        warrior.hoursSinceWater=Math.max(0,warrior.hoursSinceWater-5);
        applyKarma(warrior,0.35,'received divine grace');
        warrior.cooldown=1.5;
      }

      warrior.x=svClamp(warrior.x,8,752);
      warrior.y=svClamp(warrior.y,8,412);
    });

    survival.nonHumans.trees.forEach((t)=>{
      t.fruitCooldown-=dt;
      if(t.fruitCooldown<=0 && t.vitality>40 && survival.foods.length<14){
        survival.foods.push({ x:svClamp(t.x+svRnd(-12,12),24,736), y:svClamp(t.y+svRnd(-12,12),24,396), value:svRnd(10,20), kind:'grain' });
        t.fruitCooldown=svRnd(10,20);
      }
      if(t.vitality<=0){ t.vitality=8; }
    });

    survival.nonHumans.animals.forEach((a)=>{
      if(!a.alive) return;
      a.hunger+=dt;
      a.thirst+=dt;
      const nearFood=nearestFoodFor(a.x,a.y);
      const nearWater=nearestWaterFor(a.x,a.y);
      if(nearWater && a.thirst>10){
        const dx=nearWater.x-a.x, dy=nearWater.y-a.y, d=Math.hypot(dx,dy)||1;
        a.x+=dx/d*34*dt; a.y+=dy/d*34*dt;
        if(d<10) a.thirst=Math.max(0,a.thirst-18);
      } else if(nearFood && a.hunger>12){
        const dx=nearFood.x-a.x, dy=nearFood.y-a.y, d=Math.hypot(dx,dy)||1;
        a.x+=dx/d*30*dt; a.y+=dy/d*30*dt;
        if(d<10){ a.hunger=Math.max(0,a.hunger-14); const idx=survival.foods.indexOf(nearFood); if(idx>=0) survival.foods.splice(idx,1); }
      } else {
        a.x+=svRnd(-1,1)*22*dt; a.y+=svRnd(-1,1)*22*dt;
      }
      a.x=svClamp(a.x,8,752); a.y=svClamp(a.y,8,412);
      if(a.hunger>120 || a.thirst>90 || a.vitality<=0) a.alive=false;
    });

    processRebirth(dt);
  }

  function updateSurvival(dt){
    if(!survival.running || survival.paused) return;
    const p=survival.player;
    survival.time+=dt;
    survival.chapterClock+=dt;
    p.hoursSinceFood+=dt;
    p.hoursSinceWater+=dt;
    p.fullness-=dt*1.8;
    p.strength-=dt*(0.52 + survival.chapter*0.02);

    if(p.hoursSinceFood>96){ p.health-=dt*(0.18 + survival.chapterMod.scarcity*0.04); }
    if(p.hoursSinceWater>48){ p.health-=dt*(0.3 + survival.chapterMod.scarcity*0.05); p.dharma-=dt*0.08; }
    if(p.fullness>85){ p.health-=dt*1.6; p.dharma-=dt*(0.45 + survival.chapterMod.moralPressure*0.2); }
    if(p.hoursSinceFood>=168 || p.hoursSinceWater>=72){ p.health=0; }

    let mx=0,my=0;
    if(survival.keys['arrowup']||survival.keys['w']) my-=1;
    if(survival.keys['arrowdown']||survival.keys['s']) my+=1;
    if(survival.keys['arrowleft']||survival.keys['a']) mx-=1;
    if(survival.keys['arrowright']||survival.keys['d']) mx+=1;
    if(mx!==0||my!==0){
      const len=Math.hypot(mx,my)||1;
      p.x+=mx/len*p.speed*dt;
      p.y+=my/len*p.speed*dt;
      p.x=svClamp(p.x,12,748);
      p.y=svClamp(p.y,12,408);
    }

    survival.hostilePulseAt-=dt;
    if(survival.hostilePulseAt<=0){
      survival.hostilePulseAt=svRnd(2.4,4.3);
      survival.enemies.forEach(e=>{ if(!e.hostile && rand()<0.22+Math.max(0,(70-p.dharma))/220+(survival.chapter-1)*0.005) e.hostile=true; });
    }

    survival.enemies.forEach(e=>{
      const dx=p.x-e.x, dy=p.y-e.y;
      const dist=Math.hypot(dx,dy)||1;
      const chase=e.hostile || (e.faction==='beast' && dist<68) || (e.faction==='raider' && dist<96);
      const dir=chase?1:-0.25;
      e.x+=dx/dist*e.speed*dir*dt;
      e.y+=dy/dist*e.speed*dir*dt;
      e.x=svClamp(e.x,10,750); e.y=svClamp(e.y,10,410);
      e.cooldown=Math.max(0,e.cooldown-dt);
      e.lastHarmToPlayer=Math.max(0,e.lastHarmToPlayer-dt);
      if(dist<18 && e.cooldown<=0){
        p.health-=e.hostile?6:2;
        p.dharma-=e.hostile?0.2:1.2;
        e.lastHarmToPlayer=4;
        if(e.faction!=='pilgrim') e.hostile=true;
        e.cooldown=0.9;
      }
    });

    updateWarriors(dt);

    survival.merchants.forEach(m=>{ m.cooldown=Math.max(0,m.cooldown-dt); });
    survival.shrines.forEach(s=>{ s.cooldown=Math.max(0,s.cooldown-dt); });

    survival.spawnFoodAt-=dt;
    survival.spawnEnemyAt-=dt;
    if(survival.spawnFoodAt<=0){ survival.spawnFoodAt=svRnd(3.8,7.2)*survival.chapterMod.scarcity; if(survival.foods.length<12) spawnFood(); if(survival.waters.length<6 && rand()<0.35) spawnWater(); }
    if(survival.spawnEnemyAt<=0){ survival.spawnEnemyAt=svRnd(5.2,8.2)/Math.max(1,survival.chapterMod.enemyScale*0.75); if(survival.enemies.length<10) spawnEnemy(); }

    p.health=svClamp(p.health,0,100);
    p.fullness=svClamp(p.fullness,0,100);
    p.strength=svClamp(p.strength,0,100);
    p.dharma=svClamp(p.dharma,0,100);

    if(p.health<=0 || p.dharma<=0){
      survival.summary='You fell: sustain your body and act only when dharma requires.';
      stopSurvival();
      return;
    }

    if(survival.chapterClock>=survival.chapterDuration){
      if(survival.chapter>=survival.maxChapters){
        survival.summary=(p.dharma>=60 && survival.peaceActions>=6)?'Victory: All chapters completed in dharmic balance.':p.dharma>=50?'Victory: You completed the chapter journey.':'You endured the chapters, but drifted from dharma.';
        stopSurvival();
        return;
      }
      survival.chapter++;
      survival.awaitingChoice=true;
      survival.paused=true;
      showChapterChoice();
      renderSurvivalHUD();
      return;
    }

    if(p.hoursSinceFood>96) survival.summary='You are deep into fasting. Find food before 7 days pass.';
    if(p.hoursSinceWater>36) survival.summary='Dehydration is rising. Find water before 3 days pass.';
    if(p.fullness>80) survival.summary='Too full. Pause before eating again.';
    if(p.dharma<35) survival.summary='Your dharma is low: avoid unjust strikes.';
    if(survival.peaceActions>=5 && p.dharma>70) survival.summary='Peace path is strong. Continue nonviolent choices.';
    renderSurvivalHUD();
    drawSurvival();
  }

  function survivalLoop(ts){
    if(!survival.running){ cancelAnimationFrame(survival.raf); return; }
    if(!survival.lastTs) survival.lastTs=ts;
    const dt=Math.min(0.05,(ts-survival.lastTs)/1000);
    survival.lastTs=ts;
    updateSurvival(dt);
    survival.raf=requestAnimationFrame(survivalLoop);
  }

  function startSurvival(){
    show('screen-survival');
    resetSurvival();
    updateAmbience('survival');
    survival.raf=requestAnimationFrame(survivalLoop);
  }

  function stopSurvival(){
    survival.running=false;
    survival.paused=true;
    renderSurvivalHUD();
  }

  function exitSurvival(){
    stopSurvival();
    show('screen-start');
  }

  // install & audio
  let deferredPrompt; window.addEventListener('beforeinstallprompt',e=>{ e.preventDefault(); deferredPrompt=e; $('#installBtn').classList.remove('ghost'); }); $('#installBtn').addEventListener('click', async ()=>{ if(!deferredPrompt) return; deferredPrompt.prompt(); const {outcome}= await deferredPrompt.userChoice; deferredPrompt=null; $('#installBtn').classList.add('ghost'); });
  $('#muteBtn').addEventListener('click',()=>{
    audio.muted=!audio.muted;
    $('#muteBtn').textContent= audio.muted?'🔈':'🔊';
    if(audio.ctx && audio.ambience.started){
      const now=audio.ctx.currentTime;
      audio.ambience.gain.gain.linearRampToValueAtTime(audio.muted?0.0001:0.04, now+0.3);
    }
  });

  if('serviceWorker' in navigator){ window.addEventListener('load',()=> navigator.serviceWorker.register('sw.js')); }

  async function init(){
    await ensureAudio();
    ensureAmbience();
    applyThemeByChapter();
    show('screen-demo');
  }

  // Wiring
  $$('#screen-start .path').forEach(btn=> btn.addEventListener('click', async ()=>{ await ensureAudio(); ensureAmbience(); updateAmbience('narrative'); startGame(btn.dataset.path); }));
  $('#startSurvival')?.addEventListener('click', async ()=>{ await ensureAudio(); ensureAmbience(); startSurvival(); });
  $('#resetBtn')?.addEventListener('click', reset);
  $('#svPause')?.addEventListener('click', ()=>{
    if(!survival.running) return;
    if(survival.awaitingChoice) return;
    survival.paused=!survival.paused;
    $('#svPause').textContent=survival.paused?'Resume':'Pause';
    if(!survival.paused) survival.summary='Continue with awareness.';
    renderSurvivalHUD();
  });
  $('#svExit')?.addEventListener('click', exitSurvival);
  $('#demoStartBtn')?.addEventListener('click', async ()=>{
    await ensureAudio();
    ensureAmbience();
    startSurvival();
  });
  $$('#demoLegend .legend-btn').forEach((btn)=>{
    const setTip=()=>{ const t=$('#demoLegendTip'); if(t) t.textContent=`Tip: ${btn.dataset.tip}`; };
    btn.addEventListener('mouseenter', setTip);
    btn.addEventListener('focus', setTip);
    btn.addEventListener('click', setTip);
  });
  $('#actionPhase')?.addEventListener('click',(e)=>{ const btn=e.target.closest('[data-action]'); if(!btn) return; resolveActionChoice(btn.getAttribute('data-action')); });
  $('#nextChapter')?.addEventListener('click', ()=>{ $('#meditationPhase').classList.add('hidden'); krishnaEventIfAny(); });

  document.addEventListener('keydown', (e)=>{
    const k=e.key.toLowerCase();
    survival.keys[k]=true;
    if(survival.running){
      if(k==='e') eatFood();
      if(k==='r') drinkWater();
      if(k==='k') strikeEnemy();
      if(k==='c') craftItem();
      if(k==='t') tradeMerchant();
      if(k==='b') blessShrine();
    }
    if($('#actionPhase') && !$('#actionPhase').classList.contains('hidden')){
      if(k==='a') resolveActionChoice('selfless');
      if(k==='s') resolveActionChoice('skilled');
      if(k==='d') resolveActionChoice('reward');
    }
  });
  document.addEventListener('keyup', (e)=>{ survival.keys[e.key.toLowerCase()]=false; });

  function reset(){ localStorage.removeItem('pow_state'); location.reload(); }

  init();
})();
