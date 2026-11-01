(() => {
  console.log('[Token Saver v5.1] universal + targetLang');
  let enabled=true, targetLang='en', pos={top:20,right:20};
  chrome.storage.local.get(['enabled','bubblePos','targetLang']).then(s=>{
    if(s.enabled===false) enabled=false;
    if(s.targetLang) targetLang=s.targetLang;
    if(s.bubblePos) pos=s.bubblePos;
    injectBubble();
  });
  chrome.storage.onChanged.addListener(c=>{
    if(c.enabled){enabled=c.enabled.newValue!==false; updateBubble();}
    if(c.targetLang){targetLang=c.targetLang.newValue||'en'; updateBubble();}
  });
  function isNonTargetLang(text){
    if(!text||text.trim().length<8) return false;
    const letters=text.match(/\p{L}/gu)||[];
    if(letters.length<5) return false;
    let nonAscii=0;
    for(const ch of letters){ if(ch.codePointAt(0)>127) nonAscii++; }
    const ratio=nonAscii/letters.length;
    const nonAsciiChars=(text.match(/[^\x00-\x7F]/g)||[]).length;
    const totalNoSpace=text.replace(/\s/g,'').length;
    const charRatio=totalNoSpace>0?nonAsciiChars/totalNoSpace:0;
    if(targetLang==='en'){ return ratio>0.25||charRatio>0.20; }
    return ratio>0.20||charRatio>0.15;
  }
  function protect(text){
    const store=[]; let i=0;
    text=text.replace(/```[\s\S]*?```/g,m=>{const ph=`__CB_${i}__`; store.push({ph,val:m}); i++; return ph;});
    text=text.replace(/`[^`\n]+`/g,m=>{const ph=`__CI_${i}__`; store.push({ph,val:m}); i++; return ph;});
    text=text.replace(/https?:\/\/\S+/g,m=>{const ph=`__URL_${i}__`; store.push({ph,val:m}); i++; return ph;});
    return {text,store};
  }
  function restore(text,store){ for(const {ph,val} of store) text=text.replaceAll(ph,val); return text; }
  async function translateFree(text, sl='auto', tl='en'){
    const chunks=[]; for(let j=0;j<text.length;j+=800) chunks.push(text.slice(j,j+800));
    let full='', detected='auto';
    for(const ch of chunks){
      const url=`https://translate.googleapis.com/translate_a/single?client=gtx&sl=${sl}&tl=${tl}&dt=t&q=${encodeURIComponent(ch)}`;
      const r=await fetch(url); if(!r.ok) throw new Error('Translate failed '+r.status);
      const d=await r.json(); full+=d[0].map(x=>x[0]).join(''); if(d[2]) detected=d[2];
      await new Promise(r=>setTimeout(r,40));
    }
    return {translated:full, detected};
  }
  function findInput(){
    let el=document.querySelector('div[contenteditable="true"][data-placeholder]'); if(el) return el;
    el=document.querySelector('div[contenteditable="true"]'); if(el) return el;
    el=document.querySelector('#prompt-textarea'); if(el) return el;
    return document.querySelector('textarea');
  }
  function injectBubble(){
    if(document.getElementById('he-en-bubble')) return;
    const b=document.createElement('div'); b.id='he-en-bubble';
    b.innerHTML=`<span id="he-en-bubble-icon">🌐</span><div id="he-en-bubble-dot"></div><div id="he-en-bubble-tooltip">Token Saver • drag</div>`;
    if(pos.top!==undefined) b.style.top=pos.top+'px';
    if(pos.left!==undefined){ b.style.left=pos.left+'px'; b.style.right='auto'; }
    else if(pos.right!==undefined){ b.style.right=pos.right+'px'; b.style.top=pos.top+'px'; }
    document.body.appendChild(b); updateBubble(); makeDraggable(b);
  }
  function langLabel(code){ const map={en:'EN',he:'HE',ar:'AR',ru:'RU',zh:'ZH',ja:'JA',ko:'KO',es:'ES',fr:'FR',de:'DE',hi:'HI',pt:'PT',it:'IT'}; return map[code]||code.toUpperCase(); }
  function updateBubble(){
    const el=document.getElementById('he-en-bubble'); if(!el) return;
    el.className=enabled?'he-en-on':'he-en-off';
    const tip=document.getElementById('he-en-bubble-tooltip');
    const icon=document.getElementById('he-en-bubble-icon');
    if(icon) icon.textContent=langLabel(targetLang);
    if(tip) tip.textContent=enabled?`ON → ${langLabel(targetLang)} • click off • drag`:`OFF • click on`;
  }
  function makeDraggable(el){
    let dragging=false, hasDragged=false, startX, startY, offX, offY;
    el.addEventListener('mousedown', e=>{
      dragging=true; hasDragged=false;
      const rect=el.getBoundingClientRect(); offX=e.clientX-rect.left; offY=e.clientY-rect.top;
      startX=e.clientX; startY=e.clientY;
      el.style.transition='none'; el.style.cursor='grabbing'; e.preventDefault();
    });
    document.addEventListener('mousemove', e=>{
      if(!dragging) return;
      if(Math.abs(e.clientX-startX)>3||Math.abs(e.clientY-startY)>3) hasDragged=true;
      let l=e.clientX-offX, t=e.clientY-offY;
      l=Math.max(0,Math.min(l,window.innerWidth-44)); t=Math.max(0,Math.min(t,window.innerHeight-44));
      el.style.left=l+'px'; el.style.top=t+'px'; el.style.right='auto';
    });
    document.addEventListener('mouseup', async ()=>{
      if(!dragging) return; dragging=false; el.style.transition=''; el.style.cursor='grab';
      if(hasDragged){
        const r=el.getBoundingClientRect();
        pos={left:Math.round(r.left), top:Math.round(r.top)};
        await chrome.storage.local.set({bubblePos:pos});
        setTimeout(()=>{hasDragged=false;},100);
      }else{
        const s=await chrome.storage.local.get(['enabled']);
        await chrome.storage.local.set({enabled:s.enabled===false?true:false});
      }
    });
  }
  let busy=false;
  document.addEventListener('keydown', async e=>{
    if(busy||!enabled||e.key!=='Enter'||e.shiftKey||e.isComposing) return;
    const input=findInput(); if(!input) return;
    let txt=input.tagName==='TEXTAREA'?input.value:(input.innerText||'');
    if(!txt.trim()||!isNonTargetLang(txt)) return;
    e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation(); busy=true;
    try{
      const {text:prot,store}=protect(txt);
      const {translated, detected}=await translateFree(prot, 'auto', targetLang);
      if(detected&&detected===targetLang){ busy=false; return; }
      const finalText=restore(translated,store);
      if(input.tagName==='TEXTAREA'){ input.value=finalText; input.dispatchEvent(new Event('input',{bubbles:true})); }
      else{ input.focus(); document.execCommand('selectAll',false,null); document.execCommand('insertText',false,finalText); input.dispatchEvent(new InputEvent('input',{bubbles:true})); }
      setTimeout(()=>{ busy=false; const ev=new KeyboardEvent('keydown',{key:'Enter',code:'Enter',keyCode:13,bubbles:true}); input.dispatchEvent(ev); const btn=document.querySelector('button[aria-label*="Send"]')||document.querySelector('[data-testid="send-button"]'); if(btn) btn.click(); },100);
    }catch(err){ console.error(err); busy=false; }
  }, true);
})();
