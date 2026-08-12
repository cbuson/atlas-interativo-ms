import fs from 'node:fs';
import path from 'node:path';

const root=path.resolve(process.cwd());
const pre=path.join(root,'dados','precalculados');
const read=p=>JSON.parse(fs.readFileSync(path.join(pre,p),'utf8'));
const ficha=read('ficha_territorial_250km2.geojson');
const fm=new Map(ficha.features.map(f=>[String(f.properties?.hex_id||''),f.properties||{}]));
const specs=[
 ['IPG','ipg_250km2.geojson','ipg_100',57,1497],
 ['PEIC','peic_250km2.geojson','peic_100',82,1472],
 ['IATI','iati_250km2.geojson','iati_100',1025,529],
 ['IAT','iat_250km2.geojson','iat_100',1554,0],
 ['ISA','isa_250km2.geojson','isa_100',1554,0],
 ['ICT','ict_250km2.geojson','ict_100',1554,0],
 ['IPAE','ipae_250km2.geojson','ipae_100',1554,0],
 ['ICD','icd_250km2.geojson','icd_100',1554,0]
];
let pass=0,fail=0;
const check=(ok,label,detail='')=>{console.log(`${ok?'PASS':'FAIL'} · ${label}${detail?' · '+detail:''}`);ok?pass++:fail++;};
check(fm.size===1554,'Ficha Territorial contém 1554 hexágonos',String(fm.size));
let comparisons=0;
for(const [name,file,key,expNum,expNull] of specs){
 const d=read(file),m=new Map(d.features.map(f=>[String(f.properties?.hex_id||''),f.properties||{}]));
 check(m.size===1554,`${name} · 1554 feições`,String(m.size));
 check([...m.keys()].every(id=>fm.has(id)),`${name} · todos os hex_id existem na ficha`);
 let num=0,nul=0,mismatch=0;
 for(const [id,p] of m){
   const a=p[key],b=fm.get(id)?.[key];
   const na=(a===null||a===undefined||a==='')?null:Number(a);
   const nb=(b===null||b===undefined||b==='')?null:Number(b);
   if(na===null)nul++;else num++;
   comparisons++;
   if((na===null)!=(nb===null)||(na!==null&&Math.abs(na-nb)>1e-9))mismatch++;
 }
 check(num===expNum,`${name} · cobertura numérica esperada`,`${num}/1554`);
 check(nul===expNull,`${name} · nulos esperados`,String(nul));
 check(mismatch===0,`${name} · valores idênticos à Ficha Territorial`,`${mismatch} divergências`);
}
const peic=read('peic_250km2.geojson').features.map(f=>f.properties||{});
const peicContext=peic.filter(p=>p.peic_100==null&&p.classe_estruturacao==='Contexto cultural sem base não sensível suficiente').length;
const peicNoEvidence=peic.filter(p=>p.peic_100==null&&p.status_calculo==='Sem evidência suficiente').length;
check(peicContext===73,'PEIC · contextos protegidos identificados',String(peicContext));
check(peicNoEvidence===1399,'PEIC · células sem evidência documental identificadas',String(peicNoEvidence));

const index=fs.readFileSync(path.join(root,'index.html'),'utf8');
check(index.includes('TERRITORIAL_SPARSE_DISPLAY_RULES'),'Runtime possui regra visual para índices esparsos');
check(index.includes("return 'hidden';"),'Células sem evidência podem ser omitidas do desenho');
check(index.includes("contextClass:'Contexto cultural sem base não sensível suficiente'"),'PEIC preserva contexto protegido em cinza');
check(index.includes("source===null||source===undefined||source===''"),'Gradiente não converte null em zero');
check(index.includes('Isso não é falha de carregamento'),'Ficha explica explicitamente os nulos');
check(index.includes('células com valor numérico'),'Progresso distingue valor numérico de total de feições');

console.log(`\nComparações índice × ficha · ${comparisons}`);
console.log(`Resumo célula a célula · ${pass} PASS · 0 WARN · ${fail} FAIL`);
if(fail)process.exit(1);
