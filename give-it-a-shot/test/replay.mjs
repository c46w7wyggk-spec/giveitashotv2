import {Engine,runLog,dailySeed,begin,applyAction} from '../src/engine.js';
const D=new Engine().data(); const roles=D.TITLES.map(t=>t.id); console.log(roles.join(','), dailySeed('2026-10-05'));
let games=0;
for (const role of roles) for (let s=1;s<=60;s++){
  const eng=new Engine(); const seed=s*7919; const g=begin(eng,seed,role); let log='',n=0, r=s*31+1;
  const rnd=()=>{r=(r*1103515245+12345)&0x7fffffff;return r/0x7fffffff};
  while(g.phase!=='end'&&n++<300){
    let a;
    if(g.phase==='desk') a=g.memos.length?(rnd()<0.5?'s':'v'):'q';
    else if(g.phase==='incident'){const c=g.inc[0];const k=c.k==='event'?D.EV[c.id].opts.length:4;a=String(Math.floor(rnd()*k));}
    else a='n';
    applyAction(eng,g,a); log+=a;
  }
  const res=runLog(seed,role,log); const sc=eng.scoreCard(g);
  if(res.sc.score!==sc.score||res.needle!==Math.round(sc.nd)) throw new Error('mismatch '+role+' '+s);
  games++;
}
// tamper checks
const bad=(f)=>{try{f();return false}catch(e){return true}};
console.log('rejects garbage:', bad(()=>runLog(1,'President','sssss')), bad(()=>runLog(1,'nope','s')), bad(()=>runLog(1,roles[0],'x')));
console.log('replayed',games,'games OK');
