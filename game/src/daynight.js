// Last Ferry — the story's time of day: sky, fog, sun, lamps and vehicle headlights.
import * as THREE from '../vendor/three.module.min.js';
import { STREET_LAMPS, rngFor } from './core.js';
import { walkHeightAt } from './world.js';
const T=THREE,M=Math;
// The night look: every pair is [day, night], blended over rampSeconds.
export const DAYNIGHT={rampSeconds:3,maxPointLights:6,
sky:{top:[0x3f7fae,0x061020],mid:[0xcfe4ee,0x1d3350],horizon:[0xf7c98d,0x334f6e],glow:[1,.12]},
cloud:{color:[0xffe9d2,0x27364f],opacity:[.76,.09]},
background:[0x0a1a22,0x050b14],
fog:{color:[0xcdb9a2,0x15283d],near:[100,72],far:[430,360]},
sun:{color:[0xffd2a3,0xa9c0e2],intensity:[2.15,.3]},
hemi:{sky:[0xcfe4ee,0x4f7099],ground:[0x4c4a3a,0x28313c],intensity:[.72,.8]},
fill:{color:[0x8fb6c4,0x6f8fb5],intensity:[.45,.5]},
fillSouth:{color:[0xa8c8d4,0x6a86a8],intensity:[.72,.52]},
ambient:{color:[0x6f8b93,0x4f6a86],intensity:[.34,.68]},
water:{deep:[0x0e4c5c,0x041019],shallow:[0x2f8795,0x0a2030],sky:[0xf0b98a,0x1a2a44],glow:[1,.12]},
lamp:{emissive:[1.4,4.6],pool:.56,light:52},
headlight:{emissive:[1.4,4.2],cone:.62},
stars:.85};
const NIGHT_STAGES=new Set(['canal_run','ferry_escape']);
const clamp01=value=>M.max(0,M.min(1,value));
function makeGlowTexture(){const size=64,canvas=document.createElement('canvas');canvas.width=canvas.height=size;const ctx=canvas.getContext('2d'),gradient=ctx.createRadialGradient(size/2,size/2,0,size/2,size/2,size/2);gradient.addColorStop(0,'rgba(255,255,255,1)');gradient.addColorStop(.28,'rgba(255,236,190,.72)');gradient.addColorStop(.62,'rgba(255,178,86,.22)');gradient.addColorStop(1,'rgba(255,140,40,0)');ctx.fillStyle=gradient;ctx.fillRect(0,0,size,size);const texture=new T.CanvasTexture(canvas);texture.colorSpace=T.SRGBColorSpace;return texture}

/** Blends the harbour between its day palette and the story's night palette over 3 seconds. */
export class DayNight{
constructor({scene,sun,hemi,fill,fillSouth,ambient,sky,water,materials}){
this.scene=scene;this.sun=sun;this.hemi=hemi;this.fill=fill;this.fillSouth=fillSouth;this.ambient=ambient;this.sky=sky;this.water=water;
this.seconds=DAYNIGHT.rampSeconds;this.mode='day';this.phase=0;this.target=0;this._tmp=new T.Color;this._focus={x:0,z:0};this._vehicles=[];this._beams=new Map;this.activeLampCount=0;
this.lampMaterial=materials?.emissiveWarm??null;
this._buildLampPools();this._buildPointLights();this._buildStars();this._buildBeam();this._apply();this._applyLamps();document.body.classList.remove('night')}
_buildLampPools(){this.glowTexture=makeGlowTexture();const texture=this.glowTexture,geometry=new T.PlaneGeometry(14,14);geometry.rotateX(-M.PI/2);
this.poolMaterial=new T.MeshBasicMaterial({map:texture,color:0xffb45a,transparent:true,opacity:0,depthWrite:false,blending:T.AdditiveBlending,fog:true,toneMapped:false});
this.lampPools=new T.Group;this.lampPools.name='street_lamp_pools';for(const[index,[x,z]] of STREET_LAMPS.entries()){const pool=new T.Mesh(geometry,this.poolMaterial);pool.position.set(x+3,walkHeightAt(x+3,z,0)+.03,z);pool.name=`lamp_pool_${index}`;pool.renderOrder=2;this.lampPools.add(pool)}
this.lampPools.visible=false;this.scene.add(this.lampPools)}
_buildPointLights(){this.lampPositions=STREET_LAMPS.map(([x,z])=>({x:x+1.4,y:4.9,z}));this.pointLights=[];for(let i=0;i<DAYNIGHT.maxPointLights;i++){const light=new T.PointLight(0xffb167,0,20,2);light.name=`lamp_light_${i}`;this.scene.add(light);this.pointLights.push(light)}}
_buildStars(){const random=rngFor('salt-harbor-night-stars'),positions=new Float32Array(420*3);for(let i=0;i<420;i++){const angle=random()*M.PI*2,up=.12+random()*.84,horizontal=M.sqrt(1-up*up);positions[i*3]=M.cos(angle)*horizontal*560;positions[i*3+1]=up*560;positions[i*3+2]=M.sin(angle)*horizontal*560}
const geometry=new T.BufferGeometry;geometry.setAttribute('position',new T.BufferAttribute(positions,3));
this.starMaterial=new T.PointsMaterial({color:0xdfe8ff,size:1.7,sizeAttenuation:true,transparent:true,opacity:0,depthWrite:false,fog:false,toneMapped:false});
this.stars=new T.Points(geometry,this.starMaterial);this.stars.name='night_stars';this.stars.frustumCulled=false;this.stars.visible=false;this.scene.add(this.stars)}
_buildBeam(){const geometry=new T.PlaneGeometry(2.8,18);geometry.rotateX(-M.PI/2);this.beamGeometry=geometry;this.beamMaterial=new T.MeshBasicMaterial({map:this.glowTexture,color:0xffe6b8,transparent:true,opacity:0,depthWrite:false,blending:T.AdditiveBlending,side:T.FrontSide,fog:true,toneMapped:false,polygonOffset:true,polygonOffsetFactor:-8,polygonOffsetUnits:-80})}
_lerp(color,pair){return color.setHex(pair[0]).lerp(this._tmp.setHex(pair[1]),this.phase)}
setMode(mode){this.mode=mode==='night'?'night':'day';this.target=this.mode==='night'?1:0}
setStage(stage){const mode=NIGHT_STAGES.has(stage)?'night':'day';if(mode!==this.mode)this.setMode(mode);return this.mode}
snap(mode){this.setMode(mode);this.phase=this.target;this._apply();this._applyLamps();this._applyHeadlights(this._vehicles);document.body.classList.toggle('night',this.phase>.5);return this.phase}
update(dt,focus,vehicles){if(focus)this._focus=focus;if(vehicles)this._vehicles=vehicles;
const direction=this.target>this.phase?1:this.target<this.phase?-1:0;if(direction)this.phase=clamp01(this.phase+direction*dt/this.seconds);if(direction>0&&this.phase>=1-1e-9)this.phase=1;if(direction<0&&this.phase<=1e-9)this.phase=0;
this._apply();this._applyLamps();this._applyHeadlights(this._vehicles);document.body.classList.toggle('night',this.phase>.5)}
_apply(){const p=this.phase,palette=DAYNIGHT,uniforms=this.sky.material.uniforms;
this._lerp(uniforms.topColor.value,palette.sky.top);this._lerp(uniforms.midColor.value,palette.sky.mid);this._lerp(uniforms.horizonColor.value,palette.sky.horizon);
uniforms.glow.value=palette.sky.glow[0]+(palette.sky.glow[1]-palette.sky.glow[0])*p;
this._lerp(this.sky.cloudMaterial.color,palette.cloud.color);this.sky.cloudMaterial.opacity=palette.cloud.opacity[0]+(palette.cloud.opacity[1]-palette.cloud.opacity[0])*p;
this._lerp(this.scene.fog.color,palette.fog.color);this.scene.fog.near=palette.fog.near[0]+(palette.fog.near[1]-palette.fog.near[0])*p;this.scene.fog.far=palette.fog.far[0]+(palette.fog.far[1]-palette.fog.far[0])*p;
this._lerp(this.scene.background,palette.background);this._lerp(this.sun.color,palette.sun.color);this.sun.intensity=palette.sun.intensity[0]+(palette.sun.intensity[1]-palette.sun.intensity[0])*p;
this._lerp(this.hemi.color,palette.hemi.sky);this._lerp(this.hemi.groundColor,palette.hemi.ground);this.hemi.intensity=palette.hemi.intensity[0]+(palette.hemi.intensity[1]-palette.hemi.intensity[0])*p;
this._lerp(this.fill.color,palette.fill.color);this.fill.intensity=palette.fill.intensity[0]+(palette.fill.intensity[1]-palette.fill.intensity[0])*p;
this._lerp(this.fillSouth.color,palette.fillSouth.color);this.fillSouth.intensity=palette.fillSouth.intensity[0]+(palette.fillSouth.intensity[1]-palette.fillSouth.intensity[0])*p;
this._lerp(this.ambient.color,palette.ambient.color);this.ambient.intensity=palette.ambient.intensity[0]+(palette.ambient.intensity[1]-palette.ambient.intensity[0])*p;
const water=this.water.uniforms;this._lerp(water.deep.value,palette.water.deep);this._lerp(water.shallow.value,palette.water.shallow);this._lerp(water.sky.value,palette.water.sky);this._lerp(water.fogColor.value,palette.fog.color);water.glow.value=palette.water.glow[0]+(palette.water.glow[1]-palette.water.glow[0])*p;
if(this.lampMaterial)this.lampMaterial.emissiveIntensity=palette.lamp.emissive[0]+(palette.lamp.emissive[1]-palette.lamp.emissive[0])*p;
this.poolMaterial.opacity=palette.lamp.pool*p;this.lampPools.visible=p>.01;
this.starMaterial.opacity=palette.stars*p;this.stars.visible=p>.01;
this.beamMaterial.opacity=palette.headlight.cone*p}
_applyLamps(){const p=this.phase,focus=this._focus,sorted=this.lampPositions.map(lamp=>({lamp,distance:(lamp.x-focus.x)**2+(lamp.z-focus.z)**2})).sort((a,b)=>a.distance-b.distance);
for(let i=0;i<this.pointLights.length;i++){const light=this.pointLights[i],entry=sorted[i];if(entry){light.position.set(entry.lamp.x,entry.lamp.y,entry.lamp.z);light.intensity=DAYNIGHT.lamp.light*p}else light.intensity=0}
this.activeLampCount=p>.01?M.min(this.pointLights.length,sorted.length):0}
_applyHeadlights(vehicles){const p=this.phase,headlights=DAYNIGHT.headlight;
for(const vehicle of vehicles){if(!vehicle?.root)continue;let beam=this._beams.get(vehicle);if(!beam){beam=new T.Group;beam.name='headlight_beam';for(const side of[-1,1]){const pool=new T.Mesh(this.beamGeometry,this.beamMaterial);pool.position.set(side*((vehicle.width??1.9)/2-.35),.2,(vehicle.length??4.6)/2+9.2);pool.renderOrder=3;beam.add(pool)}beam.visible=false;vehicle.root.add(beam);this._beams.set(vehicle,beam)}
beam.visible=p>.02;
if(vehicle.headlights){vehicle.headlights.visible=p>.05;vehicle.headlights.traverse(node=>{if(node.isMesh&&node.material&&node.material.emissiveIntensity!==undefined)node.material.emissiveIntensity=headlights.emissive[0]+(headlights.emissive[1]-headlights.emissive[0])*p})}
if(vehicle.sirenMaterials&&p>.5)for(const material of vehicle.sirenMaterials)if(material.emissiveIntensity<1.1)material.emissiveIntensity=1.1}}
stats(){return{phase:+this.phase.toFixed(3),mode:this.mode,pointLights:this.pointLights.length,activeLamps:this.activeLampCount,lamps:this.lampPositions.length,headlightBeams:this._beams.size}}
}