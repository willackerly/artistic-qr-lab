/* Artistic QR Lab — Scanner-aware renderer + free-pad steering V0.2
 *
 * Adds two complementary layers:
 *   1) valid steering: arbitrary post-terminator pad bytes are treated as free variables,
 *      Reed–Solomon parity is recomputed, and a bit-influence hill-climber fits the current
 *      vector target without spending intentional ECC damage;
 *   2) scanner-aware rendering: smooth vector art is drawn across module boundaries while
 *      deterministic module-center "contracts" preserve the logical sample value. A jsQR/
 *      ZXing-style 8x8 local-threshold surrogate reports sampled-bit and RS-block margin.
 *
 * Function patterns remain high contrast by design. Modern decoders use local binarization,
 * so weakening finder/timing/alignment patterns is more likely to harm detection than to
 * induce a useful global contrast gain.
 */
(() => {
  if (typeof els === 'undefined' || typeof state === 'undefined' || !state || document.getElementById('scannerAwareControls')) return;

  const grid = document.querySelector('.toolGrid');
  const row = document.querySelector('.toolRow');
  if (!grid || !row) return;

  const wrapper = document.createElement('div');
  wrapper.id = 'scannerAwareControls';
  wrapper.className = 'wide';
  wrapper.style.cssText = 'grid-column:1/-1;border-top:1px solid #26344f;margin-top:4px;padding-top:9px';
  wrapper.innerHTML = `
    <div class="tiny" style="font-weight:800;color:#dfe9ff;text-transform:uppercase;letter-spacing:.05em;margin-bottom:7px">Scanner-aware rendering / valid steering</div>
    <div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px">
      <label>Light center min luminance <div class="rangeRow"><input id="lightLum" type="range" min="55" max="100" value="82"><span id="lightLumLabel">82%</span></div></label>
      <label>Dark center max luminance <div class="rangeRow"><input id="darkLum" type="range" min="0" max="45" value="18"><span id="darkLumLabel">18%</span></div></label>
      <label>Light center guard <div class="rangeRow"><input id="lightGuard" type="range" min="10" max="70" value="32"><span id="lightGuardLabel">32%</span></div></label>
      <label>Dark center kernel <div class="rangeRow"><input id="darkKernel" type="range" min="20" max="90" value="50"><span id="darkKernelLabel">50%</span></div></label>
      <label>Non-art dark-dot size <div class="rangeRow"><input id="noiseFill" type="range" min="30" max="100" value="58"><span id="noiseFillLabel">58%</span></div></label>
      <label>Camera blur surrogate <div class="rangeRow"><input id="blurFrac" type="range" min="0" max="35" value="10"><span id="blurFracLabel">10% module</span></div></label>
      <label>Outline importance boost <div class="rangeRow"><input id="outlineBoost" type="range" min="1" max="10" step="0.5" value="6"><span id="outlineBoostLabel">6×</span></div></label>
      <label>Free-byte search iterations <div class="rangeRow"><input id="steerIterations" type="range" min="8" max="256" step="8" value="96"><span id="steerIterationsLabel">96</span></div></label>
    </div>`;
  grid.appendChild(wrapper);

  row.insertAdjacentHTML('beforeend', `
    <button id="steerPads" class="good">Steer free pad bits</button>
    <button id="scannerPreview" class="secondary">Scanner-aware preview</button>
    <button id="scannerCheck" class="secondary">Run threshold surrogate</button>
    <button id="exportScannerSvg" class="secondary">Export scanner-aware SVG</button>`);

  if (!Array.from(els.padMode.options).some(o => o.value === 'optimized')) {
    els.padMode.add(new Option('optimized free bytes / experimental', 'optimized'));
  }
  if (!Array.from(els.overlay.options).some(o => o.value === 'scanner')) {
    els.overlay.add(new Option('scanner-aware vector render', 'scanner'));
  }

  const sx = Object.fromEntries([
    'lightLum','darkLum','lightGuard','darkKernel','noiseFill','blurFrac','outlineBoost','steerIterations',
    'steerPads','scannerPreview','scannerCheck','exportScannerSvg'
  ].map(id => [id, document.getElementById(id)]));

  function bindRange(id, suffix='') {
    const el=sx[id], label=document.getElementById(id+'Label');
    if(!el||!label)return;
    const update=()=>label.textContent=`${el.value}${suffix}`;
    el.addEventListener('input', update); update();
  }
  bindRange('lightLum','%'); bindRange('darkLum','%'); bindRange('lightGuard','%'); bindRange('darkKernel','%');
  bindRange('noiseFill','%'); bindRange('blurFrac','% module'); bindRange('outlineBoost','×'); bindRange('steerIterations','');

  const originalPadByteFor = padByteFor;
  const originalPadModeLabel = padModeLabel;
  let freePadBytes = [];
  window.__artisticQrFreePadBytes = freePadBytes;

  padByteFor = function(padIndex, padMode) {
    if (padMode === 'optimized') return (freePadBytes[padIndex] ?? 0) & 0xFF;
    return originalPadByteFor(padIndex, padMode);
  };
  padModeLabel = function(padMode) {
    return padMode === 'optimized' ? 'optimized arbitrary post-terminator bytes / experimental' : originalPadModeLabel(padMode);
  };

  function setFreePadBytes(bytes) {
    freePadBytes = bytes.map(v=>v&255);
    window.__artisticQrFreePadBytes = freePadBytes;
  }

  function smileyGeom() {
    const t=state.target, p=t?.params;
    if(!t || !p || !String(t.label||'').startsWith('vector smiley')) return null;
    const R=p.radius, cx=p.cx+.5, cy=p.cy+.5, stroke=p.stroke,
      eyeR=p.eyeR, eyeY=p.cy-R*.27+.5, eyeDX=R*.34,
      mouthTop=p.cy+R*.12+.5, mouthRX=R*.49, mouthRY=R*.38;
    return {R,cx,cy,stroke,eyeR,eyeY,eyeDX,mouthTop,mouthRX,mouthRY};
  }
  function ellipseBoundaryDistance(x,y,cx,cy,rx,ry) {
    const dx=(x-cx)/rx, dy=(y-cy)/ry, q=Math.hypot(dx,dy);
    return Math.abs(q-1)*Math.min(rx,ry);
  }
  function artDarkAt(x,y,g=smileyGeom()) {
    if(!g) return false;
    const ring=Math.abs(Math.hypot(x-g.cx,y-g.cy)-g.R)<=g.stroke*.5;
    const eyes=Math.hypot(x-(g.cx-g.eyeDX),y-g.eyeY)<=g.eyeR || Math.hypot(x-(g.cx+g.eyeDX),y-g.eyeY)<=g.eyeR;
    const nx=(x-g.cx)/g.mouthRX, ny=(y-g.mouthTop)/g.mouthRY;
    const mouth=y>=g.mouthTop && nx*nx+ny*ny<=1;
    return ring||eyes||mouth;
  }
  function edgeDistanceAt(x,y,g=smileyGeom()) {
    if(!g) return 99;
    const ring=Math.min(
      Math.abs(Math.hypot(x-g.cx,y-g.cy)-(g.R-g.stroke*.5)),
      Math.abs(Math.hypot(x-g.cx,y-g.cy)-(g.R+g.stroke*.5))
    );
    const e1=Math.abs(Math.hypot(x-(g.cx-g.eyeDX),y-g.eyeY)-g.eyeR);
    const e2=Math.abs(Math.hypot(x-(g.cx+g.eyeDX),y-g.eyeY)-g.eyeR);
    const mouthEllipse=ellipseBoundaryDistance(x,y,g.cx,g.mouthTop,g.mouthRX,g.mouthRY);
    const mouthTop=(x>=g.cx-g.mouthRX&&x<=g.cx+g.mouthRX)?Math.abs(y-g.mouthTop):99;
    return Math.min(ring,e1,e2,mouthEllipse,mouthTop);
  }
  function targetWeight(r,c) {
    const t=state.target;
    if(!t || t.size!==state.qr?.size || !t.active?.[r]?.[c]) return 0;
    const base=t.weight?.[r]?.[c] ?? 1;
    const d=edgeDistanceAt(c+.5,r+.5);
    const boost=Number(sx.outlineBoost.value);
    const edgeFactor=Math.max(0,1-d/1.5);
    return base*(1+(boost-1)*edgeFactor);
  }

  function scoreBits(q, bits=null) {
    const t=state.target; if(!t || t.size!==q.size) return {score:0,total:0,fit:0,outline:0,outlineTotal:0,outlineFit:0};
    let score=0,total=0,outline=0,outlineTotal=0;
    for(let r=0;r<q.size;r++)for(let c=0;c<q.size;c++){
      if(!t.active?.[r]?.[c]) continue;
      const w=targetWeight(r,c), idx=r*q.size+c, actual=bits?!!bits[idx]:!!q.modules[r][c], desired=!!t.dark[r][c];
      total+=w;if(actual===desired)score+=w;
      if(edgeDistanceAt(c+.5,r+.5)<.8){outlineTotal+=w;if(actual===desired)outline+=w;}
    }
    return {score,total,fit:total?score/total:1,outline,outlineTotal,outlineFit:outlineTotal?outline/outlineTotal:1};
  }
  function flattenModules(q){const a=new Uint8Array(q.size*q.size);for(let r=0;r<q.size;r++)for(let c=0;c<q.size;c++)a[r*q.size+c]=q.modules[r][c]?1:0;return a;}
  function xorInfluence(base,other){const out=[];for(let r=0;r<base.size;r++)for(let c=0;c<base.size;c++)if(base.modules[r][c]!==other.modules[r][c])out.push(r*base.size+c);return out;}

  function deltaForInfluence(bits, influence, q) {
    const t=state.target;if(!t)return 0;let delta=0;
    for(const idx of influence){const r=Math.floor(idx/q.size),c=idx%q.size;if(!t.active?.[r]?.[c])continue;const w=targetWeight(r,c),desired=!!t.dark[r][c],before=!!bits[idx],after=!before;delta+=(after===desired? w:0)-(before===desired? w:0);}
    return delta;
  }
  function applyInfluence(bits,influence){for(const idx of influence)bits[idx]^=1;}

  async function buildInfluenceModel(baseQ,padCount,opts) {
    const influences=[];
    const totalBits=padCount*8;
    for(let bi=0;bi<totalBits;bi++){
      if(bi%32===0){sx.steerPads.textContent=`Mapping ${bi}/${totalBits}…`;await new Promise(r=>setTimeout(r,0));}
      const bytes=new Array(padCount).fill(0), byteIndex=bi>>3, bitInByte=7-(bi&7);bytes[byteIndex]=1<<bitInByte;setFreePadBytes(bytes);
      const q=buildQR(els.payload.value,{...opts,mask:0,padMode:'optimized'});
      influences.push({bitIndex:bi,byteIndex,mask:1<<bitInByte,positions:xorInfluence(baseQ,q)});
    }
    return influences;
  }

  function hillClimb(baseQ,baseBytes,influences,maxSteps) {
    const bits=flattenModules(baseQ), bytes=baseBytes.slice();
    let current=scoreBits(baseQ,bits), steps=0;
    while(steps<maxSteps){
      let best=-1,bestDelta=1e-9;
      for(let i=0;i<influences.length;i++){
        const d=deltaForInfluence(bits,influences[i].positions,baseQ);
        if(d>bestDelta){bestDelta=d;best=i;}
      }
      if(best<0)break;
      const inf=influences[best]; applyInfluence(bits,inf.positions); bytes[inf.byteIndex]^=inf.mask; steps++;
      current=scoreBits(baseQ,bits);
    }
    return {bytes,bits,steps,...current};
  }

  async function steerFreePads() {
    if(!state.qr||!state.target){els.decoderResults.textContent='Create/auto-fit a vector target first.';return;}
    const old=sx.steerPads.textContent;sx.steerPads.disabled=true;
    try{
      const opts={mode:els.mode.value,ecc:els.ecc.value,version:els.version.value};
      setFreePadBytes([]);
      const probe=buildQR(els.payload.value,{...opts,mask:0,padMode:'zero'}), padCount=probe.padCodewordCount;
      if(!padCount)throw new Error('This QR has no full pad codewords to steer. Choose a larger version or shorter payload.');
      setFreePadBytes(new Array(padCount).fill(0));
      const base0=buildQR(els.payload.value,{...opts,mask:0,padMode:'optimized'});
      const influences=await buildInfluenceModel(base0,padCount,opts);
      const maxSteps=Number(sx.steerIterations.value);
      let best=null;
      for(let mask=0;mask<8;mask++){
        sx.steerPads.textContent=`Solving mask ${mask}…`;await new Promise(r=>setTimeout(r,0));
        setFreePadBytes(new Array(padCount).fill(0));
        const q=buildQR(els.payload.value,{...opts,mask,padMode:'optimized'});
        const cand=hillClimb(q,new Array(padCount).fill(0),influences,maxSteps);
        if(!best || cand.score>best.cand.score || (Math.abs(cand.score-best.cand.score)<1e-9&&cand.steps<best.cand.steps))best={mask,cand};
      }
      setFreePadBytes(best.cand.bytes);els.padMode.value='optimized';els.mask.value=String(best.mask);
      const finalQ=buildQR(els.payload.value,{...opts,mask:best.mask,padMode:'optimized'});
      state.qr=finalQ;state.edits=new Map();state.selection=null;els.overlay.value='scanner';renderAll();
      const before=scoreBits(probe),after=scoreBits(finalQ);
      const nonzero=best.cand.bytes.filter(v=>v).length;
      els.decoderResults.textContent=`VALID STEERING · arbitrary post-terminator bytes + recomputed RS\n\nFree pad bytes: ${padCount} (${padCount*8} binary steering variables)\nChosen mask: ${best.mask}\nGreedy bit toggles: ${best.cand.steps}\nNonzero pad bytes: ${nonzero}\nWeighted target fit: ${(before.fit*100).toFixed(1)}% baseline → ${(after.fit*100).toFixed(1)}% steered\nOutline fit: ${(before.outlineFit*100).toFixed(1)}% → ${(after.outlineFit*100).toFixed(1)}%\nIntentional RS damage: 0 codewords\n\nThis search includes parity steering automatically: each free pad bit's influence was measured after recomputing Reed–Solomon parity, then composed as an affine XOR influence field. Direct damage can now be reserved for final polish.`;
    }catch(e){els.decoderResults.textContent=`Free-byte steering error: ${e.message||e}`;}finally{sx.steerPads.disabled=false;sx.steerPads.textContent=old;}
  }

  function lumGray(percent){const x=Math.round(Number(percent)*2.55);return `rgb(${x},${x},${x})`;}
  function roundRect(ctx,x,y,w,h,r){r=Math.min(r,w/2,h/2);ctx.beginPath();ctx.roundRect?ctx.roundRect(x,y,w,h,r):(ctx.rect(x,y,w,h));ctx.fill();}
  function drawSmileyVector(ctx,g,cell,ox,oy,color='#05070b') {
    if(!g)return;
    const X=x=>ox+x*cell,Y=y=>oy+y*cell;ctx.save();ctx.fillStyle=color;ctx.strokeStyle=color;
    ctx.lineWidth=g.stroke*cell;ctx.beginPath();ctx.arc(X(g.cx),Y(g.cy),g.R*cell,0,Math.PI*2);ctx.stroke();
    ctx.beginPath();ctx.arc(X(g.cx-g.eyeDX),Y(g.eyeY),g.eyeR*cell,0,Math.PI*2);ctx.arc(X(g.cx+g.eyeDX),Y(g.eyeY),g.eyeR*cell,0,Math.PI*2);ctx.fill();
    ctx.beginPath();ctx.moveTo(X(g.cx-g.mouthRX),Y(g.mouthTop));ctx.lineTo(X(g.cx+g.mouthRX),Y(g.mouthTop));
    ctx.ellipse(X(g.cx),Y(g.mouthTop),g.mouthRX*cell,g.mouthRY*cell,0,0,Math.PI,false);ctx.closePath();ctx.fill();ctx.restore();
  }

  function renderScannerCanvas(modulePx=20,logicalQ=state.qr) {
    const q=logicalQ;if(!q)return null;const margin=4,total=q.size+margin*2,cv=document.createElement('canvas');cv.width=cv.height=total*modulePx;
    const ctx=cv.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,cv.width,cv.height);const ox=margin*modulePx,oy=margin*modulePx;
    const target=state.target,g=smileyGeom(),noise=Number(sx.noiseFill.value)/100;
    for(let r=0;r<q.size;r++)for(let c=0;c<q.size;c++){
      const m=q.meta[r][c],dark=currentDark(r,c);if(!dark||m?.kind==='function')continue;
      const s=modulePx*noise,x=ox+(c+.5)*modulePx-s/2,y=oy+(r+.5)*modulePx-s/2;ctx.fillStyle='#174a9c';roundRect(ctx,x,y,s,s,s*.24);
    }
    if(g)drawSmileyVector(ctx,g,modulePx,ox,oy,'#05070b');
    const lg=Number(sx.lightGuard.value)/100,dk=Number(sx.darkKernel.value)/100;
    for(let r=0;r<q.size;r++)for(let c=0;c<q.size;c++){
      const m=q.meta[r][c];if(!m||m.kind==='function')continue;const logical=currentDark(r,c),cx=ox+(c+.5)*modulePx,cy=oy+(r+.5)*modulePx;
      const artAtCenter=g?artDarkAt(c+.5,r+.5,g):!!target?.dark?.[r]?.[c];
      if(!logical && artAtCenter){const s=modulePx*lg;ctx.fillStyle=lumGray(sx.lightLum.value);roundRect(ctx,cx-s/2,cy-s/2,s,s,s*.35);}
      if(logical){const s=modulePx*dk;ctx.fillStyle=lumGray(sx.darkLum.value);roundRect(ctx,cx-s/2,cy-s/2,s,s,s*.35);}
    }
    for(let r=0;r<q.size;r++)for(let c=0;c<q.size;c++){
      const m=q.meta[r][c];if(m?.kind!=='function')continue;ctx.fillStyle=currentDark(r,c)?'#06133d':'#fff';ctx.fillRect(ox+c*modulePx,oy+r*modulePx,modulePx,modulePx);
    }
    return cv;
  }

  function drawScannerAware() {
    const src=renderScannerCanvas(24);if(!src)return;const ctx=els.canvas.getContext('2d');ctx.clearRect(0,0,els.canvas.width,els.canvas.height);ctx.fillStyle='#f7f9ff';ctx.fillRect(0,0,els.canvas.width,els.canvas.height);
    const s=Math.min(els.canvas.width,els.canvas.height)*.96,x=(els.canvas.width-s)/2,y=(els.canvas.height-s)/2;ctx.imageSmoothingEnabled=true;ctx.drawImage(src,x,y,s,s);
  }
  const coreDraw=draw;
  draw=function(){if(els.overlay.value==='scanner'){drawScannerAware();return;}coreDraw();};

  function grayPixels(canvas) {
    const ctx=canvas.getContext('2d'),d=ctx.getImageData(0,0,canvas.width,canvas.height).data,out=new Uint8Array(canvas.width*canvas.height);
    for(let i=0,j=0;i<d.length;i+=4,j++)out[j]=Math.max(0,Math.min(255,Math.round(.2126*d[i]+.7152*d[i+1]+.0722*d[i+2])));return out;
  }
  function blurCanvas(src,px){if(px<=0)return src;const cv=document.createElement('canvas');cv.width=src.width;cv.height=src.height;const ctx=cv.getContext('2d');ctx.filter=`blur(${px}px)`;ctx.drawImage(src,0,0);ctx.filter='none';return cv;}
  function hybridBinarize(lum,w,h) {
    const BS=8,MIN=24,sw=Math.ceil(w/BS),sh=Math.ceil(h/BS),bp=Array.from({length:sh},()=>new Float32Array(sw));
    const cap=(v,max)=>v<2?2:Math.min(v,max);
    for(let by=0;by<sh;by++)for(let bx=0;bx<sw;bx++){
      const xo=Math.min(bx*BS,w-BS),yo=Math.min(by*BS,h-BS);let sum=0,min=255,max=0;
      for(let y=0;y<BS;y++)for(let x=0;x<BS;x++){const p=lum[(yo+y)*w+xo+x];sum+=p;if(p<min)min=p;if(p>max)max=p;}
      let avg=sum/64;if(max-min<=MIN){avg=min/2;if(by>0&&bx>0){const nb=(bp[by-1][bx]+2*bp[by][bx-1]+bp[by-1][bx-1])/4;if(min<nb)avg=nb;}}bp[by][bx]=avg;
    }
    const out=new Uint8Array(w*h),thresholds=Array.from({length:sh},()=>new Float32Array(sw));
    for(let by=0;by<sh;by++)for(let bx=0;bx<sw;bx++){
      const left=cap(bx,sw-3),top=cap(by,sh-3);let sum=0;for(let yy=-2;yy<=2;yy++)for(let xx=-2;xx<=2;xx++)sum+=bp[top+yy][left+xx];const th=sum/25;thresholds[by][bx]=th;
      const xo=Math.min(bx*BS,w-BS),yo=Math.min(by*BS,h-BS);for(let y=0;y<BS;y++)for(let x=0;x<BS;x++){const idx=(yo+y)*w+xo+x;out[idx]=lum[idx]<=th?1:0;}
    }
    return {out,thresholds,bp};
  }

  function surrogateCheck() {
    const q=state.qr;if(!q)return null;const ppm=8,src=renderScannerCanvas(ppm,q),blur=blurCanvas(src,ppm*Number(sx.blurFrac.value)/100),lum=grayPixels(blur),bin=hybridBinarize(lum,blur.width,blur.height),margin=4;
    let wrong=0,minMargin=1,correct=0;const wrongStreams=new Set(),byBlock=new Map();
    for(let r=0;r<q.size;r++)for(let c=0;c<q.size;c++){
      const x=Math.floor((margin+c+.5)*ppm),y=Math.floor((margin+r+.5)*ppm),idx=y*blur.width+x,observed=!!bin.out[idx],expected=currentDark(r,c),br=Math.floor(y/8),bc=Math.floor(x/8),th=bin.thresholds[br]?.[bc]??128,L=lum[idx],marg=Math.abs(L-th)/255;minMargin=Math.min(minMargin,marg);
      if(observed!==expected){wrong++;const m=q.meta[r][c];if(m?.kind==='codeword'){wrongStreams.add(m.streamIndex);if(!byBlock.has(m.blockId))byBlock.set(m.blockId,new Set());byBlock.get(m.blockId).add(m.streamIndex);}}else correct++;
    }
    const blockText=q.blocks.map(b=>{const n=byBlock.get(b.id)?.size||0;return `B${b.id}:${n}/${b.correctionCapacity}`;}).join('  ');
    return {wrong,correct,wrongStreams,byBlock,minMargin,blockText,canvas:blur};
  }

  function scannerCheck() {
    try{const x=surrogateCheck();if(!x)return;els.decoderResults.textContent=`LOCAL-THRESHOLD SURROGATE · jsQR/ZXing-inspired\n\nSampled module errors: ${x.wrong} / ${x.wrong+x.correct}\nAffected RS codewords: ${x.wrongStreams.size}\nPer-block sampled errors: ${x.blockText}\nMinimum center-vs-local-threshold margin: ${(x.minMargin*100).toFixed(1)}% luminance\nBlur: ${sx.blurFrac.value}% of a module\n\nThis is a fast rendering surrogate, not a substitute for running independent real decoders/camera transforms. It implements the important 8×8 local black-point + 5×5-neighborhood threshold behavior and samples module centers.`;}catch(e){els.decoderResults.textContent=`Threshold surrogate error: ${e.message||e}`;}
  }

  function scannerSvg() {
    const q=state.qr;if(!q)return '';const margin=4,N=q.size+8,g=smileyGeom(),noise=Number(sx.noiseFill.value)/100,lg=Number(sx.lightGuard.value)/100,dk=Number(sx.darkKernel.value)/100;
    const light=Math.round(Number(sx.lightLum.value)*2.55),dark=Math.round(Number(sx.darkLum.value)*2.55);let s=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${N} ${N}" shape-rendering="geometricPrecision"><rect width="${N}" height="${N}" fill="white"/>`;
    for(let r=0;r<q.size;r++)for(let c=0;c<q.size;c++){const m=q.meta[r][c];if(!currentDark(r,c)||m?.kind==='function')continue;const x=margin+c+.5-noise/2,y=margin+r+.5-noise/2;s+=`<rect x="${x}" y="${y}" width="${noise}" height="${noise}" rx="${noise*.24}" fill="#174a9c"/>`;}
    if(g){const X=x=>margin+x,Y=y=>margin+y;s+=`<circle cx="${X(g.cx)}" cy="${Y(g.cy)}" r="${g.R}" fill="none" stroke="#05070b" stroke-width="${g.stroke}"/><circle cx="${X(g.cx-g.eyeDX)}" cy="${Y(g.eyeY)}" r="${g.eyeR}" fill="#05070b"/><circle cx="${X(g.cx+g.eyeDX)}" cy="${Y(g.eyeY)}" r="${g.eyeR}" fill="#05070b"/><path d="M ${X(g.cx-g.mouthRX)} ${Y(g.mouthTop)} L ${X(g.cx+g.mouthRX)} ${Y(g.mouthTop)} A ${g.mouthRX} ${g.mouthRY} 0 0 1 ${X(g.cx-g.mouthRX)} ${Y(g.mouthTop)} Z" fill="#05070b"/>`;}
    for(let r=0;r<q.size;r++)for(let c=0;c<q.size;c++){const m=q.meta[r][c];if(!m||m.kind==='function')continue;const logical=currentDark(r,c),cx=margin+c+.5,cy=margin+r+.5,art=g?artDarkAt(c+.5,r+.5,g):!!state.target?.dark?.[r]?.[c];if(!logical&&art){s+=`<rect x="${cx-lg/2}" y="${cy-lg/2}" width="${lg}" height="${lg}" rx="${lg*.35}" fill="rgb(${light},${light},${light})"/>`;}if(logical){s+=`<rect x="${cx-dk/2}" y="${cy-dk/2}" width="${dk}" height="${dk}" rx="${dk*.35}" fill="rgb(${dark},${dark},${dark})"/>`;}}
    for(let r=0;r<q.size;r++)for(let c=0;c<q.size;c++){const m=q.meta[r][c];if(m?.kind!=='function')continue;s+=`<rect x="${margin+c}" y="${margin+r}" width="1" height="1" fill="${currentDark(r,c)?'#06133d':'white'}"/>`;}
    return s+'</svg>';
  }
  function exportSvg(){const svg=scannerSvg();if(!svg)return;const a=document.createElement('a'),blob=new Blob([svg],{type:'image/svg+xml'});a.href=URL.createObjectURL(blob);a.download='artistic-qr-scanner-aware.svg';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),2000);}

  sx.steerPads.addEventListener('click',steerFreePads);
  sx.scannerPreview.addEventListener('click',()=>{els.overlay.value='scanner';renderAll();scannerCheck();});
  sx.scannerCheck.addEventListener('click',scannerCheck);
  sx.exportScannerSvg.addEventListener('click',exportSvg);
  [sx.lightLum,sx.darkLum,sx.lightGuard,sx.darkKernel,sx.noiseFill].forEach(el=>el.addEventListener('input',()=>{if(els.overlay.value==='scanner')draw();}));
})();
