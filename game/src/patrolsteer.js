// Last Ferry — patrol path steering: forward-only tangent orientation, bounded yaw and speed.
import { angleDelta } from './core.js';
const M=Math;
export function orientPatrol(patrol,path,s,player){const point=path.sample(s);patrol.yaw=point.yaw;patrol.applyTransform();return 1}
export function steerPatrol(patrol,path,s,target,dir,speed,dt){let delta=target-s;if(delta<0)delta+=path.length;const want=delta>1.2?speed:0,acc=9*dt,current=patrol.speed??0,next=current+M.max(-acc,M.min(acc,want-current)),step=M.min(delta,next*dt),point=path.sample(s+step),turn=angleDelta(patrol.yaw,point.yaw),rate=1.4*dt;patrol.yaw+=M.max(-rate,M.min(rate,turn));return{s:((s+step)%path.length+path.length)%path.length,dir:1,speed:next}}