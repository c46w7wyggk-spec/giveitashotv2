import * as F from '../src/engine.js';
import * as S from '../supabase/functions/submit-score/engine.js';
const D=new F.Engine().data(); let n=0;
for (const role of D.TITLES.map(t=>t.id)) for (let s=1;s<=80;s++){
  const eng=new F.Engine(); const seed=s*104729+3; const g=F.begin(eng,seed,role); let log='',k=0,r=s*17+5;
  const rnd=()=>{r=(r*1103515245+12345)&0x7fffffff;return r/0x7fffffff};
  while(g.phase!=='end'&&k++<300){let a;
    if(g.phase==='desk')a=g.memos.length?(rnd()<0.5?'s':'v'):'q';
    else if(g.phase==='incident'){const c=g.inc[0];a=String(Math.floor(rnd()*(c.k==='event'?D.EV[c.id].opts.length:4)));}
    else a='n'; F.applyAction(eng,g,a); log+=a;}
  const a=F.runLog(seed,role,log), b=S.runLog(seed,role,log);
  if(a.sc.score!==b.sc.score||a.cons!==b.cons||a.lib!==b.lib||a.needle!==b.needle) throw new Error('slim mismatch '+role+s);
  n++;
}
console.log('slim == full on',n,'games');
