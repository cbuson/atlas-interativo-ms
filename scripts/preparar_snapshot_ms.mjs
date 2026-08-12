import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import {spawn} from 'node:child_process';

const root=process.cwd();
const cut=process.env.CORTE_DATA||'2026-08-10';
const port=Number(process.env.JOAJU_PORT||8765);
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.json':'application/json; charset=utf-8','.css':'text/css; charset=utf-8','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.kmz':'application/vnd.google-earth.kmz','.kml':'application/vnd.google-earth.kml+xml','.zip':'application/zip','.csv':'text/csv; charset=utf-8','.xlsx':'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'};
function safePath(url){const u=new URL(url,'http://127.0.0.1');let rel=decodeURIComponent(u.pathname).replace(/^\/+/, '')||'index.html';const p=path.resolve(root,rel);if(!p.startsWith(path.resolve(root)))return null;return p}
const server=http.createServer((req,res)=>{const p=safePath(req.url||'/');if(!p||!fs.existsSync(p)||fs.statSync(p).isDirectory()){res.writeHead(404);res.end('Not found');return}res.setHeader('Access-Control-Allow-Origin','*');res.setHeader('Cache-Control','no-store');res.setHeader('Content-Type',mime[path.extname(p).toLowerCase()]||'application/octet-stream');fs.createReadStream(p).pipe(res)});
function run(cmd,args,env={}){return new Promise((resolve,reject)=>{const p=spawn(cmd,args,{cwd:root,stdio:'inherit',env:{...process.env,...env}});p.on('exit',code=>code===0?resolve():reject(new Error(`${cmd} ${args.join(' ')} terminou com código ${code}`)))})}
server.listen(port,'127.0.0.1',async()=>{
  const atlas=`http://127.0.0.1:${port}/index.html`;
  console.log(`JOAJU MS · servidor temporário ${atlas}`);
  try{
    await run(process.execPath,['scripts/materializar_camadas_ms.mjs'],{CORTE_DATA:cut,ATLAS_URL:atlas});
    await run(process.execPath,['scripts/gerar_catalogos.mjs']);
    await run(process.execPath,['scripts/gerar_variantes_singlefile.mjs']);
    await run(process.execPath,['scripts/auditar_snapshots.mjs'],{CORTE_DATA:cut,STRICT_ALL_LAYERS:'1'});
    console.log('\nSnapshot R6 VECTOR FIRST preparado e auditado. Revise docs/MATERIALIZACAO_CAMADAS_MS_'+cut+'.json antes de calcular os índices.');
  }catch(e){console.error('\nFALHA NA PREPARAÇÃO DO SNAPSHOT:',e.message||e);process.exitCode=1}
  finally{server.close()}
});
