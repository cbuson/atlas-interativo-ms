import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const root=path.resolve(process.cwd());
const port=Number(process.env.JOAJU_PORT||8765);
const host='127.0.0.1';
const mime={
  '.html':'text/html; charset=utf-8',
  '.js':'text/javascript; charset=utf-8',
  '.mjs':'text/javascript; charset=utf-8',
  '.json':'application/json; charset=utf-8',
  '.webmanifest':'application/manifest+json; charset=utf-8',
  '.geojson':'application/geo+json; charset=utf-8',
  '.css':'text/css; charset=utf-8',
  '.png':'image/png',
  '.jpg':'image/jpeg',
  '.jpeg':'image/jpeg',
  '.svg':'image/svg+xml',
  '.kmz':'application/vnd.google-earth.kmz',
  '.kml':'application/vnd.google-earth.kml+xml',
  '.csv':'text/csv; charset=utf-8'
};
function safePath(url){
  const u=new URL(url,'http://127.0.0.1');
  const rel=decodeURIComponent(u.pathname).replace(/^\/+/,'')||'index.html';
  const p=path.resolve(root,rel);
  return p.startsWith(root)?p:null;
}
const server=http.createServer((req,res)=>{
  const p=safePath(req.url||'/');
  if(!p||!fs.existsSync(p)||fs.statSync(p).isDirectory()){
    res.writeHead(404,{'Content-Type':'text/plain; charset=utf-8'});
    res.end('Not found');
    return;
  }
  res.setHeader('Cache-Control','no-store');
  res.setHeader('Access-Control-Allow-Origin','*');
  res.setHeader('Content-Type',mime[path.extname(p).toLowerCase()]||'application/octet-stream');
  fs.createReadStream(p).pipe(res);
});
server.listen(port,host,()=>{
  console.log(`JOAJU MS · servidor local · http://${host}:${port}/index.html`);
  console.log('Ctrl+C para encerrar.');
});
