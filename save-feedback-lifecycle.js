// Compatible with feedback panels already loaded from an older cached module.
export function initSaveFeedbackLifecycle(doc=document,{setTimer=setTimeout,clearTimer=clearTimeout,Observer=MutationObserver}={}){
 const panels=new WeakMap();
 function attach(panel){if(panels.has(panel))return;
  const state={timer:null,signature:''};panels.set(panel,state);
  const cancel=()=>{clearTimer(state.timer);state.timer=null;};
  function hide(){cancel();try{panel.hidePopover?.();}catch{}panel.hidden=true;panel.style.setProperty('display','none','important');}
  function refresh(records=[]){if(panel.hidden||!panel.isConnected){cancel();return;}
   const reopened=records.some(r=>r.type==='attributes'&&r.attributeName==='hidden'&&r.oldValue!==null);
   const kind=panel.dataset.state,signature=kind+'|'+(panel.querySelector('strong')?.textContent||'')+'|'+(panel.querySelector('small')?.textContent||'');
   if(!reopened&&signature===state.signature)return;
   state.signature=signature;cancel();panel.style.removeProperty('display');
   try{if(panel.hasAttribute('popover')&&!panel.matches(':popover-open'))panel.showPopover?.();}catch{}
   if(kind==='saved')state.timer=setTimer(hide,4000);
   else if(kind==='error')state.timer=setTimer(hide,10000);
  }
  const close=panel.querySelector('button');if(close)close.onclick=event=>{event.preventDefault();event.stopImmediatePropagation();hide();};
  new Observer(refresh).observe(panel,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['data-state','hidden'],attributeOldValue:true});refresh();
 }
 function scan(){doc.querySelectorAll('.geslimp-save-feedback').forEach(attach);}
 new Observer(scan).observe(doc.body,{childList:true,subtree:true});scan();
}
if(typeof document!=='undefined'){
 if(document.body)initSaveFeedbackLifecycle();else document.addEventListener('DOMContentLoaded',()=>initSaveFeedbackLifecycle(),{once:true});
}
