/* MPR engine: pure functions (no Firebase / DOM). Uses Core (core.js) for parsing. */
const MPR=(()=>{
const CLS=['दावे','प्रार्थना पत्र','इजराय'],STD={'दावे':40,'प्रार्थना पत्र':60,'इजराय':0};
const HM=['जनवरी','फरवरी','मार्च','अप्रैल','मई','जून','जुलाई','अगस्त','सितम्बर','अक्टूबर','नवम्बर','दिसम्बर'];
const EM=['January','February','March','April','May','June','July','August','September','October','November','December'];
const pad=n=>String(n).padStart(2,'0');
const ym=(y,m)=>y+'-'+pad(m);
const lastDay=(y,m)=>new Date(y,m,0).getDate();
/* completed months between two ISO dates (same as Excel DATEDIF "m") */
function dm(a,b){const[y1,m1,d1]=a.split('-').map(Number),[y2,m2,d2]=b.split('-').map(Number);let m=(y2-y1)*12+(m2-m1);if(d2<d1)m--;return m}
const bP=m=>m<6?0:m<12?1:m<24?2:m<36?3:m<60?4:m<120?5:6;      /* pending ageing: 6 buckets+10y */
const bD=m=>m>=60?'GT5':m>=36?'3-5':m>=24?'2-3':m>=12?'1-2':'LT1';
const inst=x=>x.ir||x.ig||'';
function compute(o){
  /* o: pend(rows), disp(rows), hist(Map), ex(Set), y, m, opening{cls:n}, group, ageDate(optional) */
  const start=o.y+'-'+pad(o.m)+'-01',end=o.y+'-'+pad(o.m)+'-'+pad(lastDay(o.y,o.m)),age=o.ageDate||end;
  const kept=Core.ingest(o.hist,o.pend,o.ex);
  const dnums=new Set(o.disp.map(r=>r.no));
  const dres=Core.applyDisposal(o.disp,o.hist,o.ex,new Set(kept.flatMap(x=>[x.n,x.g,x.r].filter(Boolean))));
  const pending=kept.filter(x=>![x.n,x.g,x.r].some(k=>k&&dnums.has(k)));
  const clashed=kept.length-pending.length;
  const dis=dres.disposed.filter(x=>x.dd>=start&&x.dd<=end);
  const R={};CLS.forEach(c=>R[c]={C:o.opening[c]||0,gr:{'एक पक्षीय':0,'बहु पक्षीय':0,'स्था0':0},L:0,M:0,age:[0,0,0,0,0,0,0]});
  const miss=[];
  for(const x of dis){const r=R[x.k];r.gr[o.group]++;const i=inst(x);
    if(!i){miss.push(x);continue}if(dm(i,x.dd)>=60)r.M++}
  const years={};
  for(const x of pending){const r=R[x.k];r.L++;const i=inst(x);if(i){r.age[bP(dm(i,age))]++;const y=i.slice(0,4);years[y]=(years[y]||0)+1}else years['?']=(years['?']||0)+1}
  CLS.forEach(c=>{const r=R[c];r.I=r.gr['एक पक्षीय']+r.gr['बहु पक्षीय']+r.gr['स्था0'];r.D=r.L+r.I-r.C;r.E=r.C+r.D;r.J=STD[c];r.K=r.J?r.I/r.J:0});
  /* english statement: disposal ageing */
  const dAge={GT5:0,'3-5':0,'2-3':0,'1-2':0,LT1:0};for(const x of dis){const i=inst(x);if(i)dAge[bD(dm(i,x.dd))]++}
  /* hearing counts */
  const hc={};for(const x of pending)if(x.hd)hc[x.hd]=(hc[x.hd]||0)+1;
  return{start,end,age,pending,dis,R,years,dAge,hc,miss,clashed,excluded:o.pend.length-kept.length,nf:dres.nf,keptN:kept.length,hist:o.hist}}
const tot=(R,f)=>CLS.reduce((s,c)=>s+(typeof f==='function'?f(R[c]):R[c][f]),0);
/* ---------- grid builders: {rows:[[cell]],widths:[],title} ; cell {v,rs,cs,b,al,fill,sz,rot,bd} ---------- */
const C=(v,o)=>Object.assign({v},o||{});
function hindi(res,y,m,officer){const R=res.R,H=[];
  H.push([C(`राजस्व मुकदमात् के निस्तारण का मासिक प्रगति रिपोर्ट अवधि माह ${HM[m-1]} ${y}`,{cs:20,b:1,sz:14,nb:1})]);
  H.push([C('',{cs:20,nb:1})]);
  const h=t=>C(t,{b:1,rot:1});
  H.push([C('क्र0सं0',{rs:2,b:1}),C('किस्म मुकदमात',{rs:2,b:1}),C('बकाया',{rs:2,b:1}),C('दायर',{rs:2,b:1}),C('योग',{rs:2,b:1}),C('इस अवधि में निस्तारण',{cs:4,b:1}),C('निर्धारित मापदण्ड',{rs:2,b:1}),C('निस्तारण का प्रतिशत',{rs:2,b:1}),C('शेष',{rs:2,b:1}),C('5 वर्ष से अधिक पुराने निस्तारित प्रकरण',{rs:2,b:1}),C('शेष रहे प्रकरणों का विवरण',{cs:7,b:1})]);
  H.push([C('एक पक्षीय',{b:1}),C('बहु पक्षीय',{b:1}),C('स्था0',{b:1}),C('योग',{b:1}),h('6 माह से कम'),h('6 माह से ऊपर 1 वर्ष'),h('1 वर्ष से 2 वर्ष तक'),h('2 वर्ष से 3 वर्ष तक'),h('3 वर्ष से 5 वर्ष तक'),h('5 वर्ष से अधिक'),h('10 वर्ष से अधिक')]);
  const pc=v=>Math.round(v*100)+'%';
  CLS.forEach((c,i)=>{const r=R[c];H.push([C(i+1),C(c),C(r.C),C(r.D),C(r.E),C(r.gr['एक पक्षीय']),C(r.gr['बहु पक्षीय']),C(r.gr['स्था0']),C(r.I),C(r.J),C(pc(r.K)),C(r.L),C(r.M),...r.age.map(v=>C(v))])});
  const T=f=>tot(R,f);const TI=T('I'),TJ=T('J');
  H.push([C(''),C('योग',{b:1}),C(T('C'),{b:1}),C(T('D'),{b:1}),C(T('E'),{b:1}),C(T(r=>r.gr['एक पक्षीय']),{b:1}),C(T(r=>r.gr['बहु पक्षीय']),{b:1}),C(T(r=>r.gr['स्था0']),{b:1}),C(TI,{b:1}),C(TJ,{b:1}),C(pc(TJ?TI/TJ:0),{b:1}),C(T('L'),{b:1}),C(T('M'),{b:1}),...[0,1,2,3,4,5,6].map(k=>C(T(r=>r.age[k]),{b:1}))]);
  H.push([C('',{cs:20,nb:1})]);
  H.push([C('भ्रमण संबंधी सूचना',{cs:6,nb:1,al:'l'})]);
  H.push([C('नाम अधिकारी',{cs:3,rs:2,b:1}),C('भ्रमण का विवरण',{cs:17,b:1})]);
  H.push([C('दिन',{cs:2,b:1}),C('रात',{cs:2,b:1}),C('योग',{cs:2,b:1}),C('निर्धारित मापदण्ड',{cs:2,b:1}),C('प्रतिशत',{cs:2,b:1}),C('',{cs:7,nb:1})]);
  H.push([C(officer||'',{cs:3}),C('–',{cs:2}),C('–',{cs:2}),C('–',{cs:2}),C('–',{cs:2}),C('–',{cs:2}),C('',{cs:7,nb:1})]);
  H.push([C('',{cs:20,nb:1})]);
  H.push([C('निरीक्षण संबंधी सूचना',{cs:6,nb:1,al:'l'})]);
  H.push([C('क्र0सं0',{b:1}),C('स्वयं का कार्यालय',{cs:2,b:1}),C('पटवार मण्डल',{cs:2,b:1}),C('थाने',{cs:2,b:1}),C('कुल',{cs:2,b:1}),C('निर्धारित मापदण्ड',{cs:2,b:1}),C('प्रतिशत',{cs:2,b:1}),C('',{cs:7,nb:1})]);
  H.push([C('–'),C('–',{cs:2}),C('–',{cs:2}),C('–',{cs:2}),C('–',{cs:2}),C('–',{cs:2}),C('–',{cs:2}),C('',{cs:7,nb:1})]);
  H.push([C('',{cs:20,nb:1})]);
  H.push([C('',{cs:14,nb:1}),C('सहायक कलेक्टर (फास्ट ट्रेक)',{cs:6,b:1,nb:1})]);
  H.push([C('',{cs:14,nb:1}),C('निवाई',{cs:6,b:1,nb:1})]);
  return{title:'MPR हिन्दी',rows:H,widths:[6,16,8,7,8,8,8,7,7,10,10,8,13,9,10,10,10,10,10,10],land:1}}
function english(res,y,m){const R=res.R,T=f=>tot(R,f),a=res.dAge,ag=k=>T(r=>r.age[k]);
  const hd=b=>C(b,{b:1});
  const H=[[C('The Court of ACM(F.T.) Niwai Dist. Tonk (Raj.)',{cs:20,b:1,sz:13,nb:1})],[C(`Monthly stetment Disposal Revenue Cases For The Month Of ${EM[m-1]} ${y}`,{cs:20,b:1,nb:1})],[C('',{cs:20,nb:1})]];
  H.push([C('Name of court',{rs:3,b:1}),C('Pendency in blancing',{rs:3,b:1}),C('Original institution',{rs:3,b:1}),C('by transfer',{rs:3,b:1}),C('Total case total of col. 2 to 4',{rs:3,b:1}),C('DISPOSAL',{cs:8,b:1}),C('Total balance',{rs:3,b:1}),C('BALANCE',{cs:5,b:1}),C('Remarks',{rs:3,b:1})]);
  H.push([C('actual disposal',{rs:2,b:1}),C('disposal by transfer',{rs:2,b:1}),C('Total disposal',{rs:2,b:1}),C('Age of disposed cases',{cs:5,b:1}),C('over 5 years\n(older than 5 yrs)',{rs:2,b:1}),C('over 3 years\n(3 to 5 yrs)',{rs:2,b:1}),C('over 2 years\n(2 to 3 yrs)',{rs:2,b:1}),C('over 1 years\n(1 to 2 yrs)',{rs:2,b:1}),C('less than 1 year',{rs:2,b:1})]);
  H.push([hd('over 5 year\n(older than 5 yrs)'),hd('over 3 year\n(3 to 5 yrs)'),hd('over 2 year\n(2 to 3 yrs)'),hd('over 1 year\n(1 to 2 yrs)'),hd('less than 1 year')]);
  H.push([C('सहायक कलक्टर (फास्ट ट्रेक) निवाई',{al:'l'}),C(T('C')),C(T('D')),C(0),C(T('E')),C(T('I')),C(0),C(T('I')),C(a.GT5),C(a['3-5']),C(a['2-3']),C(a['1-2']),C(a.LT1),C(T('L')),C(ag(5)+ag(6)),C(ag(4)),C(ag(3)),C(ag(2)),C(ag(0)+ag(1)),C('संलग्न सूची')]);
  H.push([C('',{cs:20,nb:1})],[C('',{cs:20,nb:1})],[C('',{cs:14,nb:1}),C('सहायक कलेक्टर (फास्ट ट्रेक)',{cs:6,b:1,nb:1})],[C('',{cs:14,nb:1}),C('निवाई',{cs:6,b:1,nb:1})]);
  return{title:'Monthly Statement',rows:H,widths:[24,10,10,9,12,10,10,10,9,9,9,9,9,10,10,9,9,9,9,12],land:1}}
function yearwise(res,y,m){const ys=Object.keys(res.years).sort();let n=0;
  const H=[[C('न्यायालय सहायक कलक्टर (फास्ट ट्रेक) निवाई जिला टोंक',{cs:4,b:1,sz:12,nb:1})],[C(`मानचित्र राजस्व प्रकरण अवशेष वर्षवार माह ${HM[m-1]} ${y}`,{cs:4,b:1,nb:1})],[C('',{cs:4,nb:1})],
   [C('क्र0सं0',{b:1}),C('वर्ष',{b:1}),C('शेष प्रकरण',{b:1}),C('वि0वि0',{b:1})]];
  ys.forEach((k,i)=>{H.push([C(i+1),C(k),C(res.years[k]),C('')]);n+=res.years[k]});
  H.push([C('Total',{cs:2,b:1}),C(n,{b:1}),C('')]);H.push([C('',{cs:4,nb:1})]);H.push([C('',{cs:2,nb:1}),C('सहायक कलेक्टर (फास्ट ट्रेक)',{cs:2,b:1,nb:1})]);H.push([C('',{cs:2,nb:1}),C('निवाई',{cs:2,b:1,nb:1})]);
  return{title:'वर्षवार शेष',rows:H,widths:[8,12,14,12],total:n}}
/* hearing calendar for one month: hol = Map 'YYYY-MM-DD'->name ; today ISO */
function calendar(res,y,m,hol,today){const H=[],N=lastDay(y,m);let tot=0,days=0;
  for(let d=1;d<=N;d++){const c=res.hc[y+'-'+pad(m)+'-'+pad(d)]||0;tot+=c;if(c)days++}
  H.push([C(`पेशी कैलेंडर (Hearing Calendar) - ${EM[m-1]} ${y}`,{cs:7,b:1,sz:14,fill:'1F4E78',color:'FFFFFF'})]);
  H.push([C(`कुल फाइलें: ${tot}   |   पेशी तिथियाँ: ${days}`,{cs:7,b:1,nb:1})]);
  H.push(['रवि SUN','सोम MON','मंगल TUE','बुध WED','गुरु THU','शुक्र FRI','शनि SAT'].map(t=>C(t,{b:1,fill:'1F4E78',color:'FFFFFF'})));
  let first=new Date(y,m-1,1).getDay(),d=1;const flagged=[];
  while(d<=N){const top=[],bot=[];
    for(let col=0;col<7;col++){
      if((H.length===3&&col<first)||d>N){top.push(C('',{sm:1}));bot.push(C('',{h:34}));continue}
      const iso=y+'-'+pad(m)+'-'+pad(d),cnt=res.hc[iso]||0,hn=hol.get(iso),nw=col===0||col===6||!!hn;
      let fill='';if(nw)fill='EEEEEE';
      if(cnt){if(nw){fill='F4CCCC';flagged.push([iso,cnt])}else fill=iso<today?'FFF2CC':'D9EAD3'}
      top.push(C(hn?`${d} ${hn}`:d,{sm:1,fill:nw?'EEEEEE':'',al:'l'}));bot.push(C(cnt||'',{big:1,fill,h:34}));d++}
    H.push(top);H.push(bot)}
  H.push([C('हरा = आगामी पेशी | पीला = तिथि निकल गई, फिर भी लम्बित | धूसर = शनि/रवि/राजकीय अवकाश | लाल = अवकाश के दिन दर्ज पेशी (अगली तारीख़ बदलनी होगी)',{cs:7,nb:1,sm:1,al:'l',wrap:1})]);
  return{title:`${EM[m-1]} ${y}`,rows:H,widths:[17,17,17,17,17,17,17],land:1,total:tot,days,flagged}}
return{CLS,HM,EM,pad,lastDay,dm,compute,tot,hindi,english,yearwise,calendar,ym}})();
if(typeof module!=='undefined')module.exports=MPR;
