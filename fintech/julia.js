// Fintech view: a live ray-marched quaternion Julia set behind the hero (WebGL2), from the
// "Site" animation in fintech-portfolio.html. Renders at 0.7x, DPR capped at 1.5, pauses when
// the hero is off-screen or the tab is hidden, one still frame for prefers-reduced-motion.
// Without WebGL2 the hero stays plain navy.
(() => {
const hero=document.querySelector('.hero');
if(!hero)return;
const cv=document.createElement('canvas');cv.className='julia';cv.setAttribute('aria-hidden','true');
const veil=document.createElement('div');veil.className='julia-veil';veil.setAttribute('aria-hidden','true');
hero.prepend(cv,veil);
const gl=cv.getContext('webgl2',{antialias:false});
if(!gl){cv.remove();return}
const ANIM={"name": "Site", "state": {"amb": 0.35, "ao": 0.8, "bg0": "#14242f", "bg1": "#03070b", "bn": 7.75, "bright": 0.6, "cut": 0, "cutAz": 226, "cutD": 0.235, "cutEl": 90, "cw": -0.599, "cx": -0.195, "cy": 0.163, "cz": 0.56, "detail": 0.55, "dist": 3.2798138496396994, "drift": 0.17, "flip": 0, "freq": 2.13, "glow": 0.11, "glowC": "#7e8086", "itMix": 0.15, "iter": 12, "jb": 1, "lAz": 33, "lEl": 55, "lb": 2.6667, "light": "#97d8d4", "lr": 28, "ls": 10, "lspeed": 0.35, "off": 0.1, "p0": "#0b2340", "p1": "#2f7fb8", "p2": "#e8f6ff", "p3": "#f2c879", "pitch": 0.6840480957031247, "pow": 2, "psize": 2.4, "res": 0.85, "rim": 0.25, "rx": -20, "ry": 30, "rz": 65, "shad": 0.75, "shell": "#000000", "shellMix": 0, "spec": 0.45, "spin": 0, "trail": 0.4, "w": -0.307, "yaw": 4.145775390625007}, "phase": {"head": 149999, "spinA": 0, "tDrift": 63.76105500000895}};
const S=ANIM.state;
const FS=`#version 300 es
precision highp float;
uniform vec2 uRes,uShift;uniform float uExp,uRoll,uYaw,uPitch,uDist;uniform vec3 uRot;
uniform vec4 uC;uniform int uIter;uniform float uPow,uW,uBn,uJb;
uniform float uCut;uniform vec3 uCutN;uniform float uCutD,uEps;
uniform vec3 uBg0,uBg1,uShell,uP0,uP1,uP2,uP3,uLc,uGc,uLd;
uniform float uShellMix,uFreq,uOff,uItMix,uSpec,uAO,uGlow,uShad,uAmb,uRim,uSkip;
out vec4 o;
mat3 gO;float gTrap,gIt,gCutHit;
mat3 rx(float a){float c=cos(a),s=sin(a);return mat3(1,0,0,0,c,s,0,-s,c);}
mat3 ry(float a){float c=cos(a),s=sin(a);return mat3(c,0,-s,0,1,0,s,0,c);}
mat3 rz(float a){float c=cos(a),s=sin(a);return mat3(c,s,0,-s,c,0,0,0,1);}
vec4 qm(vec4 a,vec4 b){return vec4(a.x*b.x-dot(a.yzw,b.yzw),a.x*b.yzw+b.x*a.yzw+cross(a.yzw,b.yzw));}
float bulb(vec3 p){
 vec3 w=p;float dr=1.,r=length(w),tr=1e9;int n=0;
 vec3 c=uJb>.5?uC.xyz:p;
 for(int i=0;i<32;i++){
  if(i>=uIter||r>2.)break;
  float th=acos(clamp(w.y/max(r,1e-6),-1.,1.))*uBn,ph=atan(w.x,w.z)*uBn;
  dr=uBn*pow(r,uBn-1.)*dr+(uJb>.5?0.:1.);
  w=pow(r,uBn)*vec3(sin(th)*sin(ph),cos(th),sin(th)*cos(ph))+c;
  r=length(w);tr=min(tr,r*r);n=i;
 }
 gTrap=tr;gIt=float(n);
 return .5*log(max(r,1e-6))*r/max(dr,1e-8);
}
float fr(vec3 p){
 if(uPow>3.5)return bulb(p);
 vec4 z=vec4(p,uW);float dr=1.,r2=dot(z,z),tr=1e9;int n=0;
 for(int i=0;i<32;i++){
  if(i>=uIter)break;
  if(uPow<2.5){dr=2.*sqrt(r2)*dr;z=vec4(z.x*z.x-dot(z.yzw,z.yzw),2.*z.x*z.yzw)+uC;}
  else{dr=3.*r2*dr;z=qm(qm(z,z),z)+uC;}
  r2=dot(z,z);tr=min(tr,r2);n=i;
  if(r2>256.)break;
 }
 gTrap=tr;gIt=float(n);
 float r=sqrt(r2);
 return .5*r*log(r)/max(dr,1e-8);
}
float map(vec3 p){
 float d=fr(gO*p);gCutHit=0.;
 if(uCut>.5){float pd=dot(p,uCutN)-uCutD;if(pd>d){d=pd;gCutHit=1.;}}
 return d;
}
vec3 pal(float s){return s<.3333?mix(uP0,uP1,s*3.):s<.6667?mix(uP1,uP2,s*3.-1.):mix(uP2,uP3,s*3.-2.);}
void main(){
 vec2 uv=(2.*gl_FragCoord.xy-uRes)/uRes.y;
 uv-=uShift;
 uv=mat2(cos(uRoll),sin(uRoll),-sin(uRoll),cos(uRoll))*uv;
 gO=rx(uRot.x)*ry(uRot.y)*rz(uRot.z);
 vec3 ro=uDist*vec3(cos(uPitch)*sin(uYaw),sin(uPitch),cos(uPitch)*cos(uYaw));
 vec3 fw=normalize(-ro),rt=normalize(cross(fw,vec3(0,1,0))),up=cross(rt,fw);
 vec3 rd=normalize(uv.x*rt+uv.y*up+2.*fw);
 vec2 q=gl_FragCoord.xy/uRes;
 vec3 bg=mix(uBg1,uBg0,smoothstep(0.,1.,q.y));
 bg*=1.-.35*dot(q-.5,q-.5);
 vec3 col=bg;float glow=0.;bool hit=false;
 float b=dot(ro,rd),h=b*b-dot(ro,ro)+4.6;
 if(h>0.&&uSkip<.5){
  h=sqrt(h);float t=max(-b-h,0.),tf=-b+h,d;
  for(int i=0;i<240;i++){
   vec3 p=ro+rd*t;d=map(p);
   glow+=.02*exp(-d*25.);
   if(d<uEps*t){hit=true;break;}
   t+=d*.8;if(t>tf)break;
  }
  if(hit){
   vec3 p=ro+rd*t;float e=max(uEps*t,1e-4)*.5;vec2 k=vec2(1,-1);
   vec3 n=normalize(k.xyy*map(p+k.xyy*e)+k.yyx*map(p+k.yyx*e)+k.yxy*map(p+k.yxy*e)+k.xxx*map(p+k.xxx*e));
   map(p);float cut=gCutHit,tr=gTrap,it=gIt;
   float x=log(tr+1e-5)*uFreq*.35+it*uItMix+uOff;
   vec3 pc=pal(abs(fract(x)*2.-1.));
   vec3 base=cut>.5?pc:mix(uShell,pc,uShellMix);
   vec3 sp0=p+n*e*6.;
   float sh=1.;
   if(uShad>.001){float st=.01;for(int i=0;i<56;i++){float hh=map(sp0+uLd*st);sh=min(sh,12.*hh/st);st+=clamp(hh,.006,.15);if(sh<.002||st>3.)break;}
    sh=mix(1.,clamp(sh,0.,1.),uShad);}
   float ao=0.,sc=1.;for(int i=1;i<=5;i++){float hh=.015+.05*float(i);ao+=(hh-map(p+n*hh))*sc;sc*=.65;}
   ao=clamp(1.-uAO*2.5*ao,0.,1.);
   float dif=max(dot(n,uLd),0.)*sh;
   vec3 hv=normalize(uLd-rd);float spc=pow(max(dot(n,hv),0.),40.)*uSpec*sh;
   float fre=pow(1.-max(dot(n,-rd),0.),3.);
   vec3 lin=uLc*dif*1.35+uAmb*ao*mix(uBg1+.15,vec3(1.),.5+.5*n.y);
   col=base*lin+uLc*spc+fre*uRim*ao*uGc;
   col=mix(col,bg,1.-exp(-.004*t*t*t));
  }
 }
 vec3 gc=uGc*min(glow,1.5)*uGlow*uExp;
 // The object is opaque; around it only the glow shows, so the hero's own background and the
 // headline's ruled lines show through (premultiplied alpha)
 if(hit){col=col*uExp+gc*.25;o=vec4(pow(max(col,0.),vec3(1./2.2)),1);}
 else{vec3 g=pow(max(gc,0.),vec3(1./2.2));o=vec4(g,clamp(max(g.r,max(g.g,g.b)),0.,1.));}
}`;
const VS=`#version 300 es
in vec2 a;void main(){gl_Position=vec4(a,0,1);}`;
// Object position: u/v = centre as a fraction of hero width/height, z = size, yaw/pitch = camera angle
const POSITION={"wide":{"roll":0.7328554841775412,"u":0.7669113243319154,"v":1.0940540640517942,"z":1.9518815291131284,"yaw":5.145425292968761,"pitch":-0.3342973632812509},"narrow":{"u":0.5,"v":0.625,"z":0.87,"yaw":4.145775390625007,"pitch":0.6840480957031247,"roll":0}};
// Exposure in stops, like a photo editor's: negative dims the object and its glow
const EXPOSURE=-0.6;
const layout=()=>hero.clientWidth/hero.clientHeight>1.15?'wide':'narrow';
// Fine-tuning: open the page with #adjust. Drag moves the object, Shift-drag turns it clockwise or
// anticlockwise, Alt-drag orbits the camera, scroll zooms. "Copy position" puts the JSON on the
// clipboard: paste it over POSITION above to save it.
const POS=JSON.parse(JSON.stringify(POSITION));
for(const k in POS)POS[k].roll=POS[k].roll||0;
let redraw=()=>{},dragging=false;
function adjust(){
 const grab=document.createElement('div');grab.className='julia-grab';hero.append(grab);
 const box=document.createElement('div');box.className='julia-adjust';
 box.innerHTML=`<b>Position the fractal</b><span>Drag: move · Shift-drag: rotate · Alt-drag: orbit · Scroll: zoom</span><output></output>
  <div><button type="button" data-a="reset">Reset</button><button type="button" data-a="copy">Copy position</button></div><small role="status"></small>`;
 document.body.append(box);
 const out=box.querySelector('output'),msg=box.querySelector('small');
 const deg=r=>Math.round(r*180/Math.PI);
 const sync=()=>{const L=POS[layout()];out.textContent=`${layout()==='wide'?'Laptop':'Phone'} layout · across ${Math.round(L.u*100)}% · down ${Math.round(L.v*100)}% · size ${L.z.toFixed(2)}× · rotation ${deg(L.roll)}° · orbit ${deg(L.yaw)}°/${deg(L.pitch)}°`};
 const clamp=L=>{L.pitch=Math.min(1.45,Math.max(-1.45,L.pitch));L.z=Math.min(4,Math.max(.3,L.z));L.u=Math.min(1.3,Math.max(-.3,L.u));L.v=Math.min(1.3,Math.max(-.3,L.v))};
 let last=null,centre=null;
 grab.addEventListener('pointerdown',e=>{grab.setPointerCapture(e.pointerId);last={x:e.clientX,y:e.clientY};dragging=true;
  const r=hero.getBoundingClientRect(),L=POS[layout()];centre={x:r.left+L.u*r.width,y:r.top+L.v*r.height}});
 grab.addEventListener('pointermove',e=>{if(!last)return;const L=POS[layout()],dx=e.clientX-last.x,dy=e.clientY-last.y;
  if(e.shiftKey){   // turn around the object's centre, following the pointer
   const a0=Math.atan2(last.y-centre.y,last.x-centre.x),a1=Math.atan2(e.clientY-centre.y,e.clientX-centre.x);
   let d=a1-a0;if(d>Math.PI)d-=2*Math.PI;if(d<-Math.PI)d+=2*Math.PI;L.roll+=d}
  else if(e.altKey){L.yaw-=dx*.008;L.pitch+=dy*.008}
  else{L.u+=dx/hero.clientWidth;L.v+=dy/hero.clientHeight;centre.x+=dx;centre.y+=dy}
  last={x:e.clientX,y:e.clientY};clamp(L);sync();redraw()});
 const up=()=>{last=null;dragging=false;redraw()};
 grab.addEventListener('pointerup',up);grab.addEventListener('pointercancel',up);
 grab.addEventListener('wheel',e=>{e.preventDefault();const L=POS[layout()];L.z*=Math.exp(-e.deltaY*.0015);clamp(L);sync();redraw()},{passive:false});
 box.addEventListener('click',async e=>{const a=e.target.dataset&&e.target.dataset.a;if(!a)return;
  if(a==='reset'){POS[layout()]=Object.assign({roll:0},POSITION[layout()]);msg.textContent='Back to the saved position.'}
  else{const txt=JSON.stringify(POS);
   try{await navigator.clipboard.writeText(txt);msg.textContent='Copied. Paste it over POSITION in fintech/julia.js.'}
   catch(err){msg.textContent=txt}}
  sync();redraw()});
 addEventListener('resize',sync);sync();
}
 const sh=(t,s)=>{const x=gl.createShader(t);gl.shaderSource(x,s);gl.compileShader(x);if(!gl.getShaderParameter(x,gl.COMPILE_STATUS))console.error(gl.getShaderInfoLog(x));return x};
 const p=gl.createProgram();gl.attachShader(p,sh(gl.VERTEX_SHADER,VS));gl.attachShader(p,sh(gl.FRAGMENT_SHADER,FS));gl.bindAttribLocation(p,0,'a');gl.linkProgram(p);gl.useProgram(p);
 const U={},n=gl.getProgramParameter(p,gl.ACTIVE_UNIFORMS);for(let i=0;i<n;i++){const u=gl.getActiveUniform(p,i);U[u.name]=gl.getUniformLocation(p,u.name)}
 const bf=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,bf);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,3,-1,-1,3]),gl.STATIC_DRAW);
 gl.enableVertexAttribArray(0);gl.vertexAttribPointer(0,2,gl.FLOAT,false,0,0);
 const f=(k,...v)=>U[k]!=null&&gl['uniform'+v.length+'f'](U[k],...v);
 const lin=h=>[1,3,5].map(i=>Math.pow(parseInt(h.slice(i,i+2),16)/255,2.2));
 const R=Math.PI/180;
 let tDrift=+ANIM.phase.tDrift||0,last=performance.now(),visible=true;
 const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
 function draw(){
  const dpr=Math.min(devicePixelRatio||1,1.5),sc=.7;
  const W=Math.max(2,Math.round(hero.clientWidth*dpr*(dragging?.4:sc))),H=Math.max(2,Math.round(hero.clientHeight*dpr*(dragging?.4:sc)));
  if(cv.width!==W||cv.height!==H){cv.width=W;cv.height=H}
  gl.viewport(0,0,W,H);
  const L=POS[layout()],asp=W/H;
  f('uShift',(L.u-.5)*2*asp,(.5-L.v)*2);f('uRoll',L.roll);f('uExp',Math.pow(2,EXPOSURE));
  const dA=S.drift*.12;
  f('uRes',W,H);f('uYaw',L.yaw);f('uPitch',L.pitch);f('uDist',S.dist/L.z);
  f('uRot',S.rx*R,S.ry*R,S.rz*R);
  f('uC',S.cx+dA*Math.sin(tDrift*.7),S.cy+dA*Math.sin(tDrift*.53+1),S.cz+dA*Math.sin(tDrift*.31+2),S.cw+dA*Math.sin(tDrift*.43+3));
  gl.uniform1i(U.uIter,S.iter);f('uPow',S.pow);f('uW',S.w);f('uBn',S.bn);f('uJb',S.jb);f('uSkip',0);
  const sg=S.flip?-1:1,el=S.cutEl*R,az=S.cutAz*R;
  f('uCut',S.cut);f('uCutN',sg*Math.cos(el)*Math.sin(az),sg*Math.sin(el),sg*Math.cos(el)*Math.cos(az));f('uCutD',sg*S.cutD);
  f('uEps',Math.pow(10,-2.2-1.6*S.detail));
  ['bg0','bg1','shell','p0','p1','p2','p3'].forEach(k=>f('u'+k[0].toUpperCase()+k.slice(1),...lin(S[k])));
  f('uLc',...lin(S.light));f('uGc',...lin(S.glowC));
  const la=S.lAz*R,le=S.lEl*R;f('uLd',Math.cos(le)*Math.sin(la),Math.sin(le),Math.cos(le)*Math.cos(la));
  f('uShellMix',S.shellMix);f('uFreq',S.freq);f('uOff',S.off);f('uItMix',S.itMix);f('uSpec',S.spec);f('uAO',S.ao);f('uGlow',S.glow);f('uShad',S.shad);f('uAmb',S.amb);f('uRim',S.rim);
  gl.drawArrays(gl.TRIANGLES,0,3);
 }
 function frame(now){
  const dt=Math.min(.1,(now-last)/1000);last=now;
  if(visible&&!document.hidden){tDrift+=dt*S.drift*1.5;draw()}
  requestAnimationFrame(frame);
 }
 const io=new IntersectionObserver(e=>{visible=e[0].isIntersecting});io.observe(hero);
 redraw=()=>{if(reduce)draw()};
 if(/adjust/.test(location.hash))adjust();
 if(reduce){draw();const ro=new ResizeObserver(draw);ro.observe(hero)}else requestAnimationFrame(frame);
})();
