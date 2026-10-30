/* Pure helpers: parsing MPR lists, classification, advocate matching. No Firebase here. */
const Core=(()=>{
const norm=s=>String(s||'').toLowerCase().replace(/[^\p{L}\p{M}\p{N}]/gu,'');
const rawNames=s=>String(s||'').split(/[,;\/&]|\s+व\s+|\s+and\s+/i).map(x=>x.trim()).filter(Boolean);
const names=s=>rawNames(s).map(norm).filter(Boolean);
const sv=v=>{v=String(v==null?'':v).trim();return /^(nan|none|nat)$/i.test(v)?'':v};
const iso=s=>{const m=/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(String(s).trim());return m?`${m[3]}-${m[2].padStart(2,'0')}-${m[1].padStart(2,'0')}`:''};
const hasAny=(sec,l)=>l.some(t=>sec.includes(t));
function klass(ct,sec){sec=String(sec).replace(/\s/g,'');
  if(ct==='इजराय'||sec.includes('175'))return 'इजराय';
  if(hasAny(sec,['188','53','88','183','89','92']))return 'दावे';
  return hasAny(sec,['212','39','136','151','O(9)'])?'प्रार्थना पत्र':'दावे';}
const yearOf=x=>parseInt((x.ir||x.ig||'').slice(0,4))||0;
function parseList(text){
  const doc=new DOMParser().parseFromString(text,'text/html');let hdr=null,rows=null;
  for(const t of doc.querySelectorAll('table')){const trs=[...t.rows];
    for(let i=0;i<Math.min(4,trs.length);i++){const c=[...trs[i].cells].map(x=>x.textContent.trim());
      if(c.includes('Case Type')&&c.includes('Hearing Date')){hdr=c;rows=trs.slice(i+1);break}}
    if(hdr)break}
  if(!hdr)throw new Error('इस फ़ाइल में MPR की तालिका (Case Type, Hearing Date) नहीं मिली।');
  const out=[];
  for(const tr of rows){const c=[...tr.cells].map(x=>x.textContent.trim());if(c.length<hdr.length)continue;
    const g=k=>sv(c[hdr.indexOf(k)]);const ct=g('Case Type');if(!ct)continue;
    const gc=g('GCMS Case No'),rr=g('RRCMS Case No');if(!gc&&!rr)continue;const sec=g('Section');
    out.push({n:rr||gc,g:gc,r:rr,ir:iso(g('Institution Date(RRCMS)')),ig:iso(g('Institution Date(GCMS)')),tehsil:g('Tehsil Name'),vil:g('Village Name'),kh:g('Khasra No'),ct,act:g('Act'),pur:g('Case Purpose'),sec,ap:g('Appellant Name'),rs:g('Respondent Name'),hd:iso(g('Hearing Date')),aa:g('Appellant Advocate'),ra:g('Respondent Advocate'),cc:g('Connected Case no'),k:klass(ct,sec),dv:g('Division Name'),ds:g('DISTRICTNAME')});}
  return out;}
function xlDate(v){if(v==null||v==='')return '';
  if(v instanceof Date)return new Date(v.getTime()+12*36e5).toISOString().slice(0,10);
  if(typeof v==='number')return new Date(Math.round(Date.UTC(1899,11,30)+Math.floor(v)*864e5)).toISOString().slice(0,10);
  const s=String(v).trim();let m=/^(\d{4})-(\d{2})-(\d{2})/.exec(s);if(m)return m[0].slice(0,10);return iso(s);}
function parseDisposal(buf){const wb=XLSX.read(buf,{type:'array'});const ws=wb.Sheets[wb.SheetNames[0]];
  const rows=XLSX.utils.sheet_to_json(ws,{defval:''});if(rows.length&&!('प्रकरण क्र.' in rows[0]))throw new Error('निस्तारण फ़ाइल में "प्रकरण क्र." कॉलम नहीं मिला।');
  return rows.map(r=>({no:sv(r['प्रकरण क्र.']),title:sv(r['केस शीर्षिक']),sec:sv(r['धाराऐ']),dd:xlDate(r['निर्णय तिथि'])})).filter(r=>r.no);}
/* history: Map key(n/g/r) -> record */
const inEx=(x,EX)=>EX.has(x.n)||EX.has(x.g)||EX.has(x.r);
function ingest(hist,rows,EX){const kept=[];for(const x of rows){if(inEx(x,EX))continue;kept.push(x);for(const k of new Set([x.n,x.g,x.r]))if(k)hist.set(k,x)}return kept}
function applyDisposal(drows,hist,EX,pendKeys){const out=[];let nf=0;const clash=[];
  for(const r of drows){if(EX.has(r.no))continue;const h=hist.get(r.no);let x;
    if(h)x={...h};else{nf++;const rr=/^\d{15}$/.test(r.no);x={n:r.no,g:rr?'':r.no,r:rr?r.no:''}}
    x.title=r.title;x.sec=r.sec||x.sec||'';
    if(!x.ap&&r.title.includes(' बनाम ')){const p=r.title.split(' बनाम ');x.ap=p[0].trim();x.rs=p.slice(1).join(' बनाम ').trim()}
    x.k=klass(x.ct||'',x.sec);x.dd=r.dd;x.hd='';x.s='D';x.iy=yearOf(x);if(pendKeys.has(r.no))clash.push(r.no);out.push(x)}
  out.sort((a,b)=>(b.dd||'').localeCompare(a.dd||''));return{disposed:out,nf,clash}}
const uniq=hist=>[...new Set(hist.values())];
function matchRecs(recs,aliases){const set=new Set(aliases.map(norm).filter(Boolean));if(!set.size)return[];
  return recs.filter(x=>names(x.aa).some(n=>set.has(n))||names(x.ra).some(n=>set.has(n)))}
function advocateNames(recs){const m=new Map();for(const x of recs)for(const f of[x.aa,x.ra])for(const n of rawNames(f))m.set(n,(m.get(n)||0)+1);return[...m].sort((a,b)=>b[1]-a[1])}
return{norm,rawNames,names,klass,yearOf,parseList,parseDisposal,ingest,applyDisposal,uniq,matchRecs,advocateNames,inEx}})();
