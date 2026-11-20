// Last Ferry — harbour constants, deterministic maths, input, saves and the sound director.
export const TITLE='Last Ferry';export const CITY='Salt Harbor';
export const WORLD={bounds:{minX:-200,maxX:196,minZ:-158,maxZ:176},seaLevel:-.9,landY:0,roadY:.16,sidewalkY:.3,paintY:.315,marketY:.12,pierY:.55,bridgeY:2.5,fogNear:60,fogFar:340};
export const NODES={spawn_player_01:{x:-146,z:-78,yaw:1.18,area:'Workshop'},slot_tow_truck_A:{x:98,z:-38,yaw:Math.PI/2,area:'Parking Lot'},pos_guard_harbor:{x:87,z:-36,yaw:-Math.PI/2,area:'Parking Lot'},junction_patrol_entry:{x:147,z:44,yaw:Math.PI,area:'Canal Bend'},lane_ferry_dest:{x:-110,z:101,yaw:Math.PI/2,area:'Ferry Lane'},checkpoint_bridge_01:{x:96,z:86,yaw:Math.PI/2,area:'Bridge'}};
export const POI={workshop:{x:-143,z:-80},shopStreet:{x:-30,z:-70},market:{x:100,z:-92},parkingLot:{x:103,z:-37},canalBend:{x:147,z:30},bridge:{x:96,z:86},waterfront:{x:-20,z:92},terminal:{x:-112,z:96},ferryLane:{x:-110,z:101},westJunction:{x:-172,z:20},alley:{x:64,z:40},pier:{x:-106,z:122},patrolStandby:{x:173,z:41}};
const P=(...rows)=>rows.map(([x,z])=>[x,z]);
const R=(width,sidewalk,twoWay,points,extra={})=>({width,sidewalk,twoWay,points,...extra});
export const ROADS={
shopStreet:R(10,2.4,true,P([-176,-70],[-120,-70],[-60,-70],[0,-70],[62,-69],[88,-67],[104,-60],[112,-52])),
marketLink:R(10,2.4,true,P([112,-52],[126,-46],[138,-32],[145,-12],[147,14],[147,36],[147,54],[150,66],[156,76],[160,82],[160,86],[156,86])),
bridge:R(13,1.5,true,P([156,86],[146,86],[138,86],[122,86],[96,86],[72,86],[58,86],[50,87],[38,90],[28,91]),{bridge:true}),
waterfront:R(11,3,true,P([28,91],[-20,92],[-60,93],[-90,94],[-118,94],[-144,94],[-160,93],[-172,90])),
westRoad:R(10,2.4,true,P([-172,90],[-172,48],[-172,8],[-172,-34],[-172,-62],[-176,-70])),
terminalLoop:R(10,2.6,false,P([-150,94],[-146,100],[-136,103],[-112,104],[-94,102],[-86,98],[-84,94])),
lotDrive:R(8,1.6,false,P([112,-38],[124,-38],[134,-36],[142,-32],[147,-24])),
patrolSide:R(7,1.8,false,P([147,44],[158,42],[170,41],[190,41]))};
export const BRIDGE={z:86,deckX0:58,deckX1:140,westRampX0:40,eastRampX1:156,halfWidth:8.2,rampWidth:8.5};
export const PED_PATHS={
alley:{loop:false,points:P([96,-48],[80,-47],[70,-42],[66,-24],[64,6],[63,34],[63,58],[64,74],[66,84],[66,94],[46,98],[4,99],[-46,99],[-80,98],[-104,95])},
marketWalk:{loop:true,points:P([-150,-60],[-100,-60],[-40,-60],[20,-60],[62,-60],[80,-57],[94,-52],[100,-44],[96,-38],[80,-44],[68,-52],[20,-62.2],[-50,-62.2],[-120,-62.2],[-150,-60])},
terminalWalk:{loop:true,points:P([-148,93],[-138,99],[-118,100],[-98,99],[-86,95],[-112,92],[-140,91],[-148,93])},
innerLane:{loop:true,points:P([-77,-4],[-77,12],[-36,12],[-36,-4],[-77,-4])}};
const RING=[[-158,-70],[-100,-70],[-40,-70],[20,-70],[62,-69],[88,-67],[104,-60],[112,-52],[126,-46],[138,-32],[145,-12],[147,14],[147,36],[147,54],[150,66],[156,76],[160,82],[160,86],[156,86],[146,86],[138,86],[122,86],[96,86],[72,86],[58,86],[50,87],[38,90],[28,91],[-20,92],[-60,93],[-90,94],[-118,94],[-144,94],[-160,93],[-172,90],[-172,48],[-172,8],[-172,-34],[-172,-62],[-166,-68],[-158,-70]];
export const TRAFFIC_LOOPS={harbourLoop:{speed:8.5,points:RING},marketLoop:{speed:7.2,points:RING.slice(7).concat(RING.slice(0,7))}};
export const PATROL_ROUTE=[[172,41],[160,42],[150,44],[147,44],[147,54],[150,66],[156,76],[160,82],[160,86],[156,86],[146,86],[140,86],[120,86],[96,86],[74,86]];
export const CHARACTERS={bagas:{file:'player_bagas.glb',height:1.82,label:'Bagas'},dara:{file:'guard_dara.glb',height:1.74,label:'Dara'},citizen:{file:'npc_citizen.glb',height:1.76,label:'Citizen'},police:{file:'npc_police.glb',height:1.82,label:'Police'},gangster:{file:'enemy_gangster.glb',height:1.84,label:'Dock Thug'}};
export const VEHICLES={tow:{file:'car_tow.glb',length:6.2,width:2.35,height:2.55,label:'Tirta'},police:{file:'car_police.glb',length:4.95,width:1.95,height:1.55,label:'Unit 7',flip:true},civilian:{file:'car_sport.glb',length:4.55,width:1.92,height:1.42,label:'Civilian Car',flip:true},ferry:{file:'ferry.glb',length:36,width:13.7,height:16.2,label:'Ferry'},rifle:{file:'rifle.glb',label:'Rifle'}};
export const WEAPON={clip:'Rifle_Walk',bone:'RightHand',magazine:30,damage:34,range:90};
export const PALETTE={concrete:0xd6cdbb,concreteDark:0x9a9384,coral:0xc9715c,teal:0x4f8d8a,ochre:0xd2a14a,blue:0x2f6fb4,awningBlue:0x2a5fa8,rust:0x8a4a32,roofRust:0x7a4632,roofTile:0xa9543c,roofGrey:0x8b8b82,wood:0x8a6642,glass:0x27464d,asphalt:0x3a3b3c,sidewalk:0xb9b0a0,paint:0xe8e2d0,yellow:0xe4b93a,ferryOrange:0xd96a2b,water:0x2d7488,palm:0x3f7a43,neon:0xffc861};
export const QUALITY={shadowMap:2048,pixelRatioLimit:1.5,drawDistance:320,trafficCars:3,citizens:4};
export const STREET_LAMPS=[[-160,-60],[-100,-63.2],[-40,-63.2],[20,-63.2],[74,-60],[112,-60],[154,8],[154,48],[72,102],[20,100],[-40,100],[-90,88],[-150,86],[-164,20],[-164,-40],[-180,-80]];
export function hashString(text){let h=2166136261;for(let i=0;i<text.length;i++){h^=text.charCodeAt(i);h=Math.imul(h,16777619)}return h>>>0}
export function mulberry32(seed){let s=seed>>>0;return()=>{s=(s+0x6d2b79f5)|0;let t=Math.imul(s^(s>>>15),1|s);t=(t+Math.imul(t^(t>>>7),61|t))^t;return((t^(t>>>14))>>>0)/4294967296}}
export const rngFor=name=>mulberry32(hashString(name));
export const range=(rand,lo,hi)=>lo+(hi-lo)*rand();
export const pick=(rand,list)=>list[Math.min(list.length-1,Math.floor(rand()*list.length))];
export const clamp=(v,lo,hi)=>Math.max(lo,Math.min(hi,v));
export const damp=(v,target,lambda,dt)=>v+(target-v)*(1-Math.exp(-lambda*dt));
export function angleDelta(from,to){let d=(to-from+Math.PI*3)%(Math.PI*2)-Math.PI;return d<-Math.PI?d+Math.PI*2:d}
export const dampAngle=(from,to,lambda,dt)=>from+angleDelta(from,to)*(1-Math.exp(-lambda*dt));
export const distance2D=(ax,az,bx,bz)=>Math.hypot(ax-bx,az-bz);
const SAVE_KEY='lastFerry.save.v1';
export class SaveSystem{
constructor(){this.memory=null}
read(){try{const raw=localStorage.getItem(SAVE_KEY);if(!raw)return null;const data=JSON.parse(raw);return data&&data.version===1?data:null}catch{return this.memory}}
write(state){const data={...state,version:1,savedAt:new Date().toISOString()};this.memory=data;try{localStorage.setItem(SAVE_KEY,JSON.stringify(data));return true}catch{return false}}
clear(){this.memory=null;try{localStorage.removeItem(SAVE_KEY)}catch{}}
summary(){const data=this.read();return data?`$${data.money??0} · ${data.district??'Salt Harbor'}`:''}}
export class Input{
constructor(canvas){this.canvas=canvas;this.down=new Set;this.pressed=new Set;this.mouse={dx:0,dy:0,wheel:0,left:false,right:false,clicked:false};this.locked=false;this.enabled=true;
window.addEventListener('keydown',e=>{if(['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code))e.preventDefault();if(!this.down.has(e.code))this.pressed.add(e.code);this.down.add(e.code)});
window.addEventListener('keyup',e=>this.down.delete(e.code));
window.addEventListener('blur',()=>this.down.clear());
canvas.addEventListener('mousedown',e=>{if(!this.enabled)return;if(!this.locked)this.requestLock();if(e.button===0){this.mouse.left=true;this.mouse.clicked=true}if(e.button===2)this.mouse.right=true});
canvas.addEventListener('mouseup',e=>{if(e.button===0)this.mouse.left=false;if(e.button===2)this.mouse.right=false});
canvas.addEventListener('contextmenu',e=>e.preventDefault());
window.addEventListener('mousemove',e=>{if(!this.locked&&!this.mouse.right)return;this.mouse.dx+=e.movementX;this.mouse.dy+=e.movementY});
window.addEventListener('wheel',e=>{if(this.locked)this.mouse.wheel+=Math.sign(e.deltaY)},{passive:true});
document.addEventListener('pointerlockchange',()=>{this.locked=document.pointerLockElement===this.canvas;if(!this.locked){this.down.clear();this.mouse.left=false;this.mouse.right=false}})}
requestLock(){if(this.locked)return;try{const pending=this.canvas.requestPointerLock?.();if(pending?.catch)pending.catch(()=>{})}catch{}}
release(){if(this.locked)document.exitPointerLock?.()}
isDown(code){return this.down.has(code)}
consume(code){if(!this.pressed.has(code))return false;this.pressed.delete(code);return true}
consumeClick(){if(!this.mouse.clicked)return false;this.mouse.clicked=false;return true}
takeLook(){const dx=this.mouse.dx,dy=this.mouse.dy;this.mouse.dx=0;this.mouse.dy=0;return{dx,dy}}
endFrame(){this.pressed.clear();this.mouse.dx=0;this.mouse.dy=0;this.mouse.wheel=0;this.mouse.clicked=false}}
export const SIREN={cycle:3.2,low:480,lowSweep:180,high:650,highSweep:250,limit:.12,cutoff:2200,range:90};
export const sirenGainAt=distance=>{const d=Math.max(0,distance);return d>=SIREN.range?0:Math.max(0,1-d/SIREN.range)};
export function buildSirenSamples(rate=48000,cycle=SIREN.cycle){const length=Math.round(rate*cycle),tau=Math.PI*2,tone=(base,sweep)=>{let phase=0;const out=new Float32Array(length);for(let i=0;i<length;i++){const u=i/length;phase+=tau*(base+sweep*(.5-.5*Math.cos(tau*u)))/rate;out[i]=Math.sin(phase)*.5}return out},low=tone(SIREN.low,SIREN.lowSweep),high=tone(SIREN.high,SIREN.highSweep),data=new Float32Array(length);for(let i=0;i<length;i++)data[i]=low[i]+high[i];return data}
export class AudioDirector{
constructor(){this.ctx=null;this.started=false;this.eng=null;this.siren=null;this.sg=null;this.ci=0}
start(){if(this.started){this.ctx?.resume();return}const Ctx=window.AudioContext||window.webkitAudioContext;if(!Ctx)return;this.ctx=new Ctx;this.out=this.ctx.createGain();this.out.gain.value=.55;this.out.connect(this.ctx.destination);this.started=true;this.ambience();this.music()}
ambience(){const ctx=this.ctx,buf=ctx.createBuffer(1,ctx.sampleRate*3,ctx.sampleRate),samples=buf.getChannelData(0);let last=0;for(let i=0;i<samples.length;i++){last=(last+.02*(Math.random()*2-1))/1.02;samples[i]=last*3.5}const src=ctx.createBufferSource();src.buffer=buf;src.loop=true;const lp=ctx.createBiquadFilter();lp.type='lowpass';lp.frequency.value=620;const gain=ctx.createGain();gain.gain.value=.055;const lfo=ctx.createOscillator();lfo.frequency.value=.18;const lg=ctx.createGain();lg.gain.value=.022;lfo.connect(lg).connect(gain.gain);src.connect(lp).connect(gain).connect(this.out);src.start();lfo.start();setInterval(()=>this.gull(),9000)}
gull(){if(this.ctx?.state!=='running')return;const ctx=this.ctx,now=ctx.currentTime,osc=ctx.createOscillator(),gain=ctx.createGain();osc.type='sine';osc.frequency.setValueAtTime(1400,now);osc.frequency.exponentialRampToValueAtTime(720,now+.24);gain.gain.setValueAtTime(.0001,now);gain.gain.exponentialRampToValueAtTime(.02,now+.03);gain.gain.exponentialRampToValueAtTime(.0001,now+.3);osc.connect(gain).connect(this.out);osc.start(now);osc.stop(now+.34)}
music(){const chords=[[110,164.81,196],[98,146.83,174.61],[87.31,130.81,164.81],[98,146.83,220]],play=()=>{if(this.ctx?.state!=='running')return;const ctx=this.ctx,now=ctx.currentTime,chord=chords[this.ci++%chords.length];for(const freq of chord){const osc=ctx.createOscillator(),gain=ctx.createGain(),flt=ctx.createBiquadFilter();flt.type='lowpass';flt.frequency.value=700;osc.type='triangle';osc.frequency.value=freq;gain.gain.setValueAtTime(.0001,now);gain.gain.exponentialRampToValueAtTime(.018,now+1.6);gain.gain.exponentialRampToValueAtTime(.0001,now+7.5);osc.connect(flt).connect(gain).connect(this.out);osc.start(now);osc.stop(now+7.8)}};play();setInterval(play,7600)}
setEngine(active,ratio=0){if(!this.ctx)return;if(!this.eng){const ctx=this.ctx,low=ctx.createOscillator(),high=ctx.createOscillator(),flt=ctx.createBiquadFilter(),gain=ctx.createGain();low.type='sawtooth';high.type='square';low.frequency.value=55;high.frequency.value=82;flt.type='lowpass';flt.frequency.value=240;gain.gain.value=0;low.connect(flt);high.connect(flt);flt.connect(gain).connect(this.out);low.start();high.start();this.eng={osc:low,osc2:high,flt,gain}}const now=this.ctx.currentTime,e=this.eng;e.osc.frequency.setTargetAtTime(48+ratio*52,now,.12);e.osc2.frequency.setTargetAtTime(74+ratio*70,now,.12);e.flt.frequency.setTargetAtTime(220+ratio*420,now,.15);e.gain.gain.setTargetAtTime(active?.035+ratio*.03:0,now,.15)}
setSiren(active,vol=SIREN.limit){if(!this.ctx)return;if(!this.siren){const ctx=this.ctx,rate=ctx.sampleRate,length=Math.round(rate*SIREN.cycle),buffer=ctx.createBuffer(1,length,rate);buffer.getChannelData(0).set(buildSirenSamples(rate));const src=ctx.createBufferSource(),flt=ctx.createBiquadFilter(),gain=ctx.createGain();src.buffer=buffer;src.loop=true;flt.type='lowpass';flt.frequency.value=SIREN.cutoff;flt.Q.value=.7;gain.gain.value=0;src.connect(flt).connect(gain).connect(this.out);src.start();this.siren=src;this.sg=gain;this.sirenFilter=flt}const now=this.ctx.currentTime;this.sg.gain.setTargetAtTime(active?Math.min(SIREN.limit,Math.max(0,vol)):0,now,.08)}
gunshot(vol=.5,attenuation=1){if(this.ctx?.state!=='running')return;const ctx=this.ctx,now=ctx.currentTime,buf=ctx.createBuffer(1,ctx.sampleRate*.18,ctx.sampleRate),samples=buf.getChannelData(0);for(let i=0;i<samples.length;i++)samples[i]=(Math.random()*2-1)*Math.pow(1-i/samples.length,4);const src=ctx.createBufferSource();src.buffer=buf;const flt=ctx.createBiquadFilter();flt.type='lowpass';flt.frequency.value=1800;const gain=ctx.createGain();gain.gain.value=vol*attenuation;src.connect(flt).connect(gain).connect(this.out);src.start(now)}
radioChatter(){if(this.ctx?.state!=='running')return;const ctx=this.ctx,now=ctx.currentTime;for(let i=0;i<5;i++){const osc=ctx.createOscillator(),gain=ctx.createGain();osc.type='square';osc.frequency.value=1000+Math.random()*900;const at=now+i*.09;gain.gain.setValueAtTime(.0001,at);gain.gain.exponentialRampToValueAtTime(.018,at+.01);gain.gain.exponentialRampToValueAtTime(.0001,at+.07);osc.connect(gain).connect(this.out);osc.start(at);osc.stop(at+.08)}}
success(){if(this.ctx?.state!=='running')return;const ctx=this.ctx,now=ctx.currentTime;[392,493.88,587.33,783.99].forEach((freq,i)=>{const osc=ctx.createOscillator(),gain=ctx.createGain();osc.type='triangle';osc.frequency.value=freq;const at=now+i*.14;gain.gain.setValueAtTime(.0001,at);gain.gain.exponentialRampToValueAtTime(.05,at+.02);gain.gain.exponentialRampToValueAtTime(.0001,at+1.2);osc.connect(gain).connect(this.out);osc.start(at);osc.stop(at+1.3)})}
thugDown(){this.gunshot(.16,.6)}
ui(){if(this.ctx?.state!=='running')return;const ctx=this.ctx,now=ctx.currentTime,osc=ctx.createOscillator(),gain=ctx.createGain();osc.type='sine';osc.frequency.value=660;gain.gain.setValueAtTime(.0001,now);gain.gain.exponentialRampToValueAtTime(.02,now+.01);gain.gain.exponentialRampToValueAtTime(.0001,now+.12);osc.connect(gain).connect(this.out);osc.start(now);osc.stop(now+.13)}
wantedSting(level=1,rising=true){if(this.ctx?.state!=='running')return;const ctx=this.ctx,now=ctx.currentTime,base=rising?330+level*55:440-level*30,notes=rising?[base,base*1.5]:[base,base*.72];notes.forEach((freq,i)=>{const osc=ctx.createOscillator(),gain=ctx.createGain();osc.type='square';osc.frequency.value=freq;const at=now+i*.11;gain.gain.setValueAtTime(.0001,at);gain.gain.exponentialRampToValueAtTime(.022,at+.012);gain.gain.exponentialRampToValueAtTime(.0001,at+.16);osc.connect(gain).connect(this.out);osc.start(at);osc.stop(at+.18)})}}