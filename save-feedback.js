function ensureFeedbackStyle(){if(document.getElementById('geslimp-feedback-style'))return;
  const style=document.createElement('style');style.id='geslimp-feedback-style';style.textContent=`
.geslimp-save-feedback{position:fixed;inset:auto 16px 40px auto;margin:0;box-sizing:border-box;width:min(390px,calc(100vw - 32px));padding:16px;border:1px solid #cee0e8;border-radius:14px;background:#fff;color:#263b48;box-shadow:0 8px 32px #15364b25;font:14px/1.45 Arial,sans-serif;z-index:2147483647;overflow:visible}
.geslimp-save-feedback .gsf-row{display:flex;gap:12px;align-items:center}.geslimp-save-feedback .gsf-icon{font-size:28px;min-width:34px;text-align:center}.geslimp-save-feedback strong{display:block;font-weight:700}.geslimp-save-feedback small{display:block;color:#536b79;font-size:13px;margin-top:3px}.geslimp-save-feedback button{width:32px;min-width:32px;height:32px;padding:0;margin-left:auto;align-self:start;border:0;background:transparent;color:#536b79;font:22px Arial;cursor:pointer}.geslimp-save-feedback[data-state="saving"] .gsf-icon{animation:gsf-sweep .55s ease-in-out infinite alternate;transform-origin:bottom center}.geslimp-save-feedback[data-state="saved"]{background:#eff8f1;border-color:#c5dfcd}.geslimp-save-feedback[data-state="error"]{background:#fff3f1;border-color:#eac9c4}.geslimp-save-feedback[data-state="error"] strong{color:#9c352e}@keyframes gsf-sweep{from{transform:translateX(-4px) rotate(-18deg)}to{transform:translateX(5px) rotate(16deg)}}@media(prefers-reduced-motion:reduce){.geslimp-save-feedback[data-state="saving"] .gsf-icon{animation:none}}@media(max-width:500px){.geslimp-save-feedback{inset:auto 12px 36px 12px;width:auto}}
`;document.head.append(style);
}
export function createSaveTracker(paint,{now=()=>new Date()}={}){
 let pending=0,failed=false,last=null;
 const emit=()=>paint({pending,failed,last});
 return async function track(operation){
  if(!pending)failed=false;
  pending++;emit();
  try{const value=await operation();last=now();return value;}
  catch(error){failed=true;throw error;}
  finally{pending--;emit();}
 };
}
function makeFeedback(){
 let panel,slowTimer,current;
 function ensure(){if(panel)return panel;
  ensureFeedbackStyle();
  panel=document.createElement('aside');panel.className='geslimp-save-feedback';panel.setAttribute('popover','manual');panel.setAttribute('role','status');panel.setAttribute('aria-live','polite');panel.innerHTML='<div class="gsf-row"><span class="gsf-icon" aria-hidden="true"></span><div><strong></strong><small></small></div><button type="button" aria-label="Fechar confirmação">×</button></div>';panel.hidden=true;document.body.append(panel);panel.querySelector('button').onclick=()=>{panel.hidePopover?.();panel.hidden=true;};return panel;
 }
 return state=>{
  current=state;clearTimeout(slowTimer);const p=ensure(),pending=state.pending>0;
  p.hidden=false;if(p.showPopover)try{p.showPopover();}catch{}
  p.dataset.state=pending?'saving':state.failed?'error':'saved';
  p.querySelector('button').hidden=pending;
  p.querySelector('.gsf-icon').textContent=pending?'🧹':state.failed?'!':'✓';
  p.querySelector('strong').textContent=pending?'A guardar alteração…':state.failed?'Não foi possível guardar tudo':'Alteração guardada';
  p.querySelector('small').textContent=pending?'A aguardar confirmação da gravação':state.failed?'Consulta o erro no formulário e tenta novamente.':'Confirmado às '+new Intl.DateTimeFormat('pt-PT',{timeZone:'Europe/Lisbon',hour:'2-digit',minute:'2-digit',second:'2-digit'}).format(state.last);
  if(pending)slowTimer=setTimeout(()=>{if(current.pending)p.querySelector('small').textContent=navigator.onLine?'A gravação está a demorar. Aguarda a confirmação.':'Sem ligação. A aguardar confirmação; ainda não está gravado.';},10000);
 };
}
export const trackSave=createSaveTracker(state=>{if(typeof document!=='undefined'){feedback??=makeFeedback();feedback(state);}});
let feedback;

// Bring application messages into view without moving focus away from a form.
export function initNoticePopups(){
 if(typeof document==='undefined'||document.documentElement.dataset.geslimpPopups)return;
 document.documentElement.dataset.geslimpPopups='true';ensureFeedbackStyle();
 const style=document.createElement('style');style.textContent='.geslimp-notice-popup{inset:18px 16px auto auto}.geslimp-notice-popup .gsf-row{align-items:flex-start}.geslimp-notice-popup strong{overflow-wrap:anywhere}.geslimp-notice-popup small:empty{display:none}@media(max-width:500px){.geslimp-notice-popup{inset:12px 12px auto 12px}}';document.head.append(style);
 const popup=document.createElement('aside');popup.className='geslimp-save-feedback geslimp-notice-popup';popup.setAttribute('popover','manual');popup.setAttribute('role','status');popup.setAttribute('aria-live','polite');popup.hidden=true;popup.innerHTML='<div class="gsf-row"><span class="gsf-icon" aria-hidden="true"></span><div><strong></strong><small></small></div><button type="button" aria-label="Fechar aviso">×</button></div>';document.body.append(popup);
 let queue=[],active=null,timer;const recent=new Map();
 function next(){clearTimeout(timer);active=queue.shift();if(!active){popup.hidePopover?.();popup.hidden=true;return;}popup.hidden=false;popup.dataset.state=active.error?'error':'saved';popup.querySelector('.gsf-icon').textContent=active.error?'!':'✓';popup.querySelector('strong').textContent=active.text;popup.querySelector('small').textContent=queue.length?queue.length+' aviso(s) por ver':'';if(popup.showPopover)try{popup.showPopover();}catch{}if(!active.error)timer=setTimeout(next,6500);}
 popup.querySelector('button').onclick=next;
 const selectors='[role="status"],[role="alert"],#cloud-status,#message,[id$="-error"],.reschedule-error,.recovery-status,#team-message,#stock-message';
 const observer=new MutationObserver(mutations=>{
  const elements=new Set();for(const m of mutations){const node=m.target.nodeType===1?m.target:m.target.parentElement;const element=node?.closest(selectors);if(element&&!element.closest('.geslimp-save-feedback'))elements.add(element);}
  for(const element of elements){const clone=element.cloneNode(true);clone.querySelectorAll('button').forEach(b=>b.remove());const text=clone.textContent.trim();if(!text||/^A (guardar|gravar|preparar|carregar|atualizar|aguardar)/i.test(text))continue;
   const now=Date.now();if(now-(recent.get(text)||0)<3000)continue;recent.set(text,now);if(recent.size>100)recent.delete(recent.keys().next().value);
   const error=element.getAttribute('role')==='alert'||element.classList.contains('is-error')||element.classList.contains('error')||/error|erro/.test(element.id)||/não foi|não podes|não é possível|falhou|sem (internet|ligação)|inválid|obrigatóri|escolhe|seleciona|confirma primeiro/i.test(text);
   queue.push({text,error});if(!element.closest('form,dialog'))element.hidden=true;
   if(!active)next();else if(error&&!active.error){queue.unshift(active);active=null;const urgent=queue.pop();queue.unshift(urgent);next();}
  }
 });observer.observe(document.body,{subtree:true,childList:true,characterData:true});
 document.addEventListener('invalid',e=>{const text=e.target.validationMessage;if(!text)return;queue.push({text:(e.target.labels?.[0]?.textContent.trim()||'Campo obrigatório')+': '+text,error:true});if(!active)next();},true);
}
if(typeof document!=='undefined')initNoticePopups();
