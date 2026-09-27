(function(){
const T = THREE;
if (T.ColorManagement) T.ColorManagement.legacyMode = false;
const reduced = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ---------- palette ---------- */
const P = {
  cream:'#F3EDE3', panel:'#EAE2D5', teal:'#6A9398', tealDk:'#4F7479', pale:'#C3D7DC', oak:'#D4B086', oakLt:'#E3CBA5', woodDk:'#9B7550',
  brass:'#C8A266', grey:'#AEB6AF', pink:'#E9B9AC', blush:'#F2D4CB', peach:'#EDCB9E', white:'#FAF7F2', black:'#2B2B2B', steel:'#C9CED0',
  coral:'#DDA38F', sage:'#9FB19C', sky:'#C3D7DC', tile:'#DADBD5'
};
P.wood=P.oak; P.chair=P.oak; P.door=P.teal;
const FH = 3.2;            // floor-to-floor height
const matCache = {};
function mat(c, r=0.8, m=0, extra){ const k=c+'|'+r+'|'+m+(extra?JSON.stringify(extra):''); if(!matCache[k]) matCache[k]=new T.MeshStandardMaterial(Object.assign({color:c,roughness:r,metalness:m},extra||{})); return matCache[k]; }
const GLASS = new T.MeshPhysicalMaterial({color:'#E3F1F3',roughness:.05,metalness:0,transparent:true,opacity:.2,depthWrite:false,side:T.DoubleSide});
const GLASS2 = new T.MeshPhysicalMaterial({color:'#EEF5F4',roughness:.25,metalness:0,transparent:true,opacity:.42,depthWrite:false,side:T.DoubleSide});

/* ---------- geometry helpers (y = bottom) ---------- */
function B(p,w,h,d,x,y,z,m,noCast){ const o=new T.Mesh(new T.BoxGeometry(w,h,d),m); o.position.set(x,y+h/2,z); o.castShadow=!noCast; o.receiveShadow=true; p.add(o); return o; }
function C(p,rt,rb,h,x,y,z,m,seg){ const o=new T.Mesh(new T.CylinderGeometry(rt,rb,h,seg||20),m); o.position.set(x,y+h/2,z); o.castShadow=true; o.receiveShadow=true; p.add(o); return o; }
function S(p,r,x,y,z,m,sx,sy,sz){ const o=new T.Mesh(new T.SphereGeometry(r,16,12),m); o.position.set(x,y,z); o.scale.set(sx||1,sy||1,sz||1); o.castShadow=true; p.add(o); return o; }
function grp(p,x,y,z,ry){ const g=new T.Group(); g.position.set(x,y,z); g.rotation.y=ry||0; p.add(g); return g; }

/* instanced small parts: leaves & boxes */
const instStore = new Map();
function inst(parent,kind,x,y,z,sx,sy,sz,col,ry){ if(!instStore.has(parent)) instStore.set(parent,{leaf:[],box:[]}); instStore.get(parent)[kind].push([x,y,z,sx,sy,sz,col,ry||0]); }
const LEAVES=['#4F8A4B','#5E9C57','#3F7640','#6FAE62','#86B86F','#4C7F45'];
function leaf(p,x,y,z,s,col){ inst(p,'leaf',x,y,z,s,s*.8,s,col||LEAVES[(Math.random()*LEAVES.length)|0],Math.random()*6); }
function flushInst(){
  const lg=new T.IcosahedronGeometry(1,0), bg=new T.BoxGeometry(1,1,1);
  const lm=new T.MeshStandardMaterial({roughness:.75,flatShading:true}), bm=new T.MeshStandardMaterial({roughness:.8});
  const d=new T.Object3D(), c=new T.Color();
  instStore.forEach((st,parent)=>{
    [['leaf',lg,lm],['box',bg,bm]].forEach(([k,g,m])=>{
      const arr=st[k]; if(!arr.length) return;
      const im=new T.InstancedMesh(g,m,arr.length);
      arr.forEach((a,i)=>{ d.position.set(a[0],a[1],a[2]); d.scale.set(a[3],a[4],a[5]); d.rotation.set(k==='leaf'?a[7]*.7:0,a[7],0); d.updateMatrix(); im.setMatrixAt(i,d.matrix); c.set(a[6]); im.setColorAt(i,c); });
      im.castShadow=true; im.receiveShadow=true; parent.add(im);
    });
  });
}

/* ---------- canvas textures ---------- */
function ctex(w,h,draw,rx,ry){ const cv=document.createElement('canvas'); cv.width=w; cv.height=h; const g=cv.getContext('2d'); draw(g,w,h); const t=new T.CanvasTexture(cv); t.encoding=T.sRGBEncoding; t.wrapS=t.wrapT=T.RepeatWrapping; t.repeat.set(rx||1,ry||1); t.anisotropy=8; return t; }
function rep(t,rx,ry){ const n=t.clone(); n.needsUpdate=true; n.repeat.set(rx,ry); return n; }
const AR='"DM Sans", Arial, sans-serif', KUFI='"Fraunces", Georgia, serif', SCRIPT='"Pacifico", cursive';

let TX={};
function drawSprig(g,x,y,s,col){
  g.strokeStyle=col; g.lineWidth=2.2*s; g.lineCap='round';
  g.beginPath(); g.moveTo(x,y); g.bezierCurveTo(x+6*s,y-60*s,x-8*s,y-120*s,x+2*s,y-170*s); g.stroke();
  for(let i=0;i<7;i++){ const t=i/7, yy=y-20*s-t*140*s, dir=i%2?1:-1, lx=x+dir*(22-t*10)*s;
    g.beginPath(); g.ellipse((x+lx)/2,yy-6*s,11*s*(1-t*.4),4.5*s,dir*-.6,0,7); g.stroke(); }
}
function makeTextures(){
  // penny-round mosaic (0.6 m per tile repeat)
  TX.floor = ctex(512,512,(g,w)=>{
    g.fillStyle='#D3D4CF'; g.fillRect(0,0,w,w);
    const step=16, r=7;
    for(let j=0;j<w/step;j++) for(let i=0;i<=w/step;i++){
      const x=i*step+(j%2?step/2:0), y=j*step+step/2; const k=Math.random();
      g.fillStyle=k<.05?'#7F8684':(k<.2?'#B6BAB6':'#F2F0EB'); g.beginPath(); g.arc(x%w,y,r,0,7); g.fill(); if(x>w-r) { g.beginPath(); g.arc(x-w,y,r,0,7); g.fill(); }
    }
  });
  // greek-key border strip (1.2 m × 0.2 m)
  TX.key = ctex(512,86,(g,w,h)=>{
    g.fillStyle='#EFEDE7'; g.fillRect(0,0,w,h); g.strokeStyle='#6E7573'; g.lineWidth=5; g.lineJoin='miter';
    g.fillStyle='#6E7573'; g.fillRect(0,4,w,4); g.fillRect(0,h-8,w,4);
    for(let x=0;x<w;x+=64){ g.beginPath(); g.moveTo(x+6,h-18); g.lineTo(x+6,18); g.lineTo(x+54,18); g.lineTo(x+54,58); g.lineTo(x+22,58); g.lineTo(x+22,34); g.lineTo(x+38,34); g.stroke();
      g.beginPath(); g.moveTo(x+6,h-18); g.lineTo(x+70,h-18); g.stroke(); }
  });
  // square wall tiles (0.6 m)
  TX.subway = ctex(256,256,(g,w)=>{
    g.fillStyle='#F3F1EC'; g.fillRect(0,0,w,w); const s=w/6;
    for(let i=0;i<6;i++)for(let j=0;j<6;j++){ const l=84+Math.random()*4; g.fillStyle=`hsl(90,6%,${l}%)`; g.fillRect(i*s+1.5,j*s+1.5,s-3,s-3); g.fillStyle='rgba(255,255,255,.35)'; g.fillRect(i*s+3,j*s+3,s-6,4); }
  });
  // herringbone-style oak (1.6 m)
  TX.wood = ctex(512,512,(g,w,h)=>{
    g.fillStyle='#C9A57A'; g.fillRect(0,0,w,h); const W=64, pk=32;
    for(let c=0;c<w/W;c++) for(let r=-3;r<h/pk+3;r++){
      const x0=c*W, y0=r*pk, l=70+Math.random()*9; g.fillStyle=`hsl(34,40%,${l}%)`; g.beginPath();
      if(c%2===0){ g.moveTo(x0,y0+W); g.lineTo(x0+W,y0); g.lineTo(x0+W,y0+pk); g.lineTo(x0,y0+W+pk); }
      else { g.moveTo(x0,y0); g.lineTo(x0+W,y0+W); g.lineTo(x0+W,y0+W+pk); g.lineTo(x0,y0+pk); }
      g.closePath(); g.fill(); g.strokeStyle='rgba(120,85,50,.35)'; g.lineWidth=1.2; g.stroke();
    }
  });
  // fluted oak panel (0.6 m)
  TX.bead = ctex(256,256,(g,w)=>{ g.fillStyle='#CFA979'; g.fillRect(0,0,w,w); for(let x=0;x<w;x+=16){ const gr=g.createLinearGradient(x,0,x+16,0); gr.addColorStop(0,'#B48D5F'); gr.addColorStop(.35,'#DDBB8E'); gr.addColorStop(.7,'#D2AE80'); gr.addColorStop(1,'#A98253'); g.fillStyle=gr; g.fillRect(x,0,16,w);} });
  TX.peg = ctex(256,256,(g,w)=>{ g.fillStyle='#EDE5D6'; g.fillRect(0,0,w,w); g.fillStyle='#BCAF98'; for(let i=0;i<8;i++)for(let j=0;j<8;j++){ g.beginPath(); g.arc(16+i*32,16+j*32,3.5,0,7); g.fill(); } });
  TX.menu = ctex(512,600,(g,w,h)=>{
    g.fillStyle='#2A2E2C'; g.fillRect(0,0,w,h);
    for(let i=0;i<900;i++){ g.fillStyle=`rgba(255,255,255,${Math.random()*.05})`; g.fillRect(Math.random()*w,Math.random()*h,2,2); }
    g.fillStyle='#F4EFE6'; g.textAlign='center'; g.direction='ltr'; g.font='52px '+SCRIPT; g.fillText('Sip & Create',w/2,78);
    
    const items=[['Espresso','12'],['Americano','14'],['Latte','16'],['Cappuccino','16'],['Flat White','17'],['Mocha','18'],['Matcha Latte','19'],['Karak Tea','10'],['Hot Chocolate','15'],['Iced Coffee','16']];
    g.font='500 30px '+AR;
    items.forEach((it,i)=>{ const y=145+i*40; g.textAlign='left'; g.fillText(it[0],42,y); g.textAlign='right'; g.fillText(it[1]+' SAR',470,y); g.fillStyle='rgba(244,239,230,.25)'; g.fillRect(250,y-9,120,2); g.fillStyle='#F4EFE6'; });
    g.textAlign='center'; g.font='600 28px '+KUFI; g.fillStyle='#C3D7DC'; g.fillText('Art workshops every Thursday · upstairs',w/2,568);
  });
  TX.welcome = ctex(256,380,(g,w,h)=>{
    g.fillStyle='#2A2E2C'; g.fillRect(0,0,w,h); g.textAlign='center';
    g.fillStyle='#F4EFE6'; g.font='600 44px '+KUFI; g.fillText('Welcome',w/2,78); g.font='500 22px '+AR; g.fillText('coffee · art · workshops',w/2,118);
    drawSprig(g,w/2,350,1.2,'#C3D7DC');
  });
  TX.sign = ctex(384,512,(g,w,h)=>{ g.fillStyle='#F7F2E9'; g.fillRect(0,0,w,h); drawSprig(g,w/2,440,2,'#6A9398'); g.fillStyle='#E9B9AC'; g.beginPath(); g.arc(w/2+6,95,20,0,7); g.fill(); });
  TX.art2 = ctex(384,512,(g,w,h)=>{ g.fillStyle='#F5EFE6'; g.fillRect(0,0,w,h); g.strokeStyle='#C9A266'; g.lineWidth=3; for(let i=0;i<3;i++){ g.beginPath(); g.arc(w/2,h/2,60+i*40,0,7); g.stroke(); } drawSprig(g,w/2,420,1.6,'#8FA89B'); });
  TX.special = ctex(256,320,(g,w,h)=>{
    g.fillStyle='#F7F2E9'; g.fillRect(0,0,w,h); g.textAlign='center'; g.fillStyle='#2F4A48';
    g.font='600 28px '+AR; g.fillText("Tonight's class",w/2,58); g.fillStyle='#4F7479'; g.font='600 40px '+KUFI; g.fillText('Watercolour',w/2,130); g.fillStyle='#C08A6E'; g.font='600 28px '+AR; g.fillText('+ a free drink',w/2,190); g.fillStyle='#2F4A48'; g.font='500 26px '+AR; g.fillText('7:00 pm',w/2,250);
  });
  TX.facade = ctex(1024,160,(g,w,h)=>{
    g.fillStyle='#4F7479'; g.fillRect(0,0,w,h); g.fillStyle='#F5EEE2'; g.textAlign='center'; g.direction='ltr';
    g.font='92px '+SCRIPT; g.fillText('Sip & Create',w/2,100);
    g.fillStyle='#C8A266'; g.fillRect(90,78,150,3); g.fillRect(w-240,78,150,3);
  });
  TX.facade.wrapS=TX.facade.wrapT=T.ClampToEdgeWrapping;
  TX.enterSign = ctex(256,128,(g,w,h)=>{ g.fillStyle='#4F7479'; g.fillRect(0,0,w,h); g.fillStyle='#F5EEE2'; g.textAlign='center'; g.font='700 40px '+AR; g.fillText('DRIVE-THRU',w/2,52); g.font='700 44px '+AR; g.fillText('ENTER ↓',w/2,106); });
  TX.exitSign = ctex(256,128,(g,w,h)=>{ g.fillStyle='#4F7479'; g.fillRect(0,0,w,h); g.fillStyle='#F5EEE2'; g.textAlign='center'; g.font='700 40px '+AR; g.fillText('DRIVE-THRU',w/2,52); g.fillStyle='#E9B9AC'; g.font='700 44px '+AR; g.fillText('EXIT ↑',w/2,106); });
  TX.dtsign = ctex(1024,88,(g,w,h)=>{ g.fillStyle='#4F7479'; g.fillRect(0,0,w,h); g.fillStyle='#F5EEE2'; g.textAlign='center'; g.font='600 54px '+KUFI; g.fillText('DRIVE-THRU  ·  CLEARANCE 2.6 m',w/2,64); });
  TX.pickup = ctex(512,102,(g,w,h)=>{ g.fillStyle='#F7F2E9'; g.fillRect(0,0,w,h); g.fillStyle='#2F4A48'; g.textAlign='center'; g.font='600 58px '+KUFI; g.fillText('Pick-up',w/2,72); });
  TX.psign = ctex(128,128,(g,w,h)=>{ g.fillStyle='#FFFFFF'; g.fillRect(0,0,w,h); g.fillStyle='#4F7479'; g.fillRect(8,8,w-16,h-16); g.fillStyle='#FFFFFF'; g.textAlign='center'; g.font='700 92px '+AR; g.fillText('P',w/2,98); });
  TX.dtmenu = ctex(620,440,(g,w,h)=>{ g.fillStyle='#2A2E2C'; g.fillRect(0,0,w,h); g.fillStyle='#F4EFE6'; g.textAlign='center'; g.font='50px '+SCRIPT; g.fillText('Sip & Create',w/2,62); g.font='600 22px '+AR; g.fillStyle='#C3D7DC'; g.fillText('DRIVE-THRU MENU',w/2,98);
    const it=[['Espresso','12'],['Latte','16'],['Iced Latte','17'],['Spanish Latte','18'],['Matcha Latte','19'],['Croissant','9'],['Cookie','7']]; g.font='500 27px '+AR;
    it.forEach((a,i)=>{ const y=148+i*38; g.fillStyle='#F4EFE6'; g.textAlign='left'; g.fillText(a[0],50,y); g.textAlign='right'; g.fillText(a[1]+' SAR',w-50,y); }); g.fillStyle='#E9B9AC'; g.textAlign='center'; g.font='600 22px '+AR; g.fillText('Order here · pay & collect at the window',w/2,h-18); });
  const small=(txt,bg,fg)=>ctex(512,128,(g,w,h)=>{ g.fillStyle=bg; g.fillRect(0,0,w,h); g.textAlign='center'; g.fillStyle=fg; g.font='600 52px '+KUFI; g.fillText(txt,w/2,86); });
  TX.wc=small('Restroom','#F7F2E9','#2F4A48'); TX.self=small('Tool station','#6A9398','#FFF8F2'); TX.beans=small('Specialty beans','#EDCB9E','#2F4A48'); TX.kitchen=small('Kitchen','#F7F2E9','#2F4A48'); TX.books=small('Art supplies','#C3D7DC','#2F4A48');
}

/* ---------- renderer / scene ---------- */
const stage=document.getElementById('stage');
let renderer;
try{ renderer=new T.WebGLRenderer({antialias:true}); }catch(e){ document.getElementById('loader').innerHTML='<div>This browser does not support WebGL<small>Try another browser or turn on hardware acceleration</small></div>'; return; }
renderer.setPixelRatio(Math.min(devicePixelRatio,2));
renderer.outputEncoding=T.sRGBEncoding;
renderer.shadowMap.enabled=true; renderer.shadowMap.type=T.PCFSoftShadowMap;
stage.appendChild(renderer.domElement);
const scene=new T.Scene(); const SKY_DAY=new T.Color('#DCE9F3'), SKY_NIGHT=new T.Color('#1D2838'); scene.background=SKY_DAY.clone();

const camera=new T.PerspectiveCamera(45,1,.05,200); camera.position.set(12.5,10,15);
const ortho=new T.OrthographicCamera(-10,10,6,-6,.1,100); ortho.position.set(0,40,0); ortho.up.set(0,0,-1); ortho.lookAt(0,0,0);
const orbit=new T.OrbitControls(camera,renderer.domElement); orbit.enableDamping=true; orbit.dampingFactor=.08; orbit.target.set(1.2,2.6,0); orbit.minDistance=2.5; orbit.maxDistance=40; orbit.maxPolarAngle=Math.PI*.495; orbit.autoRotateSpeed=.7;
const orbit2=new T.OrbitControls(ortho,renderer.domElement); orbit2.enableRotate=false; orbit2.screenSpacePanning=true; orbit2.enableDamping=true; orbit2.minZoom=.6; orbit2.maxZoom=5; orbit2.enabled=false; orbit2.target.set(0,0,0);
orbit2.mouseButtons={LEFT:T.MOUSE.PAN,MIDDLE:T.MOUSE.DOLLY,RIGHT:T.MOUSE.PAN}; orbit2.touches={ONE:T.TOUCH.PAN,TWO:T.TOUCH.DOLLY_PAN};

const hemi=new T.HemisphereLight('#FFF7EE','#B9A993',.5); scene.add(hemi);
const amb=new T.AmbientLight('#FFFFFF',.18); scene.add(amb);
const sun=new T.DirectionalLight('#FFF1DE',1.05); sun.position.set(11,18,13); sun.castShadow=true; sun.shadow.mapSize.set(4096,4096);
Object.assign(sun.shadow.camera,{left:-21,right:21,top:21,bottom:-21,near:1,far:80}); sun.shadow.bias=-.0004; sun.shadow.normalBias=.02; scene.add(sun); scene.add(sun.target);
const pendLights=[]; const bulbMats=[];

/* groups */
const G0=new T.Group(), G1=new T.Group(), ROOF=new T.Group(), SITE=new T.Group(), DIMS=new T.Group();
const H0=new T.Group(), H1=new T.Group(); // hanging items (hidden in plan)
G0.add(H0); G1.add(H1); scene.add(G0,G1,ROOF,SITE,DIMS);
const SIDES={front:[],back:[],left:[],right:[]};

/* ---------- walls ---------- */
function buildWall(parent,c){
  const g=grp(parent,c.pos[0],c.pos[1],c.pos[2],c.rotY||0);
  const ops=(c.openings||[]).slice().sort((p,q)=>p.a-q.a);
  const cuts=[0,c.len]; ops.forEach(o=>cuts.push(o.a,o.b));
  const u=[...new Set(cuts)].sort((a,b)=>a-b);
  for(let i=0;i<u.length-1;i++){ const u0=u[i],u1=u[i+1],w=u1-u0,mid=(u0+u1)/2; if(w<1e-4) continue;
    const o=ops.find(o=>mid>o.a&&mid<o.b);
    if(!o) B(g,w,c.h,c.t,mid,0,0,c.mat);
    else{ if(o.bot>0) B(g,w,o.bot,c.t,mid,0,0,c.mat); if(o.top<c.h) B(g,w,c.h-o.top,c.t,mid,o.top,0,c.mat); }
  }
  if(c.windows) ops.forEach(o=>{ if(!o.glass) return; const w=o.b-o.a,h=o.top-o.bot,cx=(o.a+o.b)/2;
    B(g,w,h,.02,cx,o.bot,0,GLASS,true);
    const fm=mat(o.frame||P.white,.55,o.grid?.3:0), ft=o.grid?.05:.07, fd=c.t+.03;
    B(g,w,ft,fd,cx,o.bot,0,fm); B(g,w,ft,fd,cx,o.top-ft,0,fm); B(g,ft,h,fd,o.a+ft/2,o.bot,0,fm); B(g,ft,h,fd,o.b-ft/2,o.bot,0,fm);
    const vs=o.grid?.55:1.1, nm=Math.max(0,Math.round(w/vs)-1); for(let k=1;k<=nm;k++) B(g,o.grid?.03:.05,h,fd*.6,o.a+w*k/(nm+1),o.bot,0,fm);
    if(o.grid){ const nh=Math.max(1,Math.round(h/.6)-1); for(let k=1;k<=nh;k++) B(g,w,.03,fd*.6,cx,o.bot+h*k/(nh+1),0,fm); }
    else if(h>1.3) B(g,w,.05,fd*.6,cx,o.bot+h*.74,0,fm);
  });
  return g;
}
function floorWalls(f,op){
  const y0=f*FH, h=f?3.0:FH, inner=mat(P.cream,.92), clad={front:mat(f?'#EFE7DA':P.teal,.8),other:mat('#E8DFD0',.9)};
  const defs={
    front:{pos:[-6.2,y0,3.6],rotY:0,len:12.4,out:[-6.22,y0,3.71]},
    back:{pos:[-6.2,y0,-3.6],rotY:0,len:12.4,out:[-6.22,y0,-3.71]},
    left:{pos:[-6.1,y0,-3.5],rotY:-Math.PI/2,len:7,out:[-6.21,y0,-3.5]},
    right:{pos:[6.1,y0,-3.5],rotY:-Math.PI/2,len:7,out:[6.21,y0,-3.5]}
  };
  const parent=f?G1:G0;
  for(const s in defs){ const d=defs[s];
    const holder=new T.Group(); parent.add(holder); SIDES[s].push(holder);
    buildWall(holder,{pos:d.pos,rotY:d.rotY,len:d.len,h,t:.2,openings:op[s]||[],mat:inner,windows:true});
    buildWall(holder,{pos:d.out,rotY:d.rotY,len:d.len+.04,h,t:.02,openings:(op[s]||[]).map(o=>({...o,a:o.a+(s==='front'||s==='back'?.02:0),b:o.b+(s==='front'||s==='back'?.02:0)})),mat:s==='front'?clad.front:clad.other});
  }
}
function sideGroup(parent,side){ const g=new T.Group(); parent.add(g); SIDES[side].push(g); return g; }
/* picture-frame moulding on a wall. axis 'x' = wall runs along x at z=c ; 'z' = along z at x=c */
function frameRect(p,axis,c,a0,a1,y0,y1,m){ const s=.035,t=.02,L=a1-a0,H=y1-y0,mid=(a0+a1)/2;
  if(axis==='x'){ B(p,L,s,t,mid,y0,c,m,true); B(p,L,s,t,mid,y1-s,c,m,true); B(p,s,H,t,a0+s/2,y0,c,m,true); B(p,s,H,t,a1-s/2,y0,c,m,true); }
  else { B(p,t,s,L,c,y0,mid,m,true); B(p,t,s,L,c,y1-s,mid,m,true); B(p,t,H,s,c,y0,a0+s/2,m,true); B(p,t,H,s,c,y0,a1-s/2,m,true); } }

/* ---------- furniture ---------- */
function chair(p,x,y,z,rot,col){
  const g=grp(p,x,y,z,rot), m=mat(col||P.oak,.55);
  C(g,.2,.2,.04,0,.44,0,m);
  [[.14,.14],[-.14,.14],[.14,-.14],[-.14,-.14]].forEach(([a,b])=>C(g,.014,.017,.44,a,0,b,m,8));
  const ring=new T.Mesh(new T.TorusGeometry(.15,.009,6,24),m); ring.rotation.x=Math.PI/2; ring.position.y=.2; g.add(ring);
  const back=new T.Mesh(new T.TorusGeometry(.17,.017,8,24,Math.PI),m); back.position.set(0,.64,-.17); back.castShadow=true; g.add(back);
  [-.17,.17].forEach(a=>C(g,.016,.016,.2,a,.46,-.17,m,8)); B(g,.3,.06,.015,0,.6,-.17,m);
  return g;
}
function table(p,x,y,z,w,d,deco){ const g=grp(p,x,y,z); B(g,w,.04,d,0,.72,0,mat(P.oakLt,.5)); C(g,.035,.035,.7,0,.02,0,mat(P.black,.5,.4),10); C(g,.24,.26,.03,0,0,0,mat(P.black,.5,.4));
  if(deco==='tulip') tulips(g,0,.76,0,.8); else if(deco==='candle'){ C(g,.03,.03,.06,0,.76,0,mat(P.brass,.3,.7)); } return g; }
function longTable(p,x,y,z,w,d,rot){ const g=grp(p,x,y,z,rot||0), m=mat(P.oakLt,.5), lm=mat(P.oak,.55);
  B(g,w,.05,d,0,.71,0,m); [[-w/2+.15,-d/2+.1],[w/2-.15,-d/2+.1],[-w/2+.15,d/2-.1],[w/2-.15,d/2-.1]].forEach(([a,b])=>B(g,.07,.71,.07,a,0,b,lm));
  B(g,w-.3,.06,.06,0,.2,0,lm); [-w/2+.15,w/2-.15].forEach(a=>B(g,.06,.06,d-.2,a,.2,0,lm)); B(g,w-.1,.08,d-.12,0,.63,0,lm); return g; }
function laptop(p,x,y,z,rot){ const g=grp(p,x,y,z,rot), m=mat('#3B3E42',.4,.5); B(g,.32,.015,.22,0,0,0,m); const pv=grp(g,0,.015,-.11); pv.rotation.x=-.28; B(pv,.32,.21,.008,0,0,0,m); const sc=new T.Mesh(new T.PlaneGeometry(.29,.18),new T.MeshStandardMaterial({color:'#1E2A33',emissive:new T.Color('#2C4E63'),emissiveIntensity:.5,roughness:.3})); sc.position.set(0,.105,.005); pv.add(sc); }
function roundTable(p,x,y,z,r,h){ const g=grp(p,x,y,z); C(g,r,r,.04,0,h-.04,0,mat(P.oakLt,.55),28); C(g,.03,.03,h-.05,0,.01,0,mat(P.black,.5,.4),10); C(g,.2,.22,.02,0,0,0,mat(P.black,.5,.4)); return g; }
function sofa(p,x,y,z,rot,w,col,cushion){ const g=grp(p,x,y,z,rot), m=mat(col,.95), dm=mat(P.woodDk,.6);
  [[-w/2+.08,.3],[w/2-.08,.3],[-w/2+.08,-.3],[w/2-.08,-.3]].forEach(([a,b])=>C(g,.025,.02,.1,a,0,b,dm,8));
  B(g,w,.3,.85,0,.1,0,m); B(g,w-.36,.14,.62,0,.4,.09,m); B(g,w,.5,.2,0,.4,-.33,m); B(g,.18,.3,.85,-w/2+.09,.4,0,m); B(g,.18,.3,.85,w/2-.09,.4,0,m);
  const tuft=mat('#98A29B',.9); for(let i=0;i<Math.floor(w/.35);i++) for(let j=0;j<2;j++) S(g,.012,-w/2+.35+i*.35,.58+j*.18,-.225,tuft);
  if(cushion){ const cm=mat(P.pink,.95); const n=Math.max(1,Math.round((w-.4)/.9)); for(let i=0;i<n;i++){ const cx=-(w-.5)/2+(w-.5)*(n===1?.5:i/(n-1)); const c=B(g,.4,.36,.12,cx,.52,-.18,cm); c.rotation.x=-.18; } }
  return g; }
function tulips(p,x,y,z,s){ s=s||1; const g=grp(p,x,y,z); C(g,.045*s,.035*s,.16*s,0,0,0,GLASS2);
  const cols=['#EBB3A6','#F2C9BE','#E7A396','#F5D9C8','#DDB0C0'];
  for(let i=0;i<6;i++){ const a=i*1.05, rr=.03*s, tilt=.2; const st=C(g,.004,.004,.28*s,Math.cos(a)*rr,.05*s,Math.sin(a)*rr,mat('#6E9C63',.7),5); st.rotation.set(Math.sin(a)*tilt,0,-Math.cos(a)*tilt);
    S(g,.034*s,Math.cos(a)*(rr+.05*s),.34*s,Math.sin(a)*(rr+.05*s),mat(cols[i%5],.7),1,.85,1); }
  leaf(g,.04*s,.22*s,0,.03*s); leaf(g,-.04*s,.24*s,.02,.03*s);
  return g; }
function plant(p,x,y,z,s,pot){ s=s||1; C(p,.16*s,.12*s,.28*s,x,y,z,mat(pot||P.white,.7),18);
  for(let i=0;i<16;i++){ const a=Math.random()*6.28, r=Math.random()*.18*s; leaf(p,x+Math.cos(a)*r,y+.3*s+Math.random()*.4*s,z+Math.sin(a)*r,(.08+Math.random()*.05)*s); } }
function tallPlant(p,x,y,z,pot){ C(p,.22,.17,.42,x,y,z,mat(pot||P.white,.7),18); C(p,.02,.02,.7,x,y+.4,z,mat(P.woodDk,.8),6);
  for(let i=0;i<30;i++){ const a=Math.random()*6.28, r=.08+Math.random()*.32, h=y+.7+Math.random()*.9; leaf(p,x+Math.cos(a)*r,h,z+Math.sin(a)*r,.09+Math.random()*.07); } }
function trailing(p,x,y,z,len,rad){ rad=rad||.15; for(let k=0;k<7;k++){ const a=k*.9+Math.random()*.4, n=Math.round(len/.07*(.6+Math.random()*.4)); for(let j=0;j<n;j++) leaf(p,x+Math.cos(a)*(rad+j*.006),y-j*.07,z+Math.sin(a)*(rad+j*.006),.045+Math.random()*.02); } }
function potTrail(p,x,y,z,pot,len){ C(p,.13,.1,.2,x,y,z,mat(pot||P.white,.7),16); for(let i=0;i<8;i++){ const a=Math.random()*6.28; leaf(p,x+Math.cos(a)*.08,y+.22+Math.random()*.1,z+Math.sin(a)*.08,.07); } trailing(p,x,y+.18,z,len||.7,.13); }
function hanger(p,x,yc,z,pot,drop,len){ drop=drop||.8; const m=mat('#C9B79C',.9); for(let k=0;k<3;k++){ const a=k*2.09; const r=C(p,.004,.004,drop,x+Math.cos(a)*.07,yc-drop,z+Math.sin(a)*.07,m,4); r.rotation.set(Math.sin(a)*.08,0,-Math.cos(a)*.08); }
  C(p,.004,.004,.1,x,yc-.1,z,m,4); const py=yc-drop-.18; C(p,.15,.11,.22,x,py,z,mat(pot||P.white,.7),16); for(let i=0;i<12;i++){ const a=Math.random()*6.28; leaf(p,x+Math.cos(a)*.11,py+.24+Math.random()*.08,z+Math.sin(a)*.11,.075); } trailing(p,x,py+.2,z,len||.9,.15); }
function pendant(p,x,yc,z,drop,col,light,style){
  C(p,.006,.006,drop,x,yc-drop,z,mat(P.black,.6),6);
  const bulb=new T.MeshStandardMaterial({color:'#FFFDF6',emissive:new T.Color('#FFE9C4'),emissiveIntensity:.55,roughness:.4}); bulbMats.push(bulb);
  if(style==='globe'){
    C(p,.045,.06,.08,x,yc-drop-.08,z,mat(P.brass,.3,.8),16);
    const gl=new T.Mesh(new T.SphereGeometry(.14,24,16),bulb); gl.scale.set(1,1.1,1); gl.position.set(x,yc-drop-.22,z); p.add(gl);
  } else {
    const pts=[]; for(let i=0;i<=12;i++){ const t=i/12; pts.push(new T.Vector2(.02+.2*Math.sin(t*Math.PI/2),-.2*(1-Math.cos(t*Math.PI/2))-.04)); }
    const sh=new T.Mesh(new T.LatheGeometry(pts,28),new T.MeshStandardMaterial({color:col,roughness:.5,side:T.DoubleSide})); sh.position.set(x,yc-drop,z); p.add(sh);
    const b=new T.Mesh(new T.SphereGeometry(.05,12,10),bulb); b.position.set(x,yc-drop-.2,z); p.add(b);
  }
  if(light){ const L=new T.PointLight('#FFE0BA',.5,7.5,1.6); L.position.set(x,yc-drop-.35,z); p.add(L); pendLights.push(L); }
}
function sconce(p,x,y,z,ry){ const g=grp(p,x,y,z,ry); C(g,.05,.05,.02,0,0,0,mat(P.brass,.3,.8)).rotation.x=Math.PI/2; B(g,.02,.02,.16,0,-.01,.08,mat(P.brass,.3,.8));
  const bm=new T.MeshStandardMaterial({color:'#FFFDF6',emissive:new T.Color('#FFE9C4'),emissiveIntensity:.55}); bulbMats.push(bm); const gl=new T.Mesh(new T.SphereGeometry(.07,16,12),bm); gl.position.set(0,.06,.17); g.add(gl); }
function shelfUnit(p,x,y,z,rot,w,h,d,levels,frame,fill){
  const g=grp(p,x,y,z,rot), fm=mat(frame||P.oakLt,.65);
  B(g,.03,h,d,-w/2+.015,0,0,fm); B(g,.03,h,d,w/2-.015,0,0,fm);
  const gap=(h-.03)/levels, crafts=[P.pink,P.peach,P.pale,P.coral,P.teal,P.sage,'#F6EFE3','#7E9CB6','#D4867A','#E7D38C'];
  for(let i=0;i<=levels;i++) B(g,w,.03,d,0,i*gap,0,fm);
  for(let i=0;i<levels;i++){ const base=i*gap+.03; let cx=-w/2+.05;
    while(cx<w/2-.1){ const r=Math.random();
      if(r<.1&&cx<w/2-.3){ C(g,.06,.05,.1,cx+.08,base,0,mat([P.white,P.pale,P.blush][(Math.random()*3)|0],.7),12); for(let k=0;k<6;k++) leaf(g,cx+.08+(Math.random()-.5)*.1,base+.13+Math.random()*.08,(Math.random()-.5)*.1,.05); cx+=.22; }
      else if(r<.32){ // glass jars with colored contents
        const jh=.12+Math.random()*.08; C(g,.045,.045,jh,cx+.05,base,0,GLASS2,12); inst(g,'box',cx+.05,base+jh*.35,0,.06,jh*.65,.06,crafts[(Math.random()*crafts.length)|0]); C(g,.047,.047,.02,cx+.05,base+jh,0,mat(P.oak,.6),12); cx+=.12; }
      else if(r<.44){ // paper stacks
        for(let k=0;k<6;k++) inst(g,'box',cx+.12,base+.006+k*.012,0,.22,.01,d*.7,k%3?'#FBF8F2':crafts[(Math.random()*crafts.length)|0]); cx+=.26; }
      else if(r<.56){ // pencil / brush cups
        C(g,.035,.03,.1,cx+.04,base,0,mat(crafts[(Math.random()*crafts.length)|0],.6),10); for(let k=0;k<6;k++) inst(g,'box',cx+.04+(Math.random()-.5)*.04,base+.12,(Math.random()-.5)*.04,.008,.16,.008,crafts[(Math.random()*crafts.length)|0]); cx+=.1; }
      else if(r<.62){ cx+=.07; }
      else if(fill==='craft'){ const bw=.14+Math.random()*.1, bh=Math.min(gap-.08,.1+Math.random()*.12); inst(g,'box',cx+bw/2,base+bh/2,0,bw,bh,d*.75,crafts[(Math.random()*crafts.length)|0]); cx+=bw+.02; }
      else { const bw=.022+Math.random()*.03, bh=Math.min(gap-.06,.16+Math.random()*.1); inst(g,'box',cx+bw/2,base+bh/2,0,bw,bh,d*.72,crafts[(Math.random()*crafts.length)|0]); cx+=bw+.004; }
    }
  }
  return g;
}
function board(p,w,h,x,y,z,ry,tex,frameCol){ const g=grp(p,x,y,z,ry); B(g,w+.08,h+.08,.03,0,-.04,0,mat(frameCol||P.oak,.6)); const pl=new T.Mesh(new T.PlaneGeometry(w,h),new T.MeshStandardMaterial({map:tex,roughness:.85})); pl.position.set(0,h/2-.04,.017); g.add(pl); return g; }
function mug(p,x,y,z,col){ C(p,.035,.03,.08,x,y,z,mat(col,.4),12); const h=new T.Mesh(new T.TorusGeometry(.022,.006,6,12),mat(col,.4)); h.position.set(x+.04,y+.045,z); p.add(h); }
function jar(p,x,y,z,col,h){ h=h||.16; C(p,.05,.05,h,x,y,z,GLASS2,14); C(p,.043,.043,h*.6,x,y+.005,z,mat(col,.8),12); C(p,.052,.052,.025,x,y+h,z,mat(P.oak,.6),14); }
function door(p,x,y,z,w,h,col,ry){ const g=grp(p,x,y,z,ry||0), m=mat(col,.55), t=.05;
  B(g,.09,h,t,-w/2+.045,0,0,m); B(g,.09,h,t,w/2-.045,0,0,m); B(g,w,.5,t,0,0,0,m); B(g,w,.1,t,0,h-.1,0,m);
  B(g,w-.18,h-.6,.02,0,.5,0,GLASS2,true); B(g,.03,h-.6,t,0,.5,0,m);
  for(let j=1;j<3;j++) B(g,w-.18,.03,t,0,.5+(h-.6)*j/3,0,m);
  frameRect(g,'x',.03,-w/2+.14,w/2-.14,.1,.42,mat(P.tealDk,.55));
  C(g,.012,.012,.3,w/2-.14,1.0,.05,mat(P.brass,.3,.8),8);
  return g; }

/* ---------- cars: lofted bodies with wheel arches, tumblehome and reflections (no badges) ---------- */
let CAR_ENV=null; const carGroups=[];
function carEnv(){ if(CAR_ENV!==null) return CAR_ENV; try{ if(T.RoomEnvironment){ const pm=new T.PMREMGenerator(renderer); CAR_ENV=pm.fromScene(new T.RoomEnvironment(),.04).texture; } else CAR_ENV=undefined; }catch(e){ CAR_ENV=undefined; } return CAR_ENV; }
const CARS={
  gclass:{matte:true,doors:[.78,-.5,-1.5,-2.38],bulge:.0,L:4.86,r:.41,axles:[1.44,-1.44],n:9,tumble:.04,roofSin:.72,cladding:true,
    top:[[-2.43,.98],[-2.41,1.9],[-2.3,1.95],[.62,1.95],[.72,1.9],[.86,1.2],[2.3,1.14],[2.43,1.0]],
    bot:[[-2.43,.58],[-2.25,.34],[2.25,.34],[2.43,.55]], hw:[[-2.43,.9],[-2.33,.98],[2.33,.98],[2.43,.9]],
    belt:[[-2.43,1.14],[2.43,1.14]], glass:[-2.42,.86], roof:[-2.3,.66]},
  range:{doors:[1.15,-.05,-1.25],L:5.0,r:.42,axles:[1.5,-1.48],n:5,tumble:.13,roofSin:.78,cladding:true,roofCol:'#0C0D0E',
    top:[[-2.5,.9],[-2.47,1.3],[-2.33,1.78],[-2.1,1.84],[.4,1.84],[.6,1.8],[1.2,1.17],[2.25,1.07],[2.5,.86]],
    bot:[[-2.5,.55],[-2.25,.37],[2.25,.37],[2.5,.52]], hw:[[-2.5,.88],[-2.3,1.0],[2.25,1.0],[2.5,.88]],
    belt:[[-2.5,1.12],[1.2,1.1],[2.5,1.04]], glass:[-2.46,1.2], roof:[-2.12,.42]},
  porsche:{doors:[.72,-.62],bulge:.05,L:4.52,r:.35,axles:[1.2,-1.25],n:3,tumble:.34,roofSin:.8,
    top:[[-2.26,.52],[-2.22,.8],[-1.85,.93],[-1.1,1.17],[-.45,1.29],[.05,1.28],[.78,.86],[1.25,.83],[1.95,.73],[2.26,.5]],
    bot:[[-2.26,.33],[-2.0,.15],[2.0,.15],[2.26,.3]], hw:[[-2.26,.74],[-2.0,.9],[-1.3,.93],[-.4,.88],[.9,.88],[1.8,.84],[2.26,.66]],
    belt:[[-2.26,.84],[-1.1,.89],[.78,.84],[2.26,.78]], glass:[-1.85,.8], roof:[-.8,-.02]},
  glc:{doors:[1.0,-.15,-1.22],L:4.72,r:.39,axles:[1.45,-1.44],n:4,tumble:.2,roofSin:.8,
    top:[[-2.36,.74],[-2.33,1.05],[-2.2,1.42],[-1.95,1.6],[-1.6,1.64],[.3,1.64],[.5,1.6],[1.08,1.12],[2.1,.99],[2.36,.72]],
    bot:[[-2.36,.46],[-2.1,.29],[2.1,.29],[2.36,.45]], hw:[[-2.36,.84],[-2.12,.95],[2.08,.95],[2.36,.8]],
    belt:[[-2.36,1.1],[1.08,1.03],[2.36,.96]], glass:[-2.22,1.1], roof:[-1.95,.45]},
  sedan:{doors:[1.25,.02,-1.18],L:5.2,r:.37,axles:[1.56,-1.56],n:3.4,tumble:.24,roofSin:.8,chromeGrille:true,
    top:[[-2.6,.6],[-2.56,.92],[-2.15,1.0],[-1.6,1.06],[-.85,1.46],[.05,1.5],[.55,1.43],[1.28,.98],[2.35,.85],[2.6,.62]],
    bot:[[-2.6,.4],[-2.3,.18],[2.3,.18],[2.6,.38]], hw:[[-2.6,.84],[-2.25,.97],[2.2,.97],[2.6,.82]],
    belt:[[-2.6,.97],[-1.6,1.02],[1.28,.97],[2.6,.9]], glass:[-1.62,1.3], roof:[-.8,.5]}
};
function lerpKeys(k,x){ if(x<=k[0][0]) return k[0][1]; for(let i=1;i<k.length;i++){ if(x<=k[i][0]){ const t=(x-k[i-1][0])/(k[i][0]-k[i-1][0]); return k[i-1][1]+(k[i][1]-k[i-1][1])*t; } } return k[k.length-1][1]; }
function smooth(a,it){ for(let q=0;q<it;q++){ const b=a.slice(); for(let i=1;i<a.length-1;i++) b[i]=(a[i-1]+2*a[i]+a[i+1])/4; a=b; } return a; }
function carBodyGeo(s,cols){
  const NX=150, NT=64, L=s.L, xs=[], top=[], bot=[], hw=[], belt=[];
  for(let i=0;i<=NX;i++){ const x=-L/2+L*i/NX; xs.push(x); top.push(lerpKeys(s.top,x)); bot.push(lerpKeys(s.bot,x)); hw.push(lerpKeys(s.hw,x)); belt.push(lerpKeys(s.belt,x)); }
  const T2=smooth(top,5), H2=smooth(hw,7), B2=smooth(bot,3), BL=smooth(belt,4);
  const R=s.r+.045, bulge=s.bulge===undefined?.028:s.bulge;
  for(let i=0;i<=NX;i++){ s.axles.forEach(ax=>{ const d=xs[i]-ax; H2[i]+=bulge*Math.exp(-(d*d)/(.5*.5)); if(Math.abs(d)<R){ const a=s.r+Math.sqrt(R*R-d*d); if(a>B2[i]) B2[i]=Math.min(a,T2[i]-.12); } }); }
  const e=2/s.n;
  const P3=(i,th)=>{ const y0=B2[i], y1=T2[i], mid=(y0+y1)/2, hh=(y1-y0)/2, cs=Math.cos(th), sn=Math.sin(th);
    let z=H2[i]*Math.sign(cs)*Math.pow(Math.abs(cs),e), y=mid+hh*Math.sign(sn)*Math.pow(Math.abs(sn),e);
    if(y>BL[i]) z*=1-s.tumble*Math.min(1,(y-BL[i])/Math.max(.05,y1-BL[i]));
    return [xs[i],y,z,sn]; };
  const pos=[], cls=[], idx=[[],[],[],[]];
  for(let i=0;i<=NX;i++){ for(let j=0;j<NT;j++){ const [x,y,z,sn]=P3(i,j/NT*Math.PI*2); pos.push(x,y,z);
      let k=0; if(y>BL[i]+.012 && x>s.glass[0] && x<s.glass[1]) k=(sn>s.roofSin && x>s.roof[0] && x<s.roof[1])?2:1; else if(s.cladding && y<B2[i]+.16 && sn<-.2) k=3; cls.push(k); } }
  const qcls=(i,j)=>{ const ii=Math.min(NX,i+1), th=(j+.5)/NT*Math.PI*2; const [x0,y0,,sn]=P3(i,th), [x1,y1]=P3(ii,th); const x=(x0+x1)/2, y=(y0+y1)/2, bl=(BL[i]+BL[ii])/2, bt=(B2[i]+B2[ii])/2;
    if(y>bl+.012 && x>s.glass[0] && x<s.glass[1]) return (sn>s.roofSin && x>s.roof[0] && x<s.roof[1])?2:1; if(s.cladding && y<bt+.16 && sn<-.2) return 3; return 0; };
  for(let i=0;i<NX;i++) for(let j=0;j<NT;j++){ const a=i*NT+j, b=i*NT+(j+1)%NT, c2=(i+1)*NT+j, d=(i+1)*NT+(j+1)%NT; const k=qcls(i,j); idx[k].push(a,c2,b,b,c2,d); }
  [0,NX].forEach((i,k)=>{ const ci=pos.length/3; pos.push(xs[i],(B2[i]+T2[i])/2,0); cls.push(0); for(let j=0;j<NT;j++){ const a=i*NT+j, b=i*NT+(j+1)%NT; if(k===0) idx[0].push(ci,a,b); else idx[0].push(ci,b,a); } });
  const g=new T.BufferGeometry(); g.setAttribute('position',new T.Float32BufferAttribute(pos,3));
  const all=[]; idx.forEach((arr,k)=>{ g.addGroup(all.length,arr.length,k); arr.forEach(v=>all.push(v)); }); g.setIndex(all); g.computeVertexNormals();
  const at=(x)=>{ const i=Math.max(0,Math.min(NX,Math.round((x+L/2)/L*NX))); return {i,top:T2[i],bot:B2[i],hw:H2[i],belt:BL[i]}; };
  // panel seam path at slice x, on side sd, from sill up to the belt
  const seam=(x,sd,yLo,yHi)=>{ const a=at(x), out=[]; for(let q=0;q<=40;q++){ const th=-1.2+2.4*q/40; const [px,py,pz]=P3(a.i,sd>0?th:Math.PI-th); if(py>=(yLo===undefined?a.bot+.1:yLo)&&py<=(yHi===undefined?a.belt-.015:yHi)) out.push(new T.Vector3(px,py,pz*1.003)); } return out; };
  return {geo:g, at, seam, P3};
}
function wheel(p,x,y,z,r,side,rimCol,caliper,spokes,spW){ spokes=spokes||5; spW=spW||.075;
  const g=grp(p,x,y,z), tw=.26, tyre=mat('#151515',.85), sd=side;
  const t=new T.Mesh(new T.CylinderGeometry(r-.03,r-.03,tw,40),tyre); t.rotation.x=Math.PI/2; t.castShadow=true; g.add(t);
  [-1,1].forEach(q=>{ const sh=new T.Mesh(new T.TorusGeometry(r-.06,.045,10,40),tyre); sh.position.z=q*(tw/2-.03); g.add(sh); });
  const rimM=new T.MeshStandardMaterial({color:rimCol,roughness:.25,metalness:.9,envMap:carEnv()});
  const face=new T.Mesh(new T.CylinderGeometry(r*.66,r*.66,.02,32),mat('#2A2C2F',.4,.6)); face.rotation.x=Math.PI/2; face.position.z=sd*(tw/2-.035); g.add(face);
  const lip=new T.Mesh(new T.TorusGeometry(r*.66,.018,8,36),rimM); lip.position.z=sd*(tw/2-.02); g.add(lip);
  for(let k=0;k<spokes;k++){ const a=k*Math.PI*2/spokes; const sp=new T.Mesh(new T.BoxGeometry(spW,r*.6,.03),rimM); sp.position.set(Math.cos(a)*r*.31,Math.sin(a)*r*.31,sd*(tw/2-.02)); sp.rotation.z=a-Math.PI/2; g.add(sp); }
  const hub=new T.Mesh(new T.CylinderGeometry(.06,.06,.04,20),rimM); hub.rotation.x=Math.PI/2; hub.position.z=sd*(tw/2-.01); g.add(hub);
  const disc=new T.Mesh(new T.CylinderGeometry(r*.5,r*.5,.02,28),mat('#6D7074',.4,.8)); disc.rotation.x=Math.PI/2; disc.position.z=sd*(tw/2-.07); g.add(disc);
  if(caliper){ const cl=new T.Mesh(new T.BoxGeometry(.1,.16,.05),mat(caliper,.4,.2)); cl.position.set(-r*.36,r*.12,sd*(tw/2-.06)); g.add(cl); }
  return g;
}
function lamp(p,w,h,d,x,y,z,col,em){ const m=new T.MeshStandardMaterial({color:col,roughness:.15,metalness:.3,emissive:new T.Color(em||col),emissiveIntensity:em?.9:.25}); const o=new T.Mesh(new T.BoxGeometry(w,h,d),m); o.position.set(x,y,z); p.add(o); return o; }
function car(p,x,y,z,rot,type,colHex){
  const s=CARS[type], g=grp(p,x,y,z,rot), L=s.L, env=carEnv();
  const body=carBodyGeo(s,{paint:colHex,roof:s.roofCol});
  const lum=new T.Color(colHex).getHSL({}).l, dark=lum<.12;
  const bm=s.matte?new T.MeshPhysicalMaterial({color:colHex,roughness:.62,metalness:.08,clearcoat:0,envMap:env,envMapIntensity:.3}):new T.MeshPhysicalMaterial({color:colHex,roughness:dark?.3:.22,metalness:dark?.12:.4,clearcoat:1,clearcoatRoughness:.03,envMap:env,envMapIntensity:dark?.4:.95});
  const gm=new T.MeshPhysicalMaterial({color:'#0A0F13',roughness:.03,metalness:.2,clearcoat:1,clearcoatRoughness:0,envMap:env,envMapIntensity:1.25,reflectivity:1});
  const rm2=new T.MeshPhysicalMaterial({color:s.roofCol||colHex,roughness:.25,metalness:.2,clearcoat:1,envMap:env,envMapIntensity:.45});
  const cl=new T.MeshStandardMaterial({color:'#17181A',roughness:.7,metalness:.1});
  const mesh=new T.Mesh(body.geo,[bm,gm,rm2,cl]); mesh.castShadow=true; mesh.receiveShadow=true; g.add(mesh);
  // panel seams: doors, bonnet line, fuel flap
  const seamM=new T.MeshBasicMaterial({color:'#050505'});
  const doorX=(s.doors||[]); [-1,1].forEach(sd=>doorX.forEach(dx=>{ const pts=body.seam(dx,sd); if(pts.length>3){ g.add(new T.Mesh(new T.TubeGeometry(new T.CatmullRomCurve3(pts),24,.0045,4,false),seamM)); } }));
  const chrome=new T.MeshStandardMaterial({color:'#D9DDE0',roughness:.12,metalness:1,envMap:env}), black=mat('#101112',.45,.2);
  // underbody & arch liners
  const ua=body.at(0); B(g,L*.72,.18,ua.hw*1.7,0,Math.max(.12,s.bot[1][1]-.02),0,black,true);
  s.axles.forEach(ax=>{ const a=body.at(ax); const ln=new T.Mesh(new T.CylinderGeometry(s.r+.05,s.r+.05,a.hw*2-.08,24,1,true,Math.PI/2,Math.PI),new T.MeshStandardMaterial({color:'#0B0B0B',roughness:.9,side:T.DoubleSide})); ln.rotation.x=Math.PI/2; ln.position.set(ax,s.r,0); g.add(ln);
    const WS={gclass:['#1C1D1F','#C1272D',10,.04],porsche:['#55595E',null,10,.03],glc:['#1A1B1D',null,16,.022],range:['#B9BEC3',null,5,.075],sedan:['#B9BEC3',null,5,.075]}[type];
    [-1,1].forEach(sd=>g.add(wheel(g,ax,s.r,sd*(a.hw-.16),s.r,sd,WS[0],WS[1],WS[2],WS[3]))); });
  // window trim along belt
  const pts=[]; for(let q=0;q<=24;q++){ const xx=s.glass[0]+.06+(s.glass[1]-s.glass[0]-.12)*q/24; const a=body.at(xx); pts.push(xx,a.belt+.01); }
  [-1,1].forEach(sd=>{ const arr=[]; for(let q=0;q<pts.length;q+=2){ const a=body.at(pts[q]); arr.push(new T.Vector3(pts[q],pts[q+1],sd*(a.hw*(1-.005)+.004))); } const tb=new T.Mesh(new T.TubeGeometry(new T.CatmullRomCurve3(arr),40,.012,6,false),(type==='sedan'||type==='glc')?chrome:black); g.add(tb); });
  // front & rear details
  const fx=L/2, rx=-L/2, af=body.at(fx-.06), ar=body.at(rx+.06);
  const white='#F4F2EA', warm='#FFF4DE', red='#7E1014', redE='#6A0A0E';
  if(type==='gclass'){
    [-1,1].forEach(sd=>{ const hl=new T.Mesh(new T.CylinderGeometry(.11,.11,.06,24),new T.MeshStandardMaterial({color:white,emissive:new T.Color(warm),emissiveIntensity:.35,roughness:.1})); hl.rotation.z=Math.PI/2; hl.position.set(fx+.01,.92,sd*.7); g.add(hl);
      const rg=new T.Mesh(new T.TorusGeometry(.11,.015,8,24),chrome); rg.rotation.y=Math.PI/2; rg.position.set(fx+.04,.92,sd*.7); g.add(rg);
      lamp(g,.04,.05,.14,fx+.01,.8,sd*.5,'#E8A33A');
      const fl=B(g,1.15,.12,.1,s.axles[0],.72,sd*(af.hw+.02),black); B(g,1.15,.12,.1,s.axles[1],.72,sd*(ar.hw+.02),black);
      B(g,2.3,.05,.18,0,.42,sd*(ua.hw-.02),black); // side step
      lamp(g,.04,.22,.1,rx-.01,.95,sd*.84,red,redE); });
    B(g,.06,.34,1.0,fx,.84,0,black); for(let k=0;k<3;k++) B(g,.065,.02,.92,fx+.005,.92+k*.08,0,chrome);
    B(g,.14,.18,1.6,fx+.05,.48,0,black); B(g,.14,.16,1.6,rx-.05,.5,0,black);
    const sp=new T.Mesh(new T.CylinderGeometry(.38,.38,.24,32),mat('#151515',.8)); sp.rotation.z=Math.PI/2; sp.position.set(rx-.16,1.12,0); g.add(sp);
    const spc=new T.Mesh(new T.CylinderGeometry(.34,.34,.25,32),bm.clone()); spc.material=new T.MeshPhysicalMaterial({color:colHex,roughness:.3,metalness:.1,clearcoat:1,envMap:env,envMapIntensity:.32}); spc.rotation.z=Math.PI/2; spc.position.set(rx-.17,1.12,0); g.add(spc);
    [-.52,.42].forEach(px=>{ [-1,1].forEach(sd=>B(g,.07,.7,.02,px,1.16,sd*(body.at(px).hw*.97),black)); });
    B(g,2.6,.04,.06,-.85,1.97,.62,black); B(g,2.6,.04,.06,-.85,1.97,-.62,black);
  } else if(type==='range'){
    [-1,1].forEach(sd=>{ lamp(g,.05,.07,.5,fx-.02,.93,sd*.6,white,warm); lamp(g,.05,.03,.5,fx-.01,.88,sd*.6,'#DDE3E6'); lamp(g,.05,.06,.38,rx+.02,1.0,sd*.7,red,redE); });
    B(g,.06,.2,.8,fx-.02,.72,0,black); for(let k=0;k<4;k++) B(g,.065,.012,.76,fx-.015,.76+k*.04,0,mat('#3A3C3F',.3,.8));
    B(g,.1,.12,1.7,fx+.01,.42,0,black); B(g,.1,.12,1.7,rx-.01,.44,0,black);
    lamp(g,.05,.05,1.2,rx+.01,1.0,0,'#2B0C0D');
  } else if(type==='porsche'){
    [-1,1].forEach(sd=>{ const hl=new T.Mesh(new T.SphereGeometry(.11,20,14),new T.MeshStandardMaterial({color:white,emissive:new T.Color(warm),emissiveIntensity:.35,roughness:.08,metalness:.2})); hl.scale.set(1,.7,.85); hl.position.set(1.95,.69,sd*.6); g.add(hl);
      lamp(g,.03,.05,.3,fx-.05,.44,sd*.55,'#1A1A1A'); });
    lamp(g,.04,.04,1.35,rx+.05,.8,0,red,redE);
    B(g,.05,.03,1.1,rx+.02,.9,0,black);
    B(g,.1,.08,1.3,fx-.02,.3,0,black); B(g,.1,.1,1.2,rx+.02,.33,0,black);
    [-1,1].forEach(sd=>{ const ex=C(g,.04,.04,.1,rx+.02,.3,sd*.35,chrome,14); ex.rotation.z=Math.PI/2; ex.position.set(rx-.02,.34,sd*.35); });
  } else {
    [-1,1].forEach(sd=>{ lamp(g,.05,.06,.42,fx-.08,.76,sd*.6,white,warm); lamp(g,.05,.07,.45,rx+.06,.86,sd*.62,red,redE); });
    B(g,.05,.3,.62,fx-.01,.5,0,black); for(let k=0;k<5;k++) B(g,.055,.012,.6,fx,.52+k*.055,0,chrome);
    const gf=new T.Mesh(new T.BoxGeometry(.04,.34,.66),chrome); gf.position.set(fx-.015,.66,0); gf.scale.set(1,1,1); g.add(gf); B(g,.05,.3,.62,fx+.01,.5,0,black);
    B(g,.04,.02,1.4,rx+.02,.8,0,chrome);
    if(type==='glc'){ lamp(g,.04,.035,1.45,rx+.03,1.0,0,red,redE); B(g,.06,.05,1.45,rx+.02,.56,0,chrome); [-1,1].forEach(sd=>{ B(g,.05,.08,.26,rx+.01,.48,sd*.55,chrome); B(g,.06,.05,.2,rx+.005,.495,sd*.55,black); const rr=body.at(-.5); B(g,1.8,.035,.035,-.5,rr.top-.03,sd*(rr.hw*(1-s.tumble)-.06),chrome); B(g,2.9,.03,.02,-.05,.42,sd*(body.at(0).hw-.01),chrome); }); }
    if(type!=='glc') [-1,1].forEach(sd=>{ const ex=C(g,.03,.03,.1,0,0,0,chrome,14); ex.rotation.z=Math.PI/2; ex.position.set(rx-.02,.3,sd*.55); });
  }
  // number plates (blank), mirrors, door handles
  B(g,.02,.12,.5,fx+.03,type==='porsche'?.38:.52,0,mat('#F5F5F2',.5)); B(g,.02,.12,.5,rx-.03,type==='porsche'?.55:.72,0,mat('#F5F5F2',.5));
  const wx=s.glass[1]-.12, wb=body.at(wx);
  [-1,1].forEach(sd=>{ const m=new T.Mesh(new T.SphereGeometry(.09,14,10),bm); m.scale.set(1.2,.8,.75); m.position.set(wx,wb.belt+.1,sd*(wb.hw+.07)); m.castShadow=true; g.add(m);
    const nd=type==='porsche'?[-.35]:[-.35,.6]; nd.forEach(hx=>{ const a=body.at(hx); B(g,.14,.025,.02,hx,a.belt-.12,sd*(a.hw-.005),chrome,true); }); });
  // soft contact shadow
  const sh=new T.Mesh(new T.PlaneGeometry(L*1.05,ua.hw*2.3),new T.MeshBasicMaterial({color:'#000',transparent:true,opacity:.25,depthWrite:false})); sh.rotation.x=-Math.PI/2; sh.position.y=.01; g.add(sh);
  return g;
}
function paintText(txt,w,h,x,z,ry,size){ const t=ctex(512,128,(g,W,H)=>{ g.clearRect(0,0,W,H); g.fillStyle='#F2F1EC'; g.textAlign='center'; g.font='700 '+(size||96)+'px '+AR; g.fillText(txt,W/2,H*.78); }); const m=new T.Mesh(new T.PlaneGeometry(w,h),new T.MeshStandardMaterial({map:t,transparent:true,roughness:.7,depthWrite:false})); m.rotation.set(-Math.PI/2,0,ry||0); m.position.set(x,-.238,z); SITE.add(m); return m; }
function buildOutside(){
  const Y=-.245, asph=mat('#55595D',.92), paintW=mat('#F2F1EC',.7), yel=mat('#E8C35A',.7), curb=mat('#CFC9BF',.9), grass=mat('#8DB07A',.95), tealDk=mat(P.tealDk,.6), tealM=mat(P.teal,.6);
  const flatP=(w,d,x,z,m,y,rz)=>{ const o=new T.Mesh(new T.PlaneGeometry(w,d),m); o.rotation.set(-Math.PI/2,0,rz||0); o.position.set(x,y===undefined?Y:y,z); o.receiveShadow=true; SITE.add(o); return o; };
  const arrow=(x,z,dir)=>{ const s=new T.Shape([new T.Vector2(-.3,0),new T.Vector2(.3,0),new T.Vector2(.3,.7),new T.Vector2(.62,.7),new T.Vector2(0,1.35),new T.Vector2(-.62,.7),new T.Vector2(-.3,.7)]); const a=new T.Mesh(new T.ShapeGeometry(s),paintW); a.rotation.set(-Math.PI/2,0,dir); a.position.set(x,Y+.006,z); SITE.add(a); };
  /* ---- drive-thru: ENTER lane (outer, toward the back) → U-turn → service lane (inner) → EXIT ---- */
  // asphalt: entry lane, service lane, U-turn bay
  flatP(3.2,19.5,-12.4,-2.75,asph); flatP(3.4,19.5,-8.3,-2.75,asph); flatP(7.6,3.6,-10.3,-14.3,asph);
  const u=new T.Mesh(new T.CircleGeometry(3.8,40,0,Math.PI),asph); u.rotation.x=-Math.PI/2; u.position.set(-10.3,Y,-16.1); u.receiveShadow=true; SITE.add(u);
  // island between lanes (planted), rounded end
  B(SITE,.9,.18,18.6,-10.35,Y,-3.2,curb); flatP(.7,18.4,-10.35,-3.2,grass,Y+.185);
  const cap=C(SITE,.45,.45,.18,-10.35,Y,-12.5,curb,24); const capg=new T.Mesh(new T.CircleGeometry(.36,24),grass); capg.rotation.x=-Math.PI/2; capg.position.set(-10.35,Y+.186,-12.5); SITE.add(capg);
  for(let z=-11.5;z<5.5;z+=1.6){ for(let k=0;k<5;k++) leaf(SITE,-10.35+(Math.random()-.5)*.4,Y+.3+Math.random()*.25,z+(Math.random()-.5)*.8,.16+Math.random()*.08); }
  // outer & building-side curbs
  B(SITE,.2,.15,23.3,-14.1,Y,-4.65,curb); B(SITE,.2,.15,11.6,-6.5,Y,-6.9,curb);
  const oc=new T.Mesh(new T.TorusGeometry(3.9,.1,6,40,Math.PI),curb); oc.rotation.x=-Math.PI/2; oc.position.set(-10.3,Y+.07,-16.1); oc.rotation.z=0; SITE.add(oc);
  // lane edge lines
  [-13.85,-10.95,-9.75,-6.7].forEach(x=>flatP(.1,18.5,x,-3.25,paintW,Y+.004));
  // arrows: entry points to the back (-z), service lane toward the street (+z)
  [3.5,-2.5,-8.5].forEach(z=>arrow(-12.4,z,Math.PI*0)); // shape tip +y → after rotation points -z
  [-9.5,-3.4,3.2].forEach(z=>arrow(-8.3,z,Math.PI));
  arrow(-12.4,-14.2,0); arrow(-11.0,-17.4,-Math.PI/2); arrow(-8.3,-14.6,Math.PI);
  // painted words
  paintText('ENTER',2.6,.65,-12.4,5.3,Math.PI);
  paintText('EXIT',2.6,.65,-8.3,5.3,0);
  paintText('ORDER HERE',2.8,.55,-8.3,-6.6,0,78);
  paintText('PICK-UP',2.6,.6,-8.3,-3.9,0,90);
  flatP(3.2,.18,-8.3,-5.9,paintW,Y+.005); flatP(3.2,.18,-8.3,.35,paintW,Y+.005);
  // street crossing: dashed give-way at exit, dropped kerbs
  for(let x=-9.8;x<-6.8;x+=.5) flatP(.3,.12,x,6.75,paintW,Y+.005);
  // entry & exit pole signs at the street
  const pole=(x,z,tex,ry)=>{ const g=grp(SITE,x,Y,z,ry); C(g,.05,.05,2.4,0,0,0,mat(P.black,.4,.5),10); B(g,.9,.5,.05,0,2.1,0,tealM); const f=new T.Mesh(new T.PlaneGeometry(.82,.42),new T.MeshStandardMaterial({map:tex})); f.position.set(0,2.35,.03); g.add(f); const b=f.clone(); b.rotation.y=Math.PI; b.position.z=-.03; g.add(b); };
  pole(-14.4,6.5,TX.enterSign,0); pole(-6.3,6.3,TX.exitSign,0);
  // clearance bar at the start of the service lane (after the U-turn)
  [-10.1,-6.5].forEach(x=>C(SITE,.06,.06,2.9,x,Y,-11.8,mat(P.black,.4,.4),12)); B(SITE,3.8,.25,.12,-8.3,Y+2.7,-11.8,tealM);
  const dt=new T.Mesh(new T.PlaneGeometry(2.6,.22),new T.MeshStandardMaterial({map:TX.dtsign,roughness:.7})); dt.position.set(-8.3,Y+2.82,-11.735); dt.rotation.y=Math.PI; dt.position.z=-11.865; SITE.add(dt);
  const dtf=dt.clone(); dtf.rotation.y=0; dtf.position.z=-11.735; SITE.add(dtf);
  // order point on the island: menu board + speaker facing the service lane
  const mb=grp(SITE,-10.4,Y+.18,-7.0,Math.PI/2); [-.7,.7].forEach(x=>B(mb,.08,1.0,.08,x,0,0,mat(P.black,.4,.4))); B(mb,1.7,1.25,.12,0,.9,0,tealDk);
  const mp=new T.Mesh(new T.PlaneGeometry(1.55,1.1),new T.MeshStandardMaterial({map:TX.dtmenu,roughness:.6,emissive:new T.Color('#222'),emissiveIntensity:.2})); mp.position.set(0,1.52,.065); mb.add(mp);
  const spk=grp(SITE,-10.2,Y+.18,-6.0,Math.PI/2); C(spk,.05,.05,.95,0,0,0,mat(P.black,.4,.4),10); B(spk,.3,.45,.15,0,.9,0,tealM); C(spk,.08,.08,.02,0,1.05,.08,mat('#333',.6),14).rotation.x=Math.PI/2;
  tallPlant(SITE,-14.8,Y,-9.5,P.white); tallPlant(SITE,-14.8,Y,0,P.white);
  // pickup window: canopy, frame, ledge, sign (left façade)
  const pw=SITE;
  B(pw,2.8,.14,2.4,-7.4,2.62,-.8,tealM); B(pw,2.8,.06,.06,-7.4,2.56,.4,tealDk); B(pw,2.8,.06,.06,-7.4,2.56,-2.0,tealDk);
  for(let k=0;k<2;k++){ const rod=C(pw,.012,.012,2.7,0,0,0,mat(P.black,.4,.6),6); rod.rotation.z=-(Math.PI/2-.5); rod.position.set(-7.4,3.3,k?-1.9:.3); }
  B(pw,.3,.05,1.2,-6.35,.92,-.8,mat(P.oakLt,.5)); frameRect(pw,'z',-6.25,-1.38,-.22,.9,2.12,tealDk); frameRect(pw,'z',-6.27,-1.34,-.26,.94,2.08,tealDk);
  const ps=new T.Mesh(new T.PlaneGeometry(1.2,.24),new T.MeshStandardMaterial({map:TX.pickup,roughness:.7})); ps.rotation.y=-Math.PI/2; ps.position.set(-6.24,2.28,-.8); pw.add(ps);
  B(G0,.35,.04,1.1,-5.82,.92,-.8,mat(P.oakLt,.5));
  // a customer car waiting at the pickup window
  car(SITE,-8.3,Y,-2.2,-Math.PI/2,'range','#E9E7E2');
  /* ---- parking lot (right side) ---- */
  flatP(10,14.2,11.6,-.1,asph);
  B(SITE,.2,.15,14.2,16.6,Y,-.1,curb); B(SITE,10.2,.15,.2,11.6,Y,-7.2,curb); B(SITE,.2,.15,14.2,6.55,Y,-.1,curb);
  const bays=[-5.2,-2.6,0,2.6,5.2];
  [-6.5,-3.9,-1.3,1.3,3.9,6.5].forEach(z=>flatP(5.2,.1,9.8,z,paintW,Y+.004));
  flatP(.1,13,12.4,0,paintW,Y+.004);
  bays.forEach(z=>B(SITE,.16,.12,1.4,7.35,Y,z,curb));
  flatP(1.4,1.4,9.8,5.2,mat(P.pale,.8),Y+.005);
  paintText('IN',1.6,.6,14.5,6.0,Math.PI); arrow(14.5,4.2,0); paintText('OUT',1.6,.6,13.2,6.0,0); arrow(13.2,3.5,Math.PI);
  carGroups.push({g:car(SITE,9.8,Y,-5.2,Math.PI,'gclass','#111213'),n:19});
  carGroups.push({g:car(SITE,9.75,Y,-2.6,Math.PI,'range','#3B3F43'),n:20});
  carGroups.push({g:car(SITE,9.6,Y,0,Math.PI,'porsche','#71767B'),n:21});
  carGroups.push({g:car(SITE,9.75,Y,2.6,Math.PI,'glc','#0C0D0F'),n:22});
  [[16.2,-4.5],[16.2,3.5]].forEach(([x,z])=>{ C(SITE,.07,.09,5,x,Y,z,mat(P.black,.4,.5),12); B(SITE,.9,.08,.3,x-.4,Y+4.9,z,mat(P.black,.4,.5)); B(SITE,.7,.02,.2,x-.45,Y+4.88,z,mat('#FFF7E6',.3,0,{emissive:new T.Color('#FFF1D0'),emissiveIntensity:.6})); });
  const psg=grp(SITE,15.9,Y,6.4,-Math.PI/2); C(psg,.04,.04,2.2,0,0,0,mat(P.black,.4,.5),8); B(psg,.6,.6,.04,0,1.9,0,tealM); const pl=new T.Mesh(new T.PlaneGeometry(.5,.5),new T.MeshStandardMaterial({map:TX.psign})); pl.position.set(0,2.2,.025); psg.add(pl);
  [[17.4,-6],[17.4,0]].forEach(([x,z])=>{ C(SITE,.12,.16,1.6,x,Y,z,mat('#7A5A3E',.9),10); for(let i=0;i<40;i++){ const a=Math.random()*6.28, r=Math.random()*1.0; leaf(SITE,x+Math.cos(a)*r,Y+1.8+Math.random()*1.3,z+Math.sin(a)*r,.22+Math.random()*.12); } });
}

function easel(p,x,y,z,ry){ const g=grp(p,x,y,z,ry), m=mat(P.oak,.6); const l1=B(g,.04,1.7,.04,-.25,0,0,m); l1.rotation.z=-.12; const l2=B(g,.04,1.7,.04,.25,0,0,m); l2.rotation.z=.12; const l3=B(g,.04,1.6,.04,0,0,-.35,m); l3.rotation.x=-.25;
  B(g,.6,.03,.08,0,.75,.04,m); const cv=new T.Mesh(new T.BoxGeometry(.55,.7,.025),[mat('#F7F2E9'),mat('#F7F2E9'),mat('#F7F2E9'),mat('#F7F2E9'),new T.MeshStandardMaterial({map:TX.art2,roughness:.9}),mat('#F7F2E9')]); cv.position.set(0,1.12,.05); cv.rotation.x=-.08; cv.castShadow=true; g.add(cv); }

/* ---------- floors & slabs ---------- */
function floorShape(hole){ const s=new T.Shape(); s.moveTo(-6,-3.5); s.lineTo(6,-3.5); s.lineTo(6,3.5); s.lineTo(-6,3.5); s.closePath();
  if(hole){ const h=new T.Path(); h.moveTo(hole[0],-hole[3]); h.lineTo(hole[1],-hole[3]); h.lineTo(hole[1],-hole[2]); h.lineTo(hole[0],-hole[2]); h.closePath(); s.holes.push(h); } return s; }
const HOLE=[1.1,5.4,-3.5,-2.3];
function strip(p,len,x,z,ry){ const m=new T.Mesh(new T.PlaneGeometry(len,.2),new T.MeshStandardMaterial({map:rep(TX.key,len/1.2,1),roughness:.6})); m.rotation.set(-Math.PI/2,0,ry||0); m.position.set(x,.005,z); m.receiveShadow=true; p.add(m); }

function build(){
  makeTextures();
  const tealM=mat(P.teal,.6), tealDk=mat(P.tealDk,.6), creamM=mat(P.cream,.92), moul=mat('#E6DDCD',.8);
  /* site */
  const ground=new T.Mesh(new T.PlaneGeometry(60,60),mat('#D8D2C8',.95)); ground.rotation.x=-Math.PI/2; ground.position.y=-.26; ground.receiveShadow=true; SITE.add(ground);
  const walk=new T.Mesh(new T.PlaneGeometry(12.8,3.2),mat('#E6E1D8',.9)); walk.rotation.x=-Math.PI/2; walk.position.set(0,-.05,5.3); walk.receiveShadow=true; SITE.add(walk);
  B(SITE,12.8,.04,.2,0,-.1,6.9,mat('#BDB6AA',.9));
  const road=new T.Mesh(new T.PlaneGeometry(60,6),mat('#9FA3A6',.95)); road.rotation.x=-Math.PI/2; road.position.set(0,-.25,10); road.receiveShadow=true; SITE.add(road);
  B(SITE,12.8,.25,7.8,0,-.25,0,mat('#CFC8BD',.9));
  [[-4.6,4.1],[-.2,4.1]].forEach(([x,z])=>{ B(SITE,1.2,.4,.4,x,-.05,z,tealDk); for(let i=0;i<5;i++) tulips(SITE,x-.45+i*.22,.33,z,1.1); });
  const aframe=grp(SITE,4.2,-.05,4.5,-.4); const bf=board(aframe,.5,.75,0,.12,.14,0,TX.welcome,P.oak); bf.rotation.x=-.2; const bb=grp(aframe,0,.12,-.14,Math.PI); B(bb,.58,.83,.03,0,-.04,0,mat(P.oak,.6)); bb.rotation.x=-.2;

  /* ===== GROUND FLOOR ===== */
  const f0=new T.Mesh(new T.ShapeGeometry(floorShape()),new T.MeshStandardMaterial({map:rep(TX.floor,1/.6,1/.6),roughness:.45})); f0.rotation.x=-Math.PI/2; f0.position.y=.002; f0.receiveShadow=true; G0.add(f0);
  strip(G0,6.0,-2.6,.26); strip(G0,12,0,3.28); strip(G0,5.0,-5.78,.9,Math.PI/2);
  floorWalls(0,{
    front:[{a:1.1,b:4.1,bot:.45,top:2.6,glass:true,frame:P.teal},{a:4.7,b:8.1,bot:.45,top:2.6,glass:true,frame:P.teal},{a:8.8,b:9.8,bot:0,top:2.5}],
    right:[{a:2.3,b:5.5,bot:1.3,top:2.5,glass:true,frame:P.teal}],
    left:[{a:2.2,b:3.2,bot:.95,top:2.05,glass:true,frame:P.teal}]
  });
  // front: teal shop-front bay, door, fascia sign
  const fr=sideGroup(G0,'front');
  door(fr,3.1,0,3.6,1.0,2.5,P.teal);
  B(fr,10.4,.45,.06,-1.0,0,3.47,tealM); B(fr,10.4,.3,.08,-1.0,2.6,3.46,tealM);
  [[-5.3,.36],[-1.8,.5],[2.35,.35],[3.9,.4]].forEach(([x,w])=>B(fr,w,2.6,.08,x,0,3.46,tealM));
  B(fr,10.4,.05,.1,-1.0,2.9,3.45,mat(P.tealDk,.6));
  [[-3.6,3.0],[.2,3.4]].forEach(([cx,w])=>{ B(fr,w,.04,.26,cx,.45,3.36,mat(P.oakLt,.6)); plant(fr,cx-w/3,.49,3.36,.45,P.white); tulips(fr,cx+w/4,.49,3.36,.9); });
  B(fr,6.6,.5,.06,-1.6,2.65,3.74,tealDk); const fs=new T.Mesh(new T.PlaneGeometry(4.2,.46),new T.MeshStandardMaterial({map:TX.facade,roughness:.7})); fs.position.set(-1.6,2.9,3.775); fr.add(fs);
  [[-5.3],[2.35]].forEach(([x])=>{ const lm=mat(P.black,.4,.5); B(fr,.03,.03,.25,x,2.55,3.85,lm); });
  // coat stand
  const coat=grp(G0,4.25,0,3.15); C(coat,.18,.2,.03,0,0,0,mat(P.woodDk,.6)); C(coat,.02,.02,1.8,0,0,0,mat(P.woodDk,.6),8); C(coat,.14,.19,.9,.1,.75,.02,mat('#B59C7C',.95),14); C(coat,.07,.07,.12,.1,1.62,.02,mat('#B59C7C',.95),10);
  // left wall: panel mouldings, chair rail, art, sconces
  const lw=sideGroup(G0,'left');
  B(lw,.03,.05,3.7,-5.985,.95,1.65,moul);
  [[.2,1.6],[1.8,3.3]].forEach(([a,b])=>{ frameRect(lw,'z',-5.99,a,b,.15,.8,moul); frameRect(lw,'z',-5.99,a,b,1.2,2.75,moul); });
  board(lw,.55,.75,-5.97,1.6,.9,Math.PI/2,TX.sign,P.oak); board(lw,.55,.75,-5.97,1.6,2.55,Math.PI/2,TX.art2,P.oak);
  sconce(lw,-5.98,1.95,1.7,Math.PI/2);
  // right wall rail + sconce
  const rw=sideGroup(G0,'right'); B(rw,.03,.05,4.2,5.985,1.25,.4,moul); sconce(rw,5.98,2.0,-1.45,-Math.PI/2); sconce(rw,5.98,2.0,2.25,-Math.PI/2);
  // back wall: tiles, oak shelves with jars, menu, teal pilaster
  const bw=sideGroup(G0,'back');
  B(bw,3.8,.95,.012,-1.1,.95,-3.492,new T.MeshStandardMaterial({map:rep(TX.subway,3.8/.6,.95/.6),roughness:.3}));
  board(bw,1.0,1.17,-.35,1.72,-3.48,0,TX.menu,P.woodDk);
  const sh=mat(P.oakLt,.55);
  [2.05,2.45].forEach((y,k)=>{ B(bw,1.55,.04,.26,-2.2,y,-3.36,sh); for(let i=0;i<6;i++){ const x=-2.85+i*.25; if(k===1&&i===2){ tulips(bw,x,y+.04,-3.36,.9); continue; } jar(bw,x,y+.04,-3.36,[P.peach,'#8A5A3B',P.blush,'#C9A27A',P.pale,'#6B4A33'][(i+k)%6],.14+((i+k)%2)*.05); } });
  B(bw,.28,3.0,.16,.95,0,-3.42,tealM); B(bw,.34,.08,.2,.95,2.9,-3.4,tealDk);
  // kitchen partitions
  buildWall(G0,{pos:[-6,0,-1.5],len:3.0,h:3.0,t:.1,mat:creamM,openings:[{a:.6,b:1.8,bot:1.0,top:1.8},{a:2.1,b:2.9,bot:0,top:2.2}]});
  buildWall(G0,{pos:[-3,0,-3.5],rotY:-Math.PI/2,len:2.05,h:3.0,t:.1,mat:creamM});
  B(G0,.2,3.0,.2,-2.95,0,-1.5,tealM);
  B(G0,1.3,.04,.34,-4.8,1.0,-1.5,mat(P.oakLt,.5));
  door(G0,-3.5,0,-1.5,.78,2.18,P.teal);
  board(G0,.9,.22,-4.8,1.95,-1.44,0,TX.kitchen,P.oak);
  // kitchen interior
  const st=mat('#D4D9DB',.35,.6), dark=mat('#3A3D3F',.5,.3);
  B(G0,2.85,.9,.6,-4.5,0,-3.2,st); B(G0,2.85,.04,.62,-4.5,.9,-3.2,mat('#E3E6E7',.3,.5));
  [[-5.3,-3.35],[-5.0,-3.35],[-5.3,-3.05],[-5.0,-3.05]].forEach(([x,z])=>C(G0,.09,.09,.02,x,.94,z,dark));
  B(G0,.9,.5,.5,-5.15,2.2,-3.25,st);
  B(G0,.6,.08,.4,-3.9,.9,-3.2,mat('#AEB4B7',.2,.8)); C(G0,.01,.01,.3,-3.9,.94,-3.38,st,6);
  B(G0,.72,1.95,.66,-5.6,0,-2.45,mat('#E8EBEC',.3,.4)); B(G0,.02,.5,.02,-5.25,1.1,-2.1,dark);
  B(G0,.35,.03,1.4,-3.25,1.5,-2.4,mat(P.oak,.6)); B(G0,.35,.03,1.4,-3.25,1.9,-2.4,mat(P.oak,.6));
  for(let i=0;i<5;i++) C(G0,.06,.06,.14,-3.25,1.53,-2.95+i*.26,mat([P.peach,P.blush,P.pale,P.white,P.coral][i],.5),12);
  B(G0,1.3,.85,.55,-4.2,0,-1.85,st); B(G0,1.3,.04,.57,-4.2,.85,-1.85,mat('#E3E6E7',.3,.5));
  // ordering counter: fluted oak
  const flute=(w,h)=>new T.MeshStandardMaterial({map:rep(TX.bead,w/.6,h/.6),roughness:.6});
  B(G0,6.0,.92,.6,-2.6,0,-.3,flute(6,.92)); B(G0,6.1,.05,.68,-2.6,.92,-.3,mat(P.oakLt,.45));
  B(G0,.6,.92,1.6,.1,0,-1.4,flute(1.6,.92)); B(G0,.68,.05,1.6,.1,.92,-1.4,mat(P.oakLt,.45));
  B(G0,6.0,.1,.03,-2.6,0,.01,mat(P.woodDk,.6));
  for(let i=0;i<5;i++) B(G0,.05,.92,.04,-5.6+i*1.5,0,.02,mat(P.oak,.6));
  // curved pastry display
  const dcx=-4.05, R=.55;
  const cg=new T.Mesh(new T.CylinderGeometry(R,R,1.9,24,1,true,0,Math.PI/2),GLASS); cg.rotation.z=Math.PI/2; cg.position.set(dcx,.97,-.55); G0.add(cg);
  [dcx-.95,dcx+.95].forEach(x=>{ const cap=new T.Mesh(new T.CircleGeometry(R,20,0,Math.PI/2),mat(P.oakLt,.5,0,{side:T.DoubleSide})); cap.rotation.y=-Math.PI/2; cap.position.set(x,.97,-.55); G0.add(cap); });
  B(G0,1.9,.02,.45,dcx,1.22,-.35,GLASS2,true); B(G0,1.92,.03,.04,dcx,1.49,-.57,mat(P.brass,.3,.8));
  const warm=['#D9A15C','#C98B48','#E1B274','#B97A3E'];
  for(let i=0;i<7;i++){ const x=dcx-.8+i*.27;
    const cr=S(G0,.05,x,1.02,-.16,mat(warm[i%4],.6),1.5,.6,.8); cr.rotation.y=.4; S(G0,.055,x+.1,1.03,-.36,mat(warm[(i+1)%4],.6),1,.7,1);
    S(G0,.05,x,1.27,-.3,mat(warm[(i+2)%4],.6),1.1,.7,1); S(G0,.045,x+.12,1.27,-.46,mat(warm[(i+3)%4],.6),1.3,.6,.9);
  }
  // counter props
  const reg=grp(G0,-1.3,.97,-.35); B(reg,.36,.08,.3,0,0,0,mat('#E9E6E0',.5)); const scr=B(reg,.3,.2,.02,0,.1,-.08,mat('#2B2F31',.3)); scr.rotation.x=-.4;
  board(G0,.22,.28,-2.3,.99,-.2,0,TX.special,P.oak).rotation.x=-.15;
  tulips(G0,-2.8,.97,-.35,1.2); jar(G0,-2.55,.97,-.45,'#C9A27A',.2); for(let i=0;i<4;i++) C(G0,.04,.035,.09,-.1,.97+i*.09,-.9,mat('#FBF7F0',.5),12);
  mug(G0,-.5,.97,-.4,P.pale); plant(G0,.12,.97,-1.9,.55,P.white);
  // back coffee bar
  B(G0,3.8,.9,.6,-1.1,0,-3.2,flute(3.8,.9)); B(G0,3.84,.05,.64,-1.1,.9,-3.2,mat(P.oakLt,.45));
  const esp=grp(G0,-1.8,.95,-3.2), chrome=mat('#D5DADC',.18,.9); B(esp,.8,.4,.5,0,0,0,chrome); B(esp,.82,.05,.52,0,.4,0,mat(P.black,.4,.4)); B(esp,.8,.1,.02,0,.28,.26,mat(P.black,.4,.4));
  [-.2,.2].forEach(x=>{ C(esp,.045,.045,.07,x,.18,.24,chrome); B(esp,.03,.03,.2,x,.16,.4,mat(P.black,.4)); }); B(esp,.7,.03,.2,0,0,.32,chrome);
  for(let i=0;i<5;i++) C(esp,.035,.03,.06,-.3+i*.15,.45,0,mat('#FFFFFF',.4),10);
  const gr=grp(G0,-.9,.95,-3.25); B(gr,.2,.32,.24,0,0,0,mat(P.black,.4,.3)); C(gr,.09,.05,.22,0,.32,0,mat('#6B4A33',.2,0,{transparent:true,opacity:.75}),14);
  for(let i=0;i<4;i++) jar(G0,-.3+i*.12,.95,-3.35,['#8A5A3B','#C9A27A',P.peach,'#6B4A33'][i],.2);
  plant(G0,.4,.95,-3.25,.5,P.white);
  // retail shelf under stairs
  const rs=grp(G0,2.1,0,-3.2); B(rs,1.8,1.1,.45,0,0,0,flute(1.8,1.1)); for(let r=0;r<3;r++) B(rs,1.7,.03,.4,0,.15+r*.33,.02,mat(P.oakLt,.6));
  for(let r=0;r<3;r++) for(let i=0;i<7;i++) B(rs,.14,.2,.1,-.72+i*.24,.18+r*.33,.08,mat([P.peach,P.pale,'#C9A27A',P.blush,P.sage][(i+r)%5],.8));
  board(G0,.9,.22,2.1,1.2,-3.0,0,TX.beans,P.oak);
  // stairs
  const N=16, tr=4.32/N, sw=1.1, sz=-2.9;
  for(let i=0;i<N;i++){ const x0=5.4-i*tr, top=(i+1)*.2; B(G0,tr+.02,.05,sw,x0-tr/2,top-.05,sz,mat(P.oakLt,.5)); B(G0,.02,.15,sw,x0-.01,top-.2,sz,mat(P.white,.7)); }
  const ang=Math.atan2(3.2,4.32), sl=Math.hypot(3.2,4.32)+.2;
  [-2.33,-3.47].forEach(z=>{ const s=B(G0,sl,.28,.05,3.24,1.35,z,tealM); s.rotation.z=-ang; });
  for(let i=0;i<N;i+=2){ const x=5.4-(i+.5)*tr, top=(i+1)*.2; C(G0,.01,.01,.92,x,top,-2.38,mat(P.black,.4,.4),6); }
  const rail=B(G0,sl-.2,.05,.06,3.24,2.45-.025,-2.38,mat(P.oak,.5)); rail.rotation.z=-ang;
  plant(G0,5.7,0,-2.05,1,P.white);
  // seating tables
  [-4.9,-3.0,-1.1,.8].forEach((x,i)=>{ table(G0,x,0,2.1,.7,.7,i%2?'candle':'tulip'); chair(G0,x,0,1.55,0); chair(G0,x,0,2.65,Math.PI); });
  // banquette
  const bq=grp(G0,5.72,0,.4,-Math.PI/2); sofa(bq,0,0,0,0,4.0,P.grey,true);
  [-.9,.4,1.7].forEach((z,i)=>{ table(G0,5.0,0,z,.62,.62,i===1?'candle':'tulip'); chair(G0,4.42,0,z,Math.PI/2); });
  tallPlant(G0,-5.55,0,.35,P.white);
  // ground lights & hanging
  [-4.1,-2.6,-1.1].forEach((x,i)=>pendant(H0,x,3.0,-.3,.95,null,i===1,'globe'));
  [-4.9,-3.0,-1.1,.8].forEach((x,i)=>pendant(H0,x,3.0,2.1,1.0,null,i===1,'globe'));
  pendant(H0,5.0,3.0,.4,1.05,null,true,'globe');
  hanger(H0,-5.3,3.0,3.0,P.white,.6,.9); hanger(H0,1.9,3.0,3.05,P.white,.6,.8); hanger(H0,5.4,3.0,-1.6,P.white,.6,1.0);

  /* ===== UPPER SLAB ===== */
  const cm=mat('#F7F2EA',.9);
  B(G1,12,.2,5.8,0,3.0,.6,cm); B(G1,7.1,.2,1.2,-2.45,3.0,-2.9,cm); B(G1,.6,.2,1.2,5.7,3.0,-2.9,cm);
  /* ===== UPPER FLOOR: sunlit workshop ===== */
  const y1=FH;
  const f1=new T.Mesh(new T.ShapeGeometry(floorShape(HOLE)),new T.MeshStandardMaterial({map:rep(TX.wood,1/1.6,1/1.6),roughness:.6})); f1.rotation.x=-Math.PI/2; f1.position.y=y1+.002; f1.receiveShadow=true; G1.add(f1);
  const steel=P.tealDk;
  floorWalls(1,{
    front:[{a:.8,b:5.6,bot:.3,top:2.8,glass:true,grid:true,frame:steel},{a:6.4,b:11.6,bot:.3,top:2.8,glass:true,grid:true,frame:steel}],
    right:[{a:1.3,b:3.9,bot:.5,top:2.7,glass:true,grid:true,frame:steel}],
    back:[{a:8.4,b:10.4,bot:1.0,top:2.6,glass:true,grid:true,frame:steel}]
  });
  // pale blue wainscot + oak rail
  const paleM=mat(P.pale,.85), railM=mat(P.oak,.55);
  const lw1=sideGroup(G1,'left'); B(lw1,.012,.9,7,-5.993,y1,0,paleM); B(lw1,.03,.04,7,-5.985,y1+.9,0,railM);
  const bw1=sideGroup(G1,'back'); B(bw1,12,.9,.012,0,y1,-3.493,paleM); B(bw1,12,.04,.03,0,y1+.9,-3.485,railM);
  const rw1=sideGroup(G1,'right'); B(rw1,.012,.5,7,5.993,y1,0,paleM); B(rw1,.03,.04,7,5.985,y1+.5,0,railM);
  const fw1=sideGroup(G1,'front'); B(fw1,12,.3,.012,0,y1,3.493,paleM);
  // exterior window boxes under upper windows
  [[-3.0,4.8],[2.8,5.2]].forEach(([x,w])=>{ B(fw1,w,.2,.3,x,y1+.05,3.87,tealDk); for(let i=0;i<Math.round(w/.35);i++) leaf(fw1,x-w/2+.2+i*.35,y1+.32,3.87,.11); });
  // railing around stair opening
  const rm=mat(P.black,.4,.4), rwd=mat(P.oak,.5);
  B(G1,3.7,.05,.06,3.55,y1+.98,-2.32,rwd); B(G1,.06,.05,1.2,5.4,y1+.98,-2.9,rwd);
  for(let x=1.7;x<=5.4;x+=.25) C(G1,.01,.01,.98,x,y1,-2.32,rm,6);
  for(let z=-3.45;z<=-2.35;z+=.25) C(G1,.01,.01,.98,5.4,y1,z,rm,6);
  C(G1,.025,.025,1.03,1.7,y1,-2.32,rwd,8);
  // restroom
  buildWall(G1,{pos:[-6,y1,-1.3],len:2.0,h:3.0,t:.1,mat:creamM,openings:[{a:1.0,b:1.8,bot:0,top:2.2}]});
  buildWall(G1,{pos:[-4,y1,-3.5],rotY:-Math.PI/2,len:2.25,h:3.0,t:.1,mat:creamM});
  B(G1,.8,2.18,.04,-4.6,y1,-1.35,tealM); board(G1,.6,.15,-5.5,y1+1.6,-1.24,0,TX.wc,P.oak);
  const wc=grp(G1,-5.55,y1,-2.9); B(wc,.4,.4,.55,0,0,0,mat('#FFFFFF',.3)); B(wc,.4,.35,.18,0,.4,-.2,mat('#FFFFFF',.3));
  B(G1,.6,.8,.45,-4.5,y1,-3.25,mat(P.oakLt,.6)); C(G1,.2,.15,.1,-4.5,y1+.8,-3.25,mat('#FFFFFF',.3),20);
  const mir=new T.Mesh(new T.CircleGeometry(.28,32),mat('#DDE7EA',.05,.9)); mir.position.set(-4.5,y1+1.6,-3.48); G1.add(mir);
  // prep station: pale blue cabinets, sink, pegboard
  B(G1,2.4,.86,.58,-2.6,y1,-3.2,paleM); B(G1,2.44,.05,.62,-2.6,y1+.86,-3.2,mat(P.oakLt,.45));
  for(let i=0;i<4;i++){ B(G1,.02,.7,.01,-3.5+i*.6,y1+.08,-2.905,mat('#A9C1C8',.8)); C(G1,.012,.012,.06,-3.62+i*.6,y1+.6,-2.9,mat(P.brass,.3,.8),8).rotation.x=Math.PI/2; }
  B(G1,.5,.02,.36,-3.3,y1+.9,-3.2,mat('#AEB4B7',.2,.8)); C(G1,.012,.012,.28,-3.3,y1+.91,-3.4,mat(P.brass,.3,.8),8);
  for(let i=0;i<4;i++) jar(G1,-2.75+i*.14,y1+.91,-3.28,[P.pink,P.pale,P.peach,P.sage][i],.15);
  const roll=C(G1,.06,.06,.5,-1.8,y1+.91,-3.25,mat('#FBF8F2',.8),16); roll.rotation.z=Math.PI/2; roll.position.set(-1.8,y1+.99,-3.25);
  const peg=new T.Mesh(new T.PlaneGeometry(2.0,.9),new T.MeshStandardMaterial({map:rep(TX.peg,2.0/.5,.9/.5),roughness:.8})); peg.position.set(-2.6,y1+1.75,-3.482); bw1.add(peg);
  for(let i=0;i<14;i++){ const x=-3.5+i*.13; inst(bw1,'box',x,y1+1.7+Math.random()*.3,-3.46,.012,.18+Math.random()*.1,.012,[P.oak,P.teal,P.coral,P.black,P.peach][i%5]); }
  [[-3.3,2.05],[-2.0,1.5]].forEach(([x,y])=>{ C(bw1,.12,.12,.02,x,y1+y,-3.46,mat(P.brass,.3,.7),20).rotation.x=Math.PI/2; });
  board(bw1,.8,.2,-2.6,y1+2.35,-3.48,0,TX.self,P.oak);
  // workshop table A
  longTable(G1,-2.0,y1,1.6,4.4,1.0,0);
  const seatsA=[-3.7,-2.85,-2.0,-1.15,-.3];
  seatsA.forEach((x,i)=>{ chair(G1,x,y1,.93,0,P.oakLt); chair(G1,x,y1,2.27,Math.PI,P.oakLt);
    if(i%2===0) laptop(G1,x,y1+.76,1.3,0); else { B(G1,.3,.012,.22,x,y1+.76,1.3,mat('#FBF8F2',.8)); B(G1,.26,.01,.18,x+.02,y1+.772,1.3,mat([P.pale,P.blush,P.peach][i%3],.8)); }
    if(i%2===1) laptop(G1,x,y1+.76,1.9,Math.PI); else { const pal=C(G1,.1,.1,.012,x+.05,y1+.76,1.9,mat('#F7F2E9',.7),20); for(let k=0;k<4;k++) C(G1,.018,.018,.005,x+.05+Math.cos(k*1.5)*.06,y1+.772,1.9+Math.sin(k*1.5)*.06,mat([P.coral,P.teal,P.peach,P.pale][k],.6),10); }
  });
  [-3.3,-.8].forEach(x=>{ C(G1,.035,.03,.1,x,y1+.76,1.6,mat(P.pale,.6),10); for(let k=0;k<5;k++) inst(G1,'box',x+(Math.random()-.5)*.03,y1+.9,1.6+(Math.random()-.5)*.03,.008,.15,.008,[P.oak,P.teal,P.coral,P.peach][k%4]); });
  tulips(G1,-2.0,y1+.76,1.6,.8);
  // workshop table B (along z)
  longTable(G1,3.4,y1,.8,3.4,1.0,Math.PI/2);
  [-.5,.3,1.1,1.9].forEach((z,i)=>{ chair(G1,2.47,y1,z,Math.PI/2,P.oakLt); chair(G1,4.33,y1,z,-Math.PI/2,P.oakLt);
    if(i%2===0) laptop(G1,3.1,y1+.76,z,Math.PI/2); else B(G1,.22,.012,.3,3.1,y1+.76,z,mat('#FBF8F2',.8));
    if(i%2===1) laptop(G1,3.7,y1+.76,z,-Math.PI/2); else { B(G1,.22,.012,.3,3.7,y1+.76,z,mat(P.blush,.8)); }
  });
  jar(G1,3.4,y1+.76,.7,P.pale,.14);
  // shelves: left wall & right wall
  shelfUnit(lw1,-5.8,y1,.8,Math.PI/2,3.6,2.3,.38,5,P.oakLt,'craft');
  shelfUnit(rw1,5.8,y1,1.85,-Math.PI/2,2.9,2.3,.38,5,P.oakLt,'craft');
  board(rw1,.9,.22,5.95,y1+2.45,1.85,-Math.PI/2,TX.books,P.oak);
  // low shelf under front window
  const ls=grp(G1,2.6,y1,3.25); B(ls,3.0,.03,.4,0,0,0,mat(P.oakLt,.6)); B(ls,3.0,.03,.4,0,.35,0,mat(P.oakLt,.6)); B(ls,3.0,.03,.4,0,.7,0,mat(P.oakLt,.6)); [-1.48,-.5,.5,1.48].forEach(x=>B(ls,.03,.73,.4,x,0,0,mat(P.oakLt,.6)));
  for(let i=0;i<6;i++) B(ls,.4,.25,.3,-1.2+i*.48,.04,0,mat([P.pale,'#EFE7DA',P.blush][i%3],.9));
  plant(ls,-1.1,.73,0,.5,P.white); jar(ls,-.4,.73,0,P.peach,.18); jar(ls,.1,.73,0,P.sage,.14); plant(ls,.9,.73,0,.5,P.white);
  // easels
  easel(G1,-4.9,y1,-.25,Math.PI/2); easel(G1,-4.9,y1,.55,Math.PI/2+.3);
  tallPlant(G1,-5.5,y1,3.1,P.white); tallPlant(G1,5.5,y1,-1.95,P.white); tallPlant(G1,.45,y1,3.1,P.pale);
  plant(G1,-1.05,y1,-3.2,1.0,P.white);
  // upper lights & hanging plants
  [-3.4,-2.0,-.6].forEach((x,i)=>pendant(H1,x,6.2,1.6,1.25,P.pale,i!==1));
  [-.1,1.7].forEach((z,i)=>pendant(H1,3.4,6.2,z,1.2,P.pale,i===0));
  hanger(H1,-5.2,6.2,2.6,P.white,.55,1.1); hanger(H1,.9,6.2,2.95,P.white,.5,1.1); hanger(H1,5.2,6.2,-1.0,P.white,.6,1.2); hanger(H1,-4.6,6.2,-.9,P.white,.6,1.0); hanger(H1,4.9,6.2,3.0,P.white,.5,1.0);

  /* ===== ROOF with gable skylight over the workshop ===== */
  const rf=mat('#F1ECE4',.9);
  B(ROOF,12.4,.2,2.5,0,6.2,-2.45,rf); B(ROOF,12.4,.2,1.5,0,6.2,2.95,rf); B(ROOF,3.0,.2,3.4,-4.7,6.2,.5,rf); B(ROOF,4.4,.2,3.4,4.0,6.2,.5,rf);
  const sk=mat(P.tealDk,.5,.3);
  B(ROOF,5.0,.25,.08,-.7,6.4,-1.2,sk); B(ROOF,5.0,.25,.08,-.7,6.4,2.2,sk); B(ROOF,.08,.25,3.4,-3.2,6.4,.5,sk); B(ROOF,.08,.25,3.4,1.8,6.4,.5,sk);
  const sa=Math.atan2(.8,1.7), sL=Math.hypot(.8,1.7);
  [[-.35,-sa],[1.35,sa]].forEach(([zc,phi])=>{ const pane=new T.Mesh(new T.BoxGeometry(5,.02,sL),GLASS); pane.position.set(-.7,6.65+.4,zc); pane.rotation.x=phi; ROOF.add(pane);
    for(let k=0;k<=8;k++){ const bar=new T.Mesh(new T.BoxGeometry(.04,.05,sL),sk); bar.position.set(-3.2+k*5/8,6.65+.42,zc); bar.rotation.x=phi; ROOF.add(bar); } });
  B(ROOF,5.0,.08,.1,-.7,7.4,.5,sk);
  const pm=mat('#EFE7DA',.85);
  B(ROOF,12.44,.4,.2,0,6.4,3.62,pm); B(ROOF,12.44,.4,.2,0,6.4,-3.62,pm); B(ROOF,.2,.4,7.04,-6.12,6.4,0,pm); B(ROOF,.2,.4,7.04,6.12,6.4,0,pm);
  B(ROOF,1.2,.9,.8,4.3,6.4,-2.2,mat('#D3D6D6',.6,.3));

  buildOutside();
  /* ===== dimension lines (plan) ===== */
  const dm=mat('#24403A',.6);
  B(DIMS,12,.02,.03,0,0,4.45,dm,true); [-6,6].forEach(x=>B(DIMS,.03,.02,.35,x,0,4.45,dm,true));
  B(DIMS,.03,.02,7,-6.75,0,0,dm,true); [-3.5,3.5].forEach(z=>B(DIMS,.35,.02,.03,-6.75,0,z,dm,true));
  DIMS.visible=false;
  const grid=new T.GridHelper(12,12,'#9FB6B1','#C9D6D3'); grid.material.transparent=true; grid.material.opacity=.55; DIMS.add(grid); grid.position.y=.012; grid.scale.set(1,1,7/12);

  flushInst();
  scene.traverse(o=>{ if(o.isMesh && o.material===GLASS){ o.castShadow=false; o.receiveShadow=false; } });
}

/* ---------- zones ---------- */
const ZONES=[
 {n:1,f:0,name:'Entrance & shopfront',pos:[3.1,2.9,3.3],cam:[6.5,3.4,10],tgt:[2.6,1.3,2.6],walk:[3.1,2.9,3.1,0],dims:'door 1.0 × 2.5 m',desc:"A teal-framed shopfront with wide windows and the Sip & Create sign, a coat stand by the door and flower planters on the pavement."},
 {n:2,f:0,name:'Order counter',pos:[-1.3,1.55,-.3],cam:[1.6,3.1,5],tgt:[-1.8,1,-.6],walk:[-1.8,1.3,-1.8,-.5],dims:'6.0 m long · 0.95 m high',desc:"Fluted oak counter with a light wood top, the till, tonight's class board and fresh flowers. A Greek-key tile border runs along its front."},
 {n:3,f:0,name:'Pastry display',pos:[-4.05,1.8,-.3],cam:[-2.4,2.5,3.1],tgt:[-4.1,1.1,-.3],walk:[-4.1,1.15,-4.1,-.3],dims:'1.9 × 0.55 m',desc:"Curved-glass case on two levels for croissants and pastries, placed where customers see it before ordering."},
 {n:4,f:0,name:'Coffee bar',pos:[-1.2,2.05,-3.2],cam:[1.3,2.7,1.6],tgt:[-1.2,1.4,-3.0],walk:[-1.3,-1.3,-1.3,-3.2],dims:'3.8 m long',desc:"Chrome espresso machine and grinder, oak shelves of glass jars, pale square tiles and the chalkboard menu beside a teal column."},
 {n:5,f:0,name:'Kitchen',pos:[-4.5,2.5,-2.5],cam:[-1.6,6.6,2.4],tgt:[-4.5,.6,-2.5],walk:[-4.3,-2.2,-4.8,-3.4],dims:'3.0 × 2.0 m = 6 m²',desc:"Enclosed kitchen with stainless worktops: hob and hood, sink, fridge and a prep table. A pass-through window and a door lead to the service area."},
 {n:6,f:0,name:'Service area',pos:[-2.0,1.4,-1.8],cam:[2.6,5.2,2.6],tgt:[-2,.5,-1.6],walk:[-.6,-1.1,-3,-1.8],dims:'2.3 m aisle',desc:"Barista aisle between the counter and the coffee bar, linked to the kitchen by the door and the pass-through window."},
 {n:7,f:0,name:'Table seating',pos:[-2.0,1.35,2.1],cam:[0,5.6,8.8],tgt:[-2,.5,2],walk:[2.1,.9,-3,2.2],dims:'4 tables · 8 seats',desc:"Oak tables on black bases with bentwood chairs, under white glass globe pendants, against a panelled wall with botanical prints and brass sconces."},
 {n:8,f:0,name:'Banquette',pos:[5.4,1.6,.4],cam:[1.8,3.2,3.6],tgt:[5.2,.8,.4],walk:[3.4,.4,5.5,.4],dims:'4.0 m · 3 tables · 9 seats',desc:"Grey tufted banquette with blush cushions along the side wall, below a window and wall lights."},
 {n:9,f:0,name:'Stairs & retail shelf',pos:[3.2,2.3,-2.9],cam:[8.6,4,2.6],tgt:[3.2,1.4,-2.9],walk:[5.7,-2.9,3,-2.9],dims:'16 steps · 1.1 m wide',desc:"Oak staircase on the back wall up to the workshop, with a shelf of coffee beans for sale underneath."},
 {n:10,f:1,name:'Main workshop table',pos:[-2.0,4.5,1.6],cam:[2.2,8.2,7.5],tgt:[-2,3.6,1.5],walk:[.9,.6,-2,1.6],dims:'4.4 × 1.0 m · 10 seats',desc:"Long oak table for painting, craft and group work, set with laptops, sketchbooks and paints under pale blue pendants and skylight."},
 {n:11,f:1,name:'Second workshop table',pos:[3.4,4.5,.8],cam:[8,7.5,5.5],tgt:[3.4,3.6,.8],walk:[1.4,-1.4,3.4,.8],dims:'3.4 × 1.0 m · 8 seats',desc:"A second table for small groups and classes, next to the side window and the art supplies shelf."},
 {n:12,f:1,name:'Supply shelves & easels',pos:[-5.6,5.3,.8],cam:[-.6,6.4,2.4],tgt:[-5.6,4.3,.6],walk:[-4.0,-.1,-5.8,.8],dims:'shelves 3.6 m + 2.9 m',desc:"Open oak shelving on both side walls for paints, brushes, paper and jars, with two easels beside it."},
 {n:13,f:1,name:'Prep station',pos:[-2.6,4.7,-3.1],cam:[0,6.1,1.2],tgt:[-2.6,4,-3.1],walk:[-.5,-1.8,-2.6,-3.2],dims:'2.4 m long',desc:"Pale blue cabinets with an oak top and a sink for washing brushes, with a pegboard of tools above."},
 {n:14,f:1,name:'Glass wall & skylight',pos:[-.7,5.9,.5],cam:[-.7,5.4,-1.9],tgt:[-.7,4.8,3.2],walk:[-1.0,-.6,-1.0,3.5],dims:'10 m glazing · roof 5.0 × 3.4 m',desc:"Steel-framed windows running nearly floor to ceiling, and a pitched glass skylight over the workshop that fills the room with daylight."},
 {n:15,f:1,name:'Restroom',pos:[-5.0,5.2,-2.4],cam:[-1.6,8.6,2],tgt:[-5,3.6,-2.4],walk:[-3.65,-.9,-4.6,-2.2],dims:'2.0 × 2.2 m',desc:"Enclosed restroom with a basin and round mirror; the door opens onto the workshop."}
];
ZONES.push(
  {n:16,f:2,name:'Drive-thru lane',pos:[-10.3,1.5,-4],cam:[-25,14,6],tgt:[-10.3,.3,-5],walk:[3.1,2.9,3.1,0],dims:'enter 3.2 m + exit 3.4 m lanes',desc:'Clear one-way loop with its own entry and exit on the street. Cars turn in at the ENTER sign on the outer lane, loop round the U-turn behind the building, pass the 2.6 m clearance bar, order at the menu board on the planted island, collect at the pickup window, then leave through EXIT.'},
 {n:17,f:2,name:'Pickup window',pos:[-6.4,2.4,-.8],cam:[-13,3.6,4.5],tgt:[-6.4,1.4,-.8],walk:[3.1,2.9,3.1,0],dims:'window 1.0 × 1.1 m',desc:'Serving window cut into the side wall right beside the barista area, with an oak ledge inside and out and a teal canopy over the car.'},
 {n:18,f:2,name:'Parking',pos:[10,2.6,0],cam:[24,11,12],tgt:[10.5,.4,-.2],walk:[3.1,2.9,3.1,0],dims:'5 bays · 2.6 × 5.2 m',desc:'Five nose-in bays with marked IN and OUT lanes beside the café, including one accessible bay. Parked: a matte black G-Class, a dark grey Range Rover, a grey Porsche 911 and a black Mercedes GLC. Tap a car to see it.'}
);
const CARIMG={g:'assets/cars/g-class.jpg',p:'assets/cars/porsche-911.jpg',m:'assets/cars/mercedes-glc.jpg'};
ZONES.push(
 {n:19,f:2,name:'Mercedes G-Class',pos:[9.8,2.4,-5.2],cam:[17,3.4,-8.5],tgt:[9.8,1,-5.2],walk:[3.1,2.9,3.1,0],dims:'bay 1 · matte black',img:CARIMG.g,desc:'Matte black G-Class with black multi-spoke wheels, red brake calipers and the rear-mounted spare wheel, matched to your photo.'},
 {n:20,f:2,name:'Range Rover',pos:[9.75,2.3,-2.6],cam:[17,3.4,-4.5],tgt:[9.75,1,-2.6],walk:[3.1,2.9,3.1,0],dims:'bay 2 · dark grey',desc:'Dark grey Range Rover with a black floating roof, slim LED lights and silver wheels.'},
 {n:21,f:2,name:'Porsche 911',pos:[9.6,1.8,0],cam:[16.5,2.6,-2],tgt:[9.6,.6,0],walk:[3.1,2.9,3.1,0],dims:'bay 3 · metallic grey',img:CARIMG.p,desc:'Metallic grey 911 coupé with round headlights, wide rear hips and dark multi-spoke wheels, matched to your photo.'},
 {n:22,f:2,name:'Mercedes GLC',pos:[9.75,2.2,2.6],cam:[17,3.2,5.5],tgt:[9.75,1,2.6],walk:[3.1,2.9,3.1,0],dims:'bay 4 · gloss black',img:CARIMG.m,desc:'Gloss black GLC SUV with chrome window line, roof rails and rear trim, a full-width tail-light strip and black turbine-style wheels, matched to your photo.'}
);
const DIMLABELS=[{t:'12.00 m',p:[0,0,4.85]},{t:'7.00 m',p:[-7.35,0,0]}];

/* ---------- UI state ---------- */
let mode='orbit', floorMode='both', showLabels=false, autoWalls=true, night=false, selected=null;
const labelsEl=document.getElementById('labels');
ZONES.forEach(z=>{ const el=document.createElement('button'); el.className='pin'; el.innerHTML=`<span class="n">${z.n}</span><span class="t">${z.name}</span><span class="d">${z.dims}</span>`; el.addEventListener('click',()=>focusZone(z)); labelsEl.appendChild(el); z.el=el; z.v=new T.Vector3(...z.pos); });
DIMLABELS.forEach(d=>{ const el=document.createElement('div'); el.className='pin dim'; el.textContent=d.t; labelsEl.appendChild(el); d.el=el; d.v=new T.Vector3(...d.p); });
const zl=document.getElementById('zoneList');
[[0,'GROUND FLOOR'],[1,'UPPER FLOOR'],[2,'OUTSIDE']].forEach(([f,t])=>{ const h=document.createElement('div'); h.className='fl'; h.innerHTML=`${t}<span>${f===2?'drive-thru & parking':'12 × 7 m'}</span>`; zl.appendChild(h);
  ZONES.filter(z=>z.f===f).forEach(z=>{ const b=document.createElement('button'); b.className='zbtn'; b.innerHTML=`<span class="n">${z.n}</span><span class="t">${z.name}</span><span class="d">${z.dims.split(' · ')[0]}</span>`; b.addEventListener('click',()=>{ focusZone(z); if(innerWidth<=760) setPanel(false); }); zl.appendChild(b); z.li=b; }); });

const card=document.getElementById('card');
function showCard(z){ selected=z; ZONES.forEach(q=>{q.el.classList.toggle('on',q===z); q.li.classList.toggle('on',q===z);});
  document.getElementById('cN').textContent=z.n; document.getElementById('cT').textContent=z.name; document.getElementById('cF').textContent=['Ground floor','Upper floor','Outside'][z.f]; document.getElementById('cD').textContent=z.dims; document.getElementById('cP').textContent=z.desc; const ci=document.getElementById('cImg'); if(z.img){ ci.src=z.img; ci.alt=z.name+' photo'; ci.hidden=false; } else { ci.hidden=true; ci.removeAttribute('src'); }
  document.getElementById('cWalk').hidden=(mode==='walk'||z.f===2); document.getElementById('cPlan').textContent=mode==='plan'?'Back to 3D':'Show on plan';
  card.hidden=false; }
function hideCard(){ card.hidden=true; selected=null; ZONES.forEach(q=>{q.el.classList.remove('on'); q.li.classList.remove('on');}); }
document.getElementById('cX').onclick=hideCard;
document.getElementById('cWalk').onclick=()=>{ if(selected) enterWalk(selected.walk, selected.f); };
document.getElementById('cPlan').onclick=()=>{ const z=selected; if(!z) return; if(z.f===2){ setFloor('ground',true); setMode('plan'); showCard(z); return; } if(mode==='plan'){ setMode('orbit'); focusZone(z);} else { setFloor(z.f?'upper':'ground',true); setMode('plan'); showCard(z);} };

function setPressed(sel,val){ document.querySelectorAll(sel).forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.f===val))); }
document.querySelectorAll('#floors button').forEach(b=>b.addEventListener('click',()=>setFloor(b.dataset.f)));
function setFloor(f,silent){ floorMode=f; setPressed('#floors button',f);
  if(mode==='walk'){ if(f==='whole') return; enterWalk(f==='upper'?[.4,-2.9,-3,-1]:[3.1,2.9,3.1,0], f==='upper'?1:0); return; }
  if(mode==='orbit' && !silent){ const v={both:[[12.5,10,15],[1.2,2.6,0]],ground:[[10.5,9.5,12.5],[1.2,.8,0]],upper:[[10.5,12.5,12.5],[1.2,4,0]],whole:[[17,9,20],[1.2,3,0]]}[f]; flyTo(v[0],v[1]); }
  applyVis(); }
function tgl(id,fn){ const b=document.getElementById(id); b.addEventListener('click',()=>{ const v=b.getAttribute('aria-pressed')!=='true'; b.setAttribute('aria-pressed',String(v)); fn(v); }); }
tgl('t-walls',v=>{autoWalls=v; applyVis();}); tgl('t-night',v=>{night=v; applyLight();}); tgl('t-rotate',v=>{orbit.autoRotate=v&&!reduced;});
const panel=document.getElementById('panel'), menuBtn=document.getElementById('menuBtn');
function setPanel(open){ panel.classList.toggle('closed',!open); menuBtn.setAttribute('aria-expanded',String(open)); menuBtn.textContent=open?'Close':'Menu'; }
menuBtn.onclick=()=>setPanel(panel.classList.contains('closed'));

['orbit','walk','plan'].forEach(m=>document.getElementById('m-'+m).addEventListener('click',()=>{ if(m==='walk') enterWalk(floorMode==='upper'?[.4,-2.9,-3,-1]:[3.1,2.9,3.1,0],floorMode==='upper'?1:0); else setMode(m); }));
const hint=document.getElementById('hint'), pad=document.getElementById('pad');
function setMode(m){
  const prev=mode; mode=m;
  ['orbit','walk','plan'].forEach(k=>document.getElementById('m-'+k).setAttribute('aria-pressed',String(k===m)));
  orbit.enabled=(m==='orbit'); orbit2.enabled=(m==='plan');
  document.getElementById('app').classList.toggle('plan',m==='plan');
  pad.hidden=(m!=='walk');
  hint.textContent={orbit:'Drag to rotate · scroll to zoom · right-drag to pan · pick an area in the panel to fly there',walk:'WASD or arrow keys to walk · drag to look around · take the stairs up · hold Shift to run',plan:'1 m grid · drag to pan, scroll to zoom · switch floors in the panel'}[m];
  if(m==='orbit'){ camera.fov=45; camera.updateProjectionMatrix(); if(prev==='walk'){ floorMode='both'; setPressed('#floors button','both'); camera.position.set(12.5,10,15); orbit.target.set(1.2,2.6,0); } }
  if(m==='plan'){ fitOrtho(); if(floorMode==='whole'||floorMode==='both') { floorMode='ground'; setPressed('#floors button','ground'); } }
  if(!card.hidden && selected) showCard(selected);
  applyVis();
}
function applyVis(){
  const upperOn = mode==='walk' || floorMode!=='ground';
  G1.visible=upperOn; G0.visible=true;
  ROOF.visible = mode==='walk' || (mode==='orbit' && floorMode==='whole');
  H0.visible=H1.visible=(mode!=='plan');
  DIMS.visible=(mode==='plan'); const ly=(floorMode==='upper'?FH:0)+.05; DIMS.position.y=ly; DIMLABELS.forEach(d=>d.v.y=ly);
  if(mode!=='orbit' || floorMode==='whole' || !autoWalls) for(const s in SIDES) SIDES[s].forEach(g=>g.visible=true);
}
function applyLight(){
  scene.background.copy(night?SKY_NIGHT:SKY_DAY);
  hemi.intensity=night?.16:.5; amb.intensity=night?.08:.14; sun.intensity=night?.08:.85;
  pendLights.forEach(l=>l.intensity=night?1.5:.55); bulbMats.forEach(m=>m.emissiveIntensity=night?2.4:.8);
}
function fitOrtho(){ const W=stage.clientWidth,H=stage.clientHeight; const side=(W>760&&!panel.classList.contains('closed'))?310:0;
  const need=Math.max(17*H/(2*(W-side)),6.3); ortho.left=-need*W/H; ortho.right=need*W/H; ortho.top=need; ortho.bottom=-need; ortho.zoom=1;
  const ox=side*need/H; orbit2.target.set(ox,0,.3); ortho.position.set(ox,40,.3); ortho.updateProjectionMatrix(); }

/* ---------- camera fly ---------- */
let fly=null;
function flyTo(pos,tgt,dur){ dur=reduced?1:(dur||1000); fly={t0:performance.now(),dur,p0:camera.position.clone(),p1:new T.Vector3(...pos),q0:orbit.target.clone(),q1:new T.Vector3(...tgt)}; }
orbit.addEventListener('start',()=>{ fly=null; });
function focusZone(z){
  if(z.f===2 && mode!=='orbit') setMode('orbit');
  if(mode==='walk'){ enterWalk(z.walk,z.f); showCard(z); return; }
  if(mode==='plan'){ setFloor(z.f?'upper':'ground',true); showCard(z); return; }
  floorMode=z.f===2?'whole':(z.f?'upper':'ground'); setPressed('#floors button',floorMode); applyVis(); flyTo(z.cam,z.tgt); showCard(z);
}

/* ---------- walk mode ---------- */
const player={x:3.1,z:2.9,level:0,onStairs:false,yaw:0,pitch:-.05,y:1.6};
const OBS={0:[[-5.6,.4,-.6,0],[-.2,.4,-2.2,-.6],[-6,-3.9,-1.56,-1.44],[-3.1,-2.94,-1.56,-1.44],[-3.06,-2.94,-3.5,-1.44],[-3,.8,-3.5,-2.9],[5.45,6,-1.6,2.4],[-5.95,-3.1,-3.5,-2.9],[-5.95,-5.25,-2.8,-2.1],[-4.85,-3.55,-2.12,-1.57],
  [-5.25,-4.55,1.75,2.45],[-3.35,-2.65,1.75,2.45],[-1.45,-.75,1.75,2.45],[.45,1.15,1.75,2.45],[4.7,5.3,-1.2,-.6],[4.7,5.3,.1,.7],[4.7,5.3,1.4,2.0],[1.2,3.0,-3.45,-2.95],[4.05,4.45,2.95,3.35]],
  1:[[-6,-5.0,-1.36,-1.24],[-4.2,-3.94,-1.36,-1.24],[-4.06,-3.94,-3.5,-1.24],[-3.8,-1.4,-3.5,-2.92],[-4.2,.2,1.1,2.1],[2.9,3.9,-.9,2.5],[-6,-5.6,-1.0,2.6],[5.6,6,.4,3.3],[.9,4.1,3.05,3.5],[-5.25,-4.55,-.6,.9]]};
function blocked(x,z,lvl){ const r=.22; return OBS[lvl].some(o=>x>o[0]-r&&x<o[1]+r&&z>o[2]-r&&z<o[3]+r); }
function inStair(x,z){ return x>HOLE[0]&&x<HOLE[1]&&z>-3.45&&z<-2.35; }
function tryMove(nx,nz){
  nx=Math.max(-5.75,Math.min(5.75,nx)); nz=Math.max(-3.25,Math.min(3.25,nz));
  if(player.onStairs){ nz=Math.max(-3.28,Math.min(-2.52,nz)); if(nx>=5.4){player.onStairs=false;player.level=0;} else if(nx<=1.1){player.onStairs=false;player.level=1;} player.x=nx; player.z=nz; return; }
  if(inStair(nx,nz)){
    if(player.level===0 && nx>4.9 && nz<-2.5){ player.onStairs=true; player.x=nx; player.z=nz; return; }
    if(player.level===1 && nx<1.7 && nz<-2.5){ player.onStairs=true; player.x=nx; player.z=nz; return; }
    return;
  }
  if(blocked(nx,nz,player.level) && !blocked(player.x,player.z,player.level)) return;
  player.x=nx; player.z=nz;
}
function enterWalk(w,lvl){
  player.x=w[0]; player.z=w[1]; player.level=lvl; player.onStairs=false; player.yaw=Math.atan2(-(w[2]-w[0]),-(w[3]-w[1])); player.pitch=-.08; player.y=lvl*FH+1.6;
  if(mode!=='walk'){ setMode('walk'); }
  camera.fov=68; camera.updateProjectionMatrix(); fly=null;
  floorMode=lvl?'upper':'ground'; setPressed('#floors button',floorMode);
  if(!card.hidden && selected) showCard(selected);
}
const keys={};
const KM={KeyW:'f',ArrowUp:'f',KeyS:'b',ArrowDown:'b',KeyA:'l',ArrowLeft:'l',KeyD:'r',ArrowRight:'r'};
addEventListener('keydown',e=>{ if(KM[e.code]&&mode==='walk'){ keys[KM[e.code]]=true; e.preventDefault(); } if(e.key==='Shift') keys.run=true; if(e.code==='Escape'&&mode==='walk') setMode('orbit'); });
addEventListener('keyup',e=>{ if(KM[e.code]) keys[KM[e.code]]=false; if(e.key==='Shift') keys.run=false; });
addEventListener('blur',()=>{ for(const k in keys) keys[k]=false; });
pad.querySelectorAll('[data-k]').forEach(b=>{ const k=b.dataset.k; const on=e=>{e.preventDefault(); keys[k]=true;}; const off=()=>{keys[k]=false;}; b.addEventListener('pointerdown',on); ['pointerup','pointerleave','pointercancel'].forEach(ev=>b.addEventListener(ev,off)); });
document.getElementById('padFloor').onclick=()=>{ if(player.level===0) enterWalk([.4,-2.9,-3,-1],1); else enterWalk([5.7,-1.9,3,1],0); };
document.getElementById('padExit').onclick=()=>setMode('orbit');
let drag=null;
let clickStart=null; const ray=new T.Raycaster(), ndc=new T.Vector2();
renderer.domElement.addEventListener('pointerdown',e=>{ clickStart={x:e.clientX,y:e.clientY}; },true);
renderer.domElement.addEventListener('pointerup',e=>{ if(mode!=='orbit'||!clickStart) return; if(Math.hypot(e.clientX-clickStart.x,e.clientY-clickStart.y)>5) return;
  const r=renderer.domElement.getBoundingClientRect(); ndc.set((e.clientX-r.left)/r.width*2-1,-((e.clientY-r.top)/r.height)*2+1); ray.setFromCamera(ndc,camera);
  for(const c of carGroups){ if(ray.intersectObject(c.g,true).length){ const z=ZONES.find(q=>q.n===c.n); if(z) focusZone(z); break; } } });
renderer.domElement.addEventListener('pointerdown',e=>{ if(mode!=='walk') return; drag={x:e.clientX,y:e.clientY,id:e.pointerId}; renderer.domElement.setPointerCapture(e.pointerId); });
renderer.domElement.addEventListener('pointermove',e=>{ if(!drag||mode!=='walk') return; const k=e.pointerType==='touch'?.006:.0045; player.yaw+=(e.clientX-drag.x)*k; player.pitch=Math.max(-1.2,Math.min(1.1,player.pitch+(e.clientY-drag.y)*k)); drag.x=e.clientX; drag.y=e.clientY; });
['pointerup','pointercancel'].forEach(ev=>renderer.domElement.addEventListener(ev,()=>{ drag=null; }));

/* ---------- loop ---------- */
const clock=new T.Clock(), tmp=new T.Vector3();
function resize(){ const w=stage.clientWidth,h=stage.clientHeight; renderer.setSize(w,h,false); camera.aspect=w/h; camera.updateProjectionMatrix(); if(mode==='plan') fitOrtho(); }
addEventListener('resize',resize);
function updateWalls(){ if(mode!=='orbit'||floorMode==='whole'||!autoWalls) return; const c=camera.position;
  SIDES.front.forEach(g=>g.visible=c.z<3.75); SIDES.back.forEach(g=>g.visible=c.z>-3.75); SIDES.left.forEach(g=>g.visible=c.x>-6.25); SIDES.right.forEach(g=>g.visible=c.x<6.25); }
function updateLabels(cam){
  const w=stage.clientWidth,h=stage.clientHeight;
  ZONES.forEach(z=>{ let vis=showLabels;
    if(mode==='orbit') vis = vis && (floorMode==='whole'?false: floorMode==='ground'? z.f===0 : z.f===1);
    else if(mode==='plan') vis = vis && z.f===(floorMode==='upper'?1:0);
    else { const lvl=player.onStairs?-1:player.level; const dx=z.v.x-player.x, dz=z.v.z-player.z; vis = vis && z.f===lvl && Math.hypot(dx,dz)<7.5; }
    if(vis){ tmp.copy(z.v); if(mode==='plan') tmp.y=(z.f?FH:0)+1; tmp.project(cam); if(tmp.z>1||tmp.z<-1) vis=false; }
    if(!vis){ z.el.classList.add('hidden-pin'); return; }
    z.el.classList.remove('hidden-pin'); z.el.style.transform=`translate3d(${((tmp.x*.5+.5)*w).toFixed(1)}px,${((-tmp.y*.5+.5)*h).toFixed(1)}px,0) translate(-50%,-50%)`;
  });
  DIMLABELS.forEach(d=>{ if(mode!=='plan'){ d.el.classList.add('hidden-pin'); return; } tmp.copy(d.v).project(cam); d.el.classList.remove('hidden-pin'); d.el.style.transform=`translate3d(${((tmp.x*.5+.5)*w).toFixed(1)}px,${((-tmp.y*.5+.5)*h).toFixed(1)}px,0) translate(-50%,-50%)`; });
}
function frame(){
  requestAnimationFrame(frame);
  const dt=Math.min(.05,clock.getDelta()), now=performance.now();
  if(fly){ const k=Math.min(1,(now-fly.t0)/fly.dur), e=k<.5?4*k*k*k:1-Math.pow(-2*k+2,3)/2; camera.position.lerpVectors(fly.p0,fly.p1,e); orbit.target.lerpVectors(fly.q0,fly.q1,e); if(k>=1) fly=null; }
  let cam=camera;
  if(mode==='walk'){
    const f=(keys.f?1:0)-(keys.b?1:0), s=(keys.r?1:0)-(keys.l?1:0);
    if(f||s){ const sp=(keys.run?3.6:1.9)*dt, sy=Math.sin(player.yaw), cy=Math.cos(player.yaw); const dx=(-sy*f+cy*s)*sp, dz=(-cy*f-sy*s)*sp; tryMove(player.x+dx,player.z); tryMove(player.x,player.z+dz); }
    const base=player.onStairs?Math.max(0,Math.min(FH,(5.4-player.x)/4.32*FH)):player.level*FH;
    player.y+=(base+1.6-player.y)*Math.min(1,dt*10);
    camera.position.set(player.x,player.y,player.z); camera.rotation.order='YXZ'; camera.rotation.set(player.pitch,player.yaw,0);
  } else if(mode==='plan'){ cam=ortho; orbit2.update(); }
  else { orbit.update(); }
  updateWalls();
  renderer.render(scene,cam);
  updateLabels(cam);
}

/* ---------- boot ---------- */
const fontsReady = (document.fonts && document.fonts.load) ? Promise.all([document.fonts.load('600 40px "Fraunces"'),document.fonts.load('96px "Pacifico"'),document.fonts.load('500 30px "DM Sans"'),document.fonts.load('600 30px "DM Sans"')]) : Promise.resolve();
Promise.race([fontsReady,new Promise(r=>setTimeout(r,2500))]).catch(()=>{}).then(()=>{
  build(); applyLight(); setMode('orbit'); resize();
  if(innerWidth>760) setPanel(true);
  document.getElementById('loader').hidden=true;
  frame();
});
})();
