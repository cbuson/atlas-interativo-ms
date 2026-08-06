function geomParts(g,type){if(!g)return[];if(type==='line'){if(g.type==='LineString')return[g.coordinates];if(g.type==='MultiLineString')return g.coordinates;}if(type==='polygon'){if(g.type==='Polygon')return[g.coordinates];if(g.type==='MultiPolygon')return g.coordinates;}return[];}
function pointInRing(pt,ring){if(!Array.isArray(pt)||!Array.isArray(ring)||ring.length<3)return false;let inside=false;for(let i=0,j=ring.length-1;i<ring.length;j=i++){const xi=Number(ring[i]?.[0]),yi=Number(ring[i]?.[1]),xj=Number(ring[j]?.[0]),yj=Number(ring[j]?.[1]),px=Number(pt[0]),py=Number(pt[1]);if(![xi,yi,xj,yj,px,py].every(Number.isFinite))continue;const dx=xj-xi,dy=yj-yi,cross=(px-xi)*dy-(py-yi)*dx;if(Math.abs(cross)<=1e-12&&px>=Math.min(xi,xj)-1e-12&&px<=Math.max(xi,xj)+1e-12&&py>=Math.min(yi,yj)-1e-12&&py<=Math.max(yi,yj)+1e-12)return true;const hit=((yi>py)!==(yj>py))&&(px<(dx*(py-yi)/((dy)||1e-15)+xi));if(hit)inside=!inside;}return inside;}
function pointInPolygonGeom(pt,g){for(const poly of geomParts(g,'polygon')){if(poly?.[0]&&pointInRing(pt,poly[0])&&!poly.slice(1).some(r=>pointInRing(pt,r)))return true;}return false;}
function segmentIntersection(a,b,c,d){const den=(a[0]-b[0])*(c[1]-d[1])-(a[1]-b[1])*(c[0]-d[0]);if(Math.abs(den)<1e-12)return null;const t=((a[0]-c[0])*(c[1]-d[1])-(a[1]-c[1])*(c[0]-d[0]))/den,u=-((a[0]-b[0])*(a[1]-c[1])-(a[1]-b[1])*(a[0]-c[0]))/den;if(t>=0&&t<=1&&u>=0&&u<=1)return[a[0]+t*(b[0]-a[0]),a[1]+t*(b[1]-a[1])];return null;}
function analysisGeomIntersectsHex(g,ring){if(!g)return false;if(g.type==='Point')return pointInRing(g.coordinates,ring);if(g.type==='MultiPoint')return g.coordinates.some(p=>pointInRing(p,ring));if(g.type==='LineString'||g.type==='MultiLineString'){const lines=g.type==='LineString'?[g.coordinates]:g.coordinates;for(const line of lines){if(line.some(p=>pointInRing(p,ring)))return true;for(let i=1;i<line.length;i++)for(let j=1;j<ring.length;j++)if(segmentIntersection(line[i-1],line[i],ring[j-1],ring[j]))return true;}return false;}if(g.type==='Polygon'||g.type==='MultiPolygon'){const polys=g.type==='Polygon'?[g.coordinates]:g.coordinates;for(const poly of polys){if(poly[0]?.some(p=>pointInRing(p,ring)))return true;if(ring.slice(0,-1).some(p=>pointInPolygonGeom(p,{type:'Polygon',coordinates:poly})))return true;for(const pr of poly)for(let i=1;i<pr.length;i++)for(let j=1;j<ring.length;j++)if(segmentIntersection(pr[i-1],pr[i],ring[j-1],ring[j]))return true;}return false;}return false;}
const ring=[[0,0],[10,0],[10,10],[0,10],[0,0]];
const tests={
 inside:pointInRing([5,5],ring)===true,
 outside:pointInRing([15,5],ring)===false,
 boundary:pointInRing([10,5],ring)===true,
 point:analysisGeomIntersectsHex({type:'Point',coordinates:[5,5]},ring)===true,
 multipoint:analysisGeomIntersectsHex({type:'MultiPoint',coordinates:[[15,15],[5,5]]},ring)===true,
 line_cross:analysisGeomIntersectsHex({type:'LineString',coordinates:[[-1,5],[11,5]]},ring)===true,
 line_out:analysisGeomIntersectsHex({type:'LineString',coordinates:[[-1,15],[11,15]]},ring)===false,
 polygon_contains_hex:analysisGeomIntersectsHex({type:'Polygon',coordinates:[[[-5,-5],[15,-5],[15,15],[-5,15],[-5,-5]]]},ring)===true,
 polygon_out:analysisGeomIntersectsHex({type:'Polygon',coordinates:[[[20,20],[30,20],[30,30],[20,30],[20,20]]]},ring)===false,
 hole:pointInPolygonGeom([5,5],{type:'Polygon',coordinates:[ring,[[4,4],[6,4],[6,6],[4,6],[4,4]]]})===false
};
const failed=Object.entries(tests).filter(([,v])=>!v);
console.log(JSON.stringify(tests,null,2));
if(failed.length){console.error('FAILED',failed);process.exit(1);} 
