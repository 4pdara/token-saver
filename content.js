(() => {
  console.log('[Token Saver v5.1.1] target language + send button');
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
  function findInput(root=document){
    for(const selector of ['#prompt-textarea', 'div[contenteditable="true"][data-placeholder]', 'div[contenteditable="true"]', 'textarea']){
      const input=Array.from(root.querySelectorAll(selector)).find(el=>el.getClientRects().length && !el.disabled && !el.readOnly);
      if(input) return input;
    }
    return null;
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
  let sending=false;
  const readInput=input=>input.tagName==='TEXTAREA'?input.value:(input.innerText||'');

  function stopSubmission(event){
    event.preventDefault();
    event.stopImmediatePropagation();
  }

  function isSendButton(button,input){
    if(button.disabled || button.getAttribute('aria-disabled')==='true') return false;
    if(button.matches('[data-testid="send-button"]')) return true;
    const label=(button.getAttribute('aria-label')||button.getAttribute('title')||'').trim();
    const actionLabel=label.split(/\s*[\[(]/,1)[0].trim();
    if(/^(send(?: message| prompt)?|שליחה|שלח|שליחת הודעה|שלח הודעה)$/i.test(actionLabel)) return true;
    const form=input.closest('form');
    return !!form && button.form===form && button.type==='submit';
  }

  function findSendButton(input){
    // Prefer the nearest composer, so another chat or feedback form cannot be sent.
    const form=input.closest('form');
    for(let root=input.parentElement; root; root=root.parentElement){
      const button=Array.from(root.querySelectorAll('button,input[type="submit"],[role="button"]'))
        .find(el=>el.getClientRects().length && isSendButton(el,input));
      if(button) return button;
      if(root===form) break;
    }
    return null;
  }

  function findButtonInput(button){
    const form=button.closest('form');
    if(form) return findInput(form);
    for(let root=button.parentElement; root; root=root.parentElement){
      const input=findInput(root);
      if(input) return input;
    }
    return null;
  }

  function writeInput(input,text){
    if(input.tagName==='TEXTAREA'){
      // Bypass a framework's value tracker, then notify its input handler.
      const setter=Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype,'value').set;
      setter.call(input,text);
    } else {
      input.focus();
      document.execCommand('selectAll',false,null);
      document.execCommand('insertText',false,text);
    }
    input.dispatchEvent(new InputEvent('input',{bubbles:true,inputType:'insertText',data:text}));
  }

  async function translateAndSend(event,input,clickedButton=null){
    if(sending || !enabled) return;
    if(busy){ stopSubmission(event); return; }
    const original=readInput(input);
    if(!original.trim() || !isNonTargetLang(original)) return;
    stopSubmission(event);
    busy=true;
    const requestedTarget=targetLang;
    try{
      const {text:prot,store}=protect(original);
      const {translated,detected}=await translateFree(prot,'auto',requestedTarget);
      // Keep a draft intact if it was edited, disabled, or given a new target in flight.
      if(!input.isConnected || readInput(input)!==original || !enabled || targetLang!==requestedTarget) return;
      const finalText=detected===requestedTarget ? original : restore(translated,store);
      if(finalText!==original) writeInput(input,finalText);
      await new Promise(resolve=>setTimeout(resolve,100));
      if(!input.isConnected || readInput(input)!==finalText || !enabled || targetLang!==requestedTarget) return;
      const button=clickedButton?.isConnected && isSendButton(clickedButton,input)
        ? clickedButton : findSendButton(input);
      sending=true;
      if(button){
        button.click();
      } else if(input.closest('form')){
        input.closest('form').requestSubmit();
      } else {
        input.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',code:'Enter',keyCode:13,bubbles:true,cancelable:true}));
      }
    }catch(err){ console.error(err); }
    finally { sending=false; busy=false; }
  }

  // Capture before the site's composer handlers, including handlers on document.
  window.addEventListener('keydown',e=>{
    if(!(e.target instanceof Element) || e.key!=='Enter' || e.shiftKey || e.isComposing) return;
    const input=findInput(e.target.closest('form')||document);
    if(!input || !input.contains(e.target)) return;
    void translateAndSend(e,input);
  },true);

  window.addEventListener('click',e=>{
    if(!(e.target instanceof Element)) return;
    const button=e.target.closest('button,input[type="submit"],[role="button"]');
    if(!button) return;
    const input=findButtonInput(button);
    if(!input || !isSendButton(button,input)) return;
    void translateAndSend(e,input,button);
  },true);

  window.addEventListener('submit',e=>{
    const input=findInput(e.target);
    if(input) void translateAndSend(e,input,e.submitter);
  }, true);
})();
