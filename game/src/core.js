// Last Ferry — foundations: constants, random, save, input, procedural audio.
export const TITLE='Last Ferry',CITY='Salt Harbor';
export const WORLD={bounds:{minX:-200,maxX:196,minZ:-158,maxZ:176},seaLevel:-0.9,landY:0,roadY:0.16,sidewalkY:0.3,paintY:0.315,marketY:0.12,pierY:0.55,bridgeY:2.5,fogNear:60,fogFar:340};
export const NODES={spawn_player_01:{x:-146,z:-78,yaw:1.18,area:'Workshop'},slot_tow_truck_A:{x:98,z:-38,yaw:Math.PI/2,area:'Parking Lot'},pos_guard_harbor:{x:87,z:-36,yaw:-Math.PI/2,area:'Parking Lot'},junction_patrol_entry:{x:147,z:44,yaw:Math.PI,area:'Canal Bend'},lane_ferry_dest:{x:-110,z:101,yaw:Math.PI/2,area:'Ferry Lane'},checkpoint_bridge_01:{x:96,z:86,yaw:Math.PI/2,area:'Bridge'}};
export const POI={workshop:{x:-143,z:-80},shopStreet:{x:-30,z:-70},market:{x:100,z:-92},parkingLot:{x:103,z:-37},canalBend:{x:147,z:30},bridge:{x:96,z:86},waterfront:{x:-20,z:92},terminal:{x:-130,z:80},ferryLane:{x:-110,z:101},westJunction:{x:-172,z:20},alley:{x:64,z:40},pier:{x:-106,z:122},patrolStandby:{x:173,z:41}};
const P=a=>a.map(([x,z])=>[x,z]);
export const ROADS={
shopStreet:{width:10,sidewalk:2.4,twoWay:true,points:[[-176,-70],[-120,-70],[-60,-70],[0,-70],[62,-69],[88,-67],[104,-60],[112,-52]]},
marketLink:{width:10,sidewalk:2.4,twoWay:true,points:[[112,-52],[126,-46],[138,-32],[145,-12],[147,14],[147,36],[147,54],[150,66],[156,76],[160,82],[160,86],[156,86]]},
bridge:{width:13,sidewalk:1.5,twoWay:true,bridge:true,points:[[156,86],[146,86],[138,86],[122,86],[96,86],[72,86],[58,86],[50,87],[38,90],[28,91]]},
waterfront:{width:11,sidewalk:3,twoWay:true,points:[[28,91],[-20,92],[-60,93],[-90,94],[-118,94],[-144,94],[-160,93],[-172,90]]},
westRoad:{width:10,sidewalk:2.4,twoWay:true,points:[[-172,90],[-172,48],[-172,8],[-172,-34],[-172,-62],[-176,-70]]},
terminalLoop:{width:10,sidewalk:2.6,twoWay:false,points:[[-150,94],[-146,100],[-136,103],[-112,104],[-94,102],[-86,98],[-84,94]]},
lotDrive:{width:8,sidewalk:1.6,twoWay:false,points:[[112,-38],[124,-38],[134,-36],[142,-32],[147,-24]]},
patrolSide:{width:7,sidewalk:1.8,twoWay:false,points:[[147,44],[158,42],[170,41],[190,41]]}};
export const BRIDGE={z:86,deckX0:58,deckX1:140,westRampX0:40,eastRampX1:156,halfWidth:8.2,rampWidth:8.5};
export const PED_PATHS={
alley:{loop:false,points:[[96,-48],[80,-47],[70,-42],[66,-24],[64,6],[63,34],[63,58],[64,74],[66,84],[66,94],[46,98],[4,99],[-46,99],[-80,98],[-104,95]]},
marketWalk:{loop:true,points:[[-150,-60],[-100,-60],[-40,-60],[20,-60],[62,-60],[80,-57],[94,-52],[100,-44],[96,-38],[80,-44],[68,-52],[20,-58],[-50,-58],[-120,-58],[-150,-60]]},
terminalWalk:{loop:true,points:[[-148,93],[-138,99],[-118,100],[-98,99],[-86,95],[-112,92],[-140,91],[-148,93]]},
innerLane:{loop:true,points:[[-77,-36],[-77,44],[-36,44],[-36,-36],[-77,-36]]}};
const HL=[[-158,-70],[-100,-70],[-40,-70],[20,-70],[62,-69],[88,-67],[104,-60],[112,-52],[126,-46],[138,-32],[145,-12],[147,14],[147,36],[147,54],[150,66],[156,76],[160,82],[160,86],[156,86],[146,86],[138,86],[122,86],[96,86],[72,86],[58,86],[50,87],[38,90],[28,91],[-20,92],[-60,93],[-90,94],[-118,94],[-144,94],[-160,93],[-172,90],[-172,48],[-172,8],[-172,-34],[-172,-62],[-166,-68],[-158,-70]];
export const TRAFFIC_LOOPS={harbourLoop:{speed:8.5,points:HL},marketLoop:{speed:7.2,points:HL.slice(7).concat(HL.slice(0,7))}};
export const PATROL_ROUTE=[[172,41],[160,42],[150,44],[147,44],[147,54],[150,66],[156,76],[160,82],[160,86],[156,86],[146,86],[140,86],[120,86],[96,86],[74,86]];
export const CHARACTERS={bagas:{file:'player_bagas.glb',height:1.82,label:'Bagas'},dara:{file:'guard_dara.glb',height:1.74,label:'Dara'},citizen:{file:'npc_citizen.glb',height:1.76,label:'Citizen'},police:{file:'npc_police.glb',height:1.82,label:'Police'},gangster:{file:'enemy_gangster.glb',height:1.84,label:'Dock Thug'}};
export const VEHICLES={tow:{file:'car_tow.glb',length:6.2,width:2.35,height:2.55,label:'Tirta'},police:{file:'car_police.glb',length:4.95,width:1.95,height:1.55,label:'Unit 7',flip:true},civilian:{file:'car_sport.glb',length:4.55,width:1.92,height:1.42,label:'Civilian Car',flip:true},ferry:{file:'ferry.glb',length:36,width:13.7,height:16.2,label:'Ferry'},rifle:{file:'rifle.glb',label:'Rifle'}};
export const WEAPON={clip:'Rifle_Walk',bone:'RightHand',magazine:30,damage:34,range:90};
export const PALETTE={concrete:0xd6cdbb,concreteDark:0x9a9384,coral:0xc9715c,teal:0x4f8d8a,ochre:0xd2a14a,blue:0x2f6fb4,awningBlue:0x2a5fa8,rust:0x8a4a32,roofRust:0x7a4632,roofTile:0xa9543c,roofGrey:0x8b8b82,wood:0x8a6642,glass:0x27464d,asphalt:0x3a3b3c,sidewalk:0xb9b0a0,paint:0xe8e2d0,yellow:0xe4b93a,ferryOrange:0xd96a2b,water:0x2d7488,palm:0x3f7a43,neon:0xffc861};
export const QUALITY={shadowMap:2048,pixelRatioLimit:1.5,drawDistance:320,trafficCars:3,citizens:4};
export function hashString(t){let h=2166136261>>>0;for(let i=0;i<t.length;i++){h^=t.charCodeAt(i);h=Math.imul(h,16777619)}return h>>>0}
export function mulberry32(s){let a=s>>>0;return()=>{a=(a+0x6d2b79f5)|0;let t=Math.imul(a^(a>>>15),1|a);t=(t+Math.imul(t^(t>>>7),61|t))^t;return((t^(t>>>14))>>>0)/4294967296}}
export const rngFor=n=>mulberry32(hashString(n)),range=(r,a,b)=>a+(b-a)*r(),pick=(r,l)=>l[Math.min(l.length-1,Math.floor(r()*l.length))],clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),damp=(c,t,l,d)=>c+(t-c)*(1-Math.exp(-l*d));
export function angleDelta(a,b){let d=(b-a+Math.PI*3)%(Math.PI*2)-Math.PI;return d<-Math.PI?d+Math.PI*2:d}
export const dampAngle=(a,b,l,d)=>a+angleDelta(a,b)*(1-Math.exp(-l*d)),distance2D=(ax,az,bx,bz)=>Math.hypot(ax-bx,az-bz);
const SAVE_KEY='lastFerry.save.v1';
export class SaveSystem{
constructor(){this.memory=null}
read(){try{const t=localStorage.getItem(SAVE_KEY);if(!t)return null;const d=JSON.parse(t);return d&&d.version===1?d:null}catch{return this.memory}}
write(s){const d={...s,version:1,savedAt:new Date().toISOString()};this.memory=d;try{localStorage.setItem(SAVE_KEY,JSON.stringify(d));return true}catch{return false}}
clear(){this.memory=null;try{localStorage.removeItem(SAVE_KEY)}catch{}}
summary(){const d=this.read();return d?`$${d.money??0} · ${d.district??'Salt Harbor'}`:''}}
export class Input{
constructor(canvas){this.canvas=canvas;this.down=new Set;this.pressed=new Set;this.mouse={dx:0,dy:0,wheel:0,left:false,right:false,clicked:false};this.locked=false;this.enabled=true;
window.addEventListener('keydown',e=>{if(['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code))e.preventDefault();if(!this.down.has(e.code))this.pressed.add(e.code);this.down.add(e.code)});
window.addEventListener('keyup',e=>this.down.delete(e.code));
window.addEventListener('blur',()=>this.down.clear());
canvas.addEventListener('mousedown',e=>{if(!this.enabled)return;if(!this.locked){this.requestLock();return}if(e.button===0){this.mouse.left=true;this.mouse.clicked=true}if(e.button===2)this.mouse.right=true});
canvas.addEventListener('mouseup',e=>{if(e.button===0)this.mouse.left=false;if(e.button===2)this.mouse.right=false});
canvas.addEventListener('contextmenu',e=>e.preventDefault());
window.addEventListener('mousemove',e=>{if(!this.locked)return;this.mouse.dx+=e.movementX;this.mouse.dy+=e.movementY});
window.addEventListener('wheel',e=>{if(this.locked)this.mouse.wheel+=Math.sign(e.deltaY)},{passive:true});
document.addEventListener('pointerlockchange',()=>{this.locked=document.pointerLockElement===this.canvas;if(!this.locked){this.down.clear();this.mouse.left=false;this.mouse.right=false}})}
requestLock(){if(this.locked)return;try{const r=this.canvas.requestPointerLock?.();if(r?.catch)r.catch(()=>{})}catch{}}
release(){if(this.locked)document.exitPointerLock?.()}
isDown(c){return this.down.has(c)}
consume(c){if(!this.pressed.has(c))return false;this.pressed.delete(c);return true}
consumeClick(){if(!this.mouse.clicked)return false;this.mouse.clicked=false;return true}
takeLook(){const d=this.mouse.dx,y=this.mouse.dy;this.mouse.dx=0;this.mouse.dy=0;return{dx:d,dy:y}}
endFrame(){this.pressed.clear();this.mouse.dx=0;this.mouse.dy=0;this.mouse.wheel=0;this.mouse.clicked=false}}
export class AudioDirector{
constructor(){this.ctx=null;this.started=false;this.engine=null;this.siren=null;this.sirenGain=null;this.chordIndex=0}
start(){if(this.started){this.ctx?.resume();return}const C=window.AudioContext||window.webkitAudioContext;if(!C)return;this.ctx=new C;this.master=this.ctx.createGain();this.master.gain.value=.55;this.master.connect(this.ctx.destination);this.started=true;this.ambience();this.music()}
ambience(){const c=this.ctx,buf=c.createBuffer(1,c.sampleRate*3,c.sampleRate),d=buf.getChannelData(0);let l=0;for(let i=0;i<d.length;i++){l=(l+.02*(Math.random()*2-1))/1.02;d[i]=l*3.5}const src=c.createBufferSource();src.buffer=buf;src.loop=true;const f=c.createBiquadFilter();f.type='lowpass';f.frequency.value=620;const g=c.createGain();g.gain.value=.055;const lfo=c.createOscillator();lfo.frequency.value=.18;const lg=c.createGain();lg.gain.value=.022;lfo.connect(lg).connect(g.gain);src.connect(f).connect(g).connect(this.master);src.start();lfo.start();setInterval(()=>this.gull(),9000)}
gull(){if(this.ctx?.state!=='running')return;const c=this.ctx,n=c.currentTime,o=c.createOscillator(),g=c.createGain();o.type='sine';o.frequency.setValueAtTime(1400,n);o.frequency.exponentialRampToValueAtTime(720,n+.24);g.gain.setValueAtTime(.0001,n);g.gain.exponentialRampToValueAtTime(.02,n+.03);g.gain.exponentialRampToValueAtTime(.0001,n+.3);o.connect(g).connect(this.master);o.start(n);o.stop(n+.34)}
music(){const ch=[[110,164.81,196],[98,146.83,174.61],[87.31,130.81,164.81],[98,146.83,220]],play=()=>{if(this.ctx?.state!=='running')return;const c=this.ctx,n=c.currentTime,chord=ch[this.chordIndex++%ch.length];for(const f of chord){const o=c.createOscillator(),g=c.createGain(),fl=c.createBiquadFilter();fl.type='lowpass';fl.frequency.value=700;o.type='triangle';o.frequency.value=f;g.gain.setValueAtTime(.0001,n);g.gain.exponentialRampToValueAtTime(.018,n+1.6);g.gain.exponentialRampToValueAtTime(.0001,n+7.5);o.connect(fl).connect(g).connect(this.master);o.start(n);o.stop(n+7.8)}};play();setInterval(play,7600)}
setEngine(active,ratio=0){if(!this.ctx)return;if(!this.engine){const c=this.ctx,o=c.createOscillator(),o2=c.createOscillator(),f=c.createBiquadFilter(),g=c.createGain();o.type='sawtooth';o2.type='square';o.frequency.value=55;o2.frequency.value=82;f.type='lowpass';f.frequency.value=240;g.gain.value=0;o.connect(f);o2.connect(f);f.connect(g).connect(this.master);o.start();o2.start();this.engine={osc:o,osc2:o2,filter:f,gain:g}}const n=this.ctx.currentTime,e=this.engine;e.osc.frequency.setTargetAtTime(48+ratio*52,n,.12);e.osc2.frequency.setTargetAtTime(74+ratio*70,n,.12);e.filter.frequency.setTargetAtTime(220+ratio*420,n,.15);e.gain.gain.setTargetAtTime(active?.035+ratio*.03:0,n,.15)}
setSiren(active,vol=.4){if(!this.ctx)return;if(!this.siren){const c=this.ctx,o=c.createOscillator(),g=c.createGain(),lfo=c.createOscillator(),lg=c.createGain();o.type='sine';o.frequency.value=760;lfo.type='sine';lfo.frequency.value=.55;lg.gain.value=180;g.gain.value=0;lfo.connect(lg).connect(o.frequency);o.connect(g).connect(this.master);o.start();lfo.start();this.siren=o;this.sirenGain=g}this.sirenGain.gain.setTargetAtTime(active?vol*.07:0,this.ctx.currentTime,.25)}
gunshot(vol=.5,dist=1){if(this.ctx?.state!=='running')return;const c=this.ctx,n=c.currentTime,buf=c.createBuffer(1,c.sampleRate*.18,c.sampleRate),d=buf.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=(Math.random()*2-1)*Math.pow(1-i/d.length,4);const src=c.createBufferSource();src.buffer=buf;const f=c.createBiquadFilter();f.type='lowpass';f.frequency.value=1800;const g=c.createGain();g.gain.value=vol*dist;src.connect(f).connect(g).connect(this.master);src.start(n)}
radioChatter(){if(this.ctx?.state!=='running')return;const c=this.ctx,n=c.currentTime;for(let i=0;i<5;i++){const o=c.createOscillator(),g=c.createGain();o.type='square';o.frequency.value=1000+Math.random()*900;const at=n+i*.09;g.gain.setValueAtTime(.0001,at);g.gain.exponentialRampToValueAtTime(.018,at+.01);g.gain.exponentialRampToValueAtTime(.0001,at+.07);o.connect(g).connect(this.master);o.start(at);o.stop(at+.08)}}
success(){if(this.ctx?.state!=='running')return;const c=this.ctx,n=c.currentTime;[392,493.88,587.33,783.99].forEach((f,i)=>{const o=c.createOscillator(),g=c.createGain();o.type='triangle';o.frequency.value=f;const at=n+i*.14;g.gain.setValueAtTime(.0001,at);g.gain.exponentialRampToValueAtTime(.05,at+.02);g.gain.exponentialRampToValueAtTime(.0001,at+1.2);o.connect(g).connect(this.master);o.start(at);o.stop(at+1.3)})}
thugDown(){this.gunshot(.16,.6)}
ui(){if(this.ctx?.state!=='running')return;const c=this.ctx,n=c.currentTime,o=c.createOscillator(),g=c.createGain();o.type='sine';o.frequency.value=660;g.gain.setValueAtTime(.0001,n);g.gain.exponentialRampToValueAtTime(.02,n+.01);g.gain.exponentialRampToValueAtTime(.0001,n+.12);o.connect(g).connect(this.master);o.start(n);o.stop(n+.13)}}