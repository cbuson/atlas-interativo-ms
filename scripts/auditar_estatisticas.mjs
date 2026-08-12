import fs from 'node:fs';
import path from 'node:path';

const root=path.resolve(process.cwd());
const readJson=p=>JSON.parse(fs.readFileSync(path.join(root,p),'utf8'));
const index=fs.readFileSync(path.join(root,'index.html'),'utf8');
const ficha=readJson('dados/precalculados/ficha_territorial_250km2.geojson');

let pass=0,fail=0;
function check(cond,label,detail=''){
  const ok=Boolean(cond);
  console.log(`${ok?'PASS':'FAIL'} · ${label}${detail?' · '+detail:''}`);
  ok?pass++:fail++;
}

check(ficha?.features?.length===1554,'Ficha Territorial possui 1554 células',String(ficha?.features?.length||0));
const specs=[
 ['IPG','ipg_100',57],
 ['PEIC','peic_100',82],
 ['IATI','iati_100',1025],
 ['IAT','iat_100',1554],
 ['ISA','isa_100',1554],
 ['ICT','ict_100',1554],
 ['IPAE','ipae_100',1554],
 ['ICD','icd_100',1554]
];
for(const [name,key,expected] of specs){
  const n=ficha.features.filter(f=>{
    const raw=f?.properties?.[key];
    if(raw===null||raw===undefined||raw==='')return false;
    return Number.isFinite(Number(raw));
  }).length;
  check(n===expected,`${name} · cobertura numérica`,`${n}/1554`);
}
check(index.includes('function snapshotPropsInScope()'),'Painel usa Ficha Territorial fechada');
check(index.includes("if(raw===null||raw===undefined||raw==='')continue;"),'Painel preserva null');
check(index.includes("if(scopeSelect.value==='state')return manifestCount(id);"),'Contagens estaduais usam DATA_MANIFEST');
check(index.includes("universalFichaCanonicalHexId(raw)"),'Escala hex aceita somente R5 canônica');
check(index.includes(".stats-toolbar{grid-template-columns:1fr 1fr;position:relative;top:auto}"),'Toolbar móvel não cobre resultados');
check(index.includes("b.textContent='snapshot fechado'"),'Badge reconhece snapshot fechado');
check(!index.includes('integra as camadas estruturadas até 6 de agosto de 2026'),'Texto geral residual de 06/08 removido');

console.log(`\nResumo estatísticas · ${pass} PASS · 0 WARN · ${fail} FAIL`);
if(fail)process.exit(1);
