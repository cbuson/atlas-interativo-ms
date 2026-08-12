import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import {spawn} from 'node:child_process';

const root=path.resolve(process.cwd());
const cut=process.env.CORTE_DATA||'2026-08-10';
const port=Number(process.env.JOAJU_PORT||8765);
const atlas=`http://127.0.0.1:${port}/index.html`;
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.json':'application/json; charset=utf-8','.geojson':'application/geo+json; charset=utf-8','.css':'text/css; charset=utf-8','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.kmz':'application/vnd.google-earth.kmz','.kml':'application/vnd.google-earth.kml+xml','.zip':'application/zip','.csv':'text/csv; charset=utf-8','.xlsx':'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'};
function safePath(url){const u=new URL(url,'http://127.0.0.1');const rel=decodeURIComponent(u.pathname).replace(/^\/+/, '')||'index.html';const p=path.resolve(root,rel);return p.startsWith(root)?p:null}
const server=http.createServer((req,res)=>{const p=safePath(req.url||'/');if(!p||!fs.existsSync(p)||fs.statSync(p).isDirectory()){res.writeHead(404);res.end('Not found');return}res.setHeader('Access-Control-Allow-Origin','*');res.setHeader('Cache-Control','no-store');res.setHeader('Content-Type',mime[path.extname(p).toLowerCase()]||'application/octet-stream');fs.createReadStream(p).pipe(res)});
function run(script,env={}){return new Promise((resolve,reject)=>{const p=spawn(process.execPath,[script],{cwd:root,stdio:'inherit',env:{...process.env,...env}});p.on('exit',code=>code===0?resolve():reject(new Error(`${script} terminou com código ${code}`)))})}
async function runAuxiliary(script,env={}){
  try{await run(script,env);return true}
  catch(e){
    console.warn(`\nAVISO AUXILIAR · ${e.message||e}`);
    console.warn('A materialização geral contém camadas que não participam dos oito índices. O fechamento continuará e os validadores dos índices decidirão se existe bloqueio real.');
    return false;
  }
}
server.listen(port,'127.0.0.1',async()=>{
  console.log(`JOAJU MS · fechamento snapshot v1.8.0 · corte ${cut}`);
  console.log(`Atlas local · ${atlas}`);
  try{
    await runAuxiliary('scripts/materializar_camadas_ms.mjs',{CORTE_DATA:cut,ATLAS_URL:atlas});
    await run('scripts/materializar_escolas_inep_2025.mjs',{CORTE_DATA:cut});
    await run('scripts/materializar_indices.mjs',{CORTE_DATA:cut,ATLAS_URL:atlas,ALLOW_OVERWRITE:'1'});
    await run('scripts/validar_precalculados.mjs',{CORTE_DATA:cut});
    console.log('\nSNAPSHOT FECHADO · dados/precalculados está pronto para publicação.');
  }catch(e){
    console.error(`\nFALHA · ${e.message||e}`);
    console.error('O corte não deve ser publicado enquanto esta falha não for resolvida. Nenhum valor é preenchido artificialmente.');
    process.exitCode=1;
  }finally{server.close()}
});
