
const select=document.getElementById('targetLang');
const curTargetEl=document.getElementById('curTarget');
const savingEl=document.getElementById('saving');
const savings={en:'64%',zh:'40%',es:'30%',fr:'30%',de:'30%',ru:'50%',ja:'35%',ko:'35%',ar:'55%',he:'0%',hi:'60%',pt:'30%',it:'30%',tr:'35%',th:'45%',vi:'40%'};
function updateUI(code){ const up=code.toUpperCase(); if(curTargetEl) curTargetEl.textContent=up; if(savingEl) savingEl.textContent=savings[code]||'30%'; }
chrome.storage.local.get(['targetLang']).then(s=>{ const lang=s.targetLang||'en'; select.value=lang; updateUI(lang); });
select.addEventListener('change', async()=>{ const val=select.value; await chrome.storage.local.set({targetLang:val}); updateUI(val); });
document.getElementById('copy').onclick=()=>{ const txt=document.getElementById('instruction').textContent; navigator.clipboard.writeText(txt); const btn=document.getElementById('copy'); btn.textContent='Copied!'; setTimeout(()=>btn.textContent='Copy instruction',1500); };
