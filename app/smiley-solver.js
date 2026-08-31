/* Artistic QR Lab — Vector Target Solver V0.1
 * Loaded after the core single-page lab. It adds a parametric smiley optimizer without
 * disturbing the core QR/RS navigator. The solver is intentionally block-aware: one or
 * many flipped modules inside a single 8-bit QR codeword cost one RS error symbol.
 */
(() => {
  const grid=document.querySelector('.toolGrid'), row=document.querySelector('.toolRow');
  if(!grid||!row||document.getElementById('autoSmiley')) return;

  grid.insertAdjacentHTML('beforeend', `
    <label>Vector smiley <select id="smileyProfile"><option value="economy" selected>economy · ink + halo</option><option value="clean">clean white face</option></select></label>
    <label class="inlineCheck"><input id="smileySearchMasks" type="checkbox" checked/> search all 8 masks</label>
    <label class="wide">Minimum visual fit <div class="rangeRow"><input id="smileyFit" type="range" min="50" max="95" value="68"/><span id="smileyFitLabel">68% weighted target fit</span></div></label>`);
  const centerBtn=document.getElementById('smiley');
  centerBtn?.insertAdjacentHTML('afterend','<button id="autoSmiley" class="good">Auto-fit largest smiley</button>');
  const exportBtn=document.getElementById('exportPng');
  if(exportBtn){exportBtn.textContent='Export binary PNG';exportBtn.insertAdjacentHTML('afterend','<button id="exportStyled" class="secondary">Export styled PNG</button>');}
  if(!Array.from(els.overlay.options).some(o=>o.value==='art')) els.overlay.add(new Option('semantic art · target black / code blue','art'));

  const sx={
    profile:document.getElementById('smileyProfile'), searchMasks:document.getElementById('smileySearchMasks'),
    fit:document.getElementById('smileyFit'), fitLabel:document.getElementById('smileyFitLabel'),
    auto:document.getElementById('autoSmiley'), exportStyled:document.getElementById('exportStyled')
  };

  // Add a human-perception channel without altering the logical matrix: target-dark modules are
  // black; other scanner-dark modules are navy. Both remain comfortably dark against white.
  const coreBaseColorFor=baseColorFor;
  baseColorFor=function(m,dark,overlay){
    if(overlay!=='art') return coreBaseColorFor(m,dark,overlay);
    if(!m||!dark) return '#ffffff';
    if(m.kind==='function') return '#0d2a69';
    const tr=state.target;
    if(tr&&tr.size===state.qr?.size&&tr.active?.[m.row]?.[m.col]&&tr.dark[m.row][m.col]) return '#05070b';
    return '#174a9c';
  };

  function targetGrid(n){return{size:n,dark:Array.from({length:n},()=>Array(n).fill(false)),active:Array.from({length:n},()=>Array(n).fill(false)),weight:Array.from({length:n},()=>Array(n).fill(1)),label:'',params:null};}
  function vectorSmileyTarget(n,opts={}){
    const t=targetGrid(n),cx=opts.cx??(n-1)/2,cy=opts.cy??(n-1)/2,R=opts.radius??n*.29,profile=opts.profile||'economy';
    const stroke=Math.max(.9,opts.stroke??R*.065),eyeR=Math.max(1.15,opts.eyeR??R*.105),eyeY=cy-R*.27,eyeDX=R*.34;
    const mouthTop=cy+R*.12,mouthRX=R*.49,mouthRY=R*.38,dark=Array.from({length:n},()=>Array(n).fill(false));
    for(let r=0;r<n;r++)for(let c=0;c<n;c++){
      const x=c-cx,y=r-cy,d=Math.hypot(x,y),ring=Math.abs(d-R)<=stroke*.5;
      const eye=Math.hypot(c-(cx-eyeDX),r-eyeY)<=eyeR||Math.hypot(c-(cx+eyeDX),r-eyeY)<=eyeR;
      const nx=(c-cx)/mouthRX,ny=(r-mouthTop)/mouthRY,mouth=r>=mouthTop&&nx*nx+ny*ny<=1;
      dark[r][c]=ring||eye||mouth;
    }
    if(profile==='clean'){
      const faceR=R-stroke*.72;
      for(let r=0;r<n;r++)for(let c=0;c<n;c++){
        const d=Math.hypot(c-cx,r-cy);if(d>R+stroke*.9)continue;
        t.active[r][c]=true;t.dark[r][c]=dark[r][c];t.weight[r][c]=dark[r][c]?1.6:(d<=faceR ? .62 : .42);
      }
    }else{
      const halo=Math.max(1,Math.min(1.65,stroke*.58));
      for(let r=0;r<n;r++)for(let c=0;c<n;c++){
        if(dark[r][c]){t.dark[r][c]=true;t.active[r][c]=true;t.weight[r][c]=1.7;continue;}
        const d=Math.hypot(c-cx,r-cy),nearRing=Math.abs(d-R)<=stroke*.5+halo;
        const nearEye=Math.hypot(c-(cx-eyeDX),r-eyeY)<=eyeR+halo||Math.hypot(c-(cx+eyeDX),r-eyeY)<=eyeR+halo;
        const nx=(c-cx)/(mouthRX+halo),ny=(r-(mouthTop-halo*.20))/(mouthRY+halo),nearMouth=r>=mouthTop-halo&&nx*nx+ny*ny<=1;
        if(nearRing||nearEye||nearMouth){t.active[r][c]=true;t.dark[r][c]=false;t.weight[r][c]=.38;}
      }
    }
    t.label=`vector smiley · ${profile}`;t.params={cx,cy,radius:R,diameter:R*2,stroke,eyeR,profile};return t;
  }

  function planWithinBudget(q,t){
    const frac=Number(els.repairBudget.value)/100,fitFloor=Number(sx.fit.value)/100;
    let total=0,baseMatch=0,remainderGain=0;const remainder=[],groups=new Map();
    for(let r=0;r<q.size;r++)for(let c=0;c<q.size;c++){
      if(!t.active[r][c])continue;const desired=!!t.dark[r][c],w=t.weight[r][c]??1,base=!!q.modules[r][c];total+=w;
      if(base===desired){baseMatch+=w;continue;}const m=q.meta[r][c];if(!m||m.kind==='function')continue;
      if(m.kind==='remainder'){remainderGain+=w;remainder.push({r,c,dark:desired,weight:w});continue;}
      let g=groups.get(m.streamIndex);if(!g){g={streamIndex:m.streamIndex,blockId:m.blockId,benefit:0,flips:[]};groups.set(m.streamIndex,g);}
      g.benefit+=w;g.flips.push({r,c,dark:desired,weight:w});
    }
    const limits=new Map(q.blocks.map(b=>[b.id,Math.floor(b.correctionCapacity*frac)])),used=new Map(q.blocks.map(b=>[b.id,0]));
    const sorted=Array.from(groups.values()).sort((a,b)=>b.benefit-a.benefit||a.flips.length-b.flips.length||a.streamIndex-b.streamIndex);
    const selected=[];let gained=remainderGain,required=Math.max(0,fitFloor*total-baseMatch);
    for(const g of sorted){if(gained>=required)break;if((used.get(g.blockId)||0)>=(limits.get(g.blockId)||0))continue;selected.push(g);used.set(g.blockId,(used.get(g.blockId)||0)+1);gained+=g.benefit;}
    const maxUsed=new Map(q.blocks.map(b=>[b.id,0]));let maxGain=remainderGain;
    for(const g of sorted){if((maxUsed.get(g.blockId)||0)>=(limits.get(g.blockId)||0))continue;maxUsed.set(g.blockId,(maxUsed.get(g.blockId)||0)+1);maxGain+=g.benefit;}
    const achieved=total?Math.min(1,(baseMatch+gained)/total):1,maxFit=total?Math.min(1,(baseMatch+maxGain)/total):1;
    return{fitFloor,total,baseMatch,remainder,selected,used,limits,achieved,maxFit,meets:achieved+1e-9>=fitFloor,codewords:selected.length,moduleFlips:remainder.length+selected.reduce((n,g)=>n+g.flips.length,0)};
  }
  function applyPlan(q,t,p){state.qr=q;state.target=t;state.selection=null;state.edits=new Map();for(const x of p.remainder)setOverride(x.r,x.c,x.dark);for(const g of p.selected)for(const x of g.flips)setOverride(x.r,x.c,x.dark);}
  function better(a,b){
    if(!a)return b;if(a.plan.meets!==b.plan.meets)return b.plan.meets?b:a;if(Math.abs(a.R-b.R)>.24)return b.R>a.R?b:a;
    if(a.plan.meets&&a.plan.codewords!==b.plan.codewords)return b.plan.codewords<a.plan.codewords?b:a;
    if(Math.abs(a.plan.achieved-b.plan.achieved)>.002)return b.plan.achieved>a.plan.achieved?b:a;
    if(a.plan.moduleFlips!==b.plan.moduleFlips)return b.plan.moduleFlips<a.plan.moduleFlips?b:a;
    return b.q.penalty<a.q.penalty?b:a;
  }
  async function autoFit(){
    if(!state.qr)return;const old=sx.auto.textContent;sx.auto.disabled=true;sx.auto.textContent='Searching…';await new Promise(r=>setTimeout(r,0));
    try{
      const opts={mode:els.mode.value,ecc:els.ecc.value,version:els.version.value,padMode:els.padMode.value};
      const masks=sx.searchMasks.checked?[0,1,2,3,4,5,6,7]:[els.mask.value==='auto'?state.qr.mask:Number(els.mask.value)],qs=masks.map(mask=>buildQR(els.payload.value,{...opts,mask}));
      const n=qs[0].size,profile=sx.profile.value,maxR=n*.455,minR=Math.max(5,n*.18),radii=[];for(let R=maxR;R>=minR;R-=1)radii.push(R);
      const offsets=[0,-1,1],strokes=[.058,.074];let best=null,evaluated=0;
      outer:for(const R of radii){let br=null;for(const q of qs)for(const dy of offsets)for(const dx of offsets)for(const ss of strokes){const t=vectorSmileyTarget(n,{radius:R,cx:(n-1)/2+dx,cy:(n-1)/2+dy,stroke:R*ss,profile}),plan=planWithinBudget(q,t),cand={q,t,plan,R,dx,dy};evaluated++;br=better(br,cand);}best=better(best,br);if(br?.plan.meets){best=br;break outer;}}
      if(!best)throw new Error('No smiley candidates evaluated.');els.mask.value=String(best.q.mask);applyPlan(best.q,best.t,best.plan);els.overlay.value='art';els.showTarget.checked=false;renderAll();
      const p=best.plan,pct=Math.round(best.R*2/n*100),perBlock=best.q.blocks.map(b=>`B${b.id}:${p.used.get(b.id)||0}/${p.limits.get(b.id)||0}`).join('  ');
      els.decoderResults.textContent=`${p.meets?'PASS':'BEST EFFORT'} · budget-aware vector smiley\n\nDiameter: ${best.t.params.diameter.toFixed(1)} modules (${pct}% of QR width)\nMask: ${best.q.mask}\nCenter offset: (${best.dx}, ${best.dy}) modules\nProfile: ${profile}\nWeighted visual fit: ${(p.achieved*100).toFixed(1)}% (requested ≥ ${sx.fit.value}%)\nMaximum fit available at this geometry/budget: ${(p.maxFit*100).toFixed(1)}%\nCorrupted RS codewords spent: ${p.codewords}\nPhysical module flips: ${p.moduleFlips}\nPer-block spend: ${perBlock}\nCandidates evaluated: ${evaluated}\n\nThe solver searches legal masks, maximizes diameter, and then spends the fewest high-value codewords needed to hit the visual-fit floor without exceeding any block's intentional RS budget. Next: valid payload/pad steering before damage.`;
    }catch(e){els.decoderResults.textContent=`Auto-fit error: ${e.message||e}`;}finally{sx.auto.disabled=false;sx.auto.textContent=old;renderAll();}
  }
  function styledCanvas(modulePx=20){const q=state.qr,margin=4,cv=document.createElement('canvas');cv.width=(q.size+8)*modulePx;cv.height=cv.width;const ctx=cv.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,cv.width,cv.height);for(let r=0;r<q.size;r++)for(let c=0;c<q.size;c++){if(!currentDark(r,c))continue;const m=q.meta[r][c],tr=state.target;ctx.fillStyle=m?.kind==='function'?'#0d2a69':(tr&&tr.size===q.size&&tr.active[r][c]&&tr.dark[r][c]?'#05070b':'#174a9c');ctx.fillRect((c+margin)*modulePx,(r+margin)*modulePx,modulePx,modulePx);}return cv;}
  function exportStyled(){const cv=styledCanvas(),a=document.createElement('a');a.download='artistic-qr-styled.png';a.href=cv.toDataURL('image/png');a.click();}

  sx.fit.addEventListener('input',()=>sx.fitLabel.textContent=`${sx.fit.value}% weighted target fit`);
  sx.auto.addEventListener('click',autoFit);sx.exportStyled?.addEventListener('click',exportStyled);
})();
