const INTERVAL=10*60*1000;
export function initMailUpdates({api,ready,onInboxUpdate,openInbox}){
 let active=false,generation=0,inflight=false,lastCheck=0,baseline=null,unread=0,toast=null,hideTimer=null;
 function paint(){
  const nav=document.querySelector('[data-page="email"]');if(nav){let badge=nav.querySelector('.email-unread-count');if(!badge){badge=document.createElement('span');badge.className='email-unread-count';nav.appendChild(badge);}badge.hidden=!active||!unread;badge.textContent=unread>99?'99+':String(unread);badge.setAttribute('aria-label',unread+' emails não lidos');}
  const section=document.getElementById('notifications');if(section){let card=document.getElementById('email-notification-card');if(!card){card=document.createElement('div');card.id='email-notification-card';card.className='card';section.prepend(card);}card.hidden=!active||!unread;card.innerHTML='<h2>Email</h2><p>'+unread+(unread===1?' email por ler.':' emails por ler.')+'</p><button class="btn" type="button">Abrir caixa de entrada</button>';card.querySelector('button').onclick=()=>openInbox();}
 }
 function notify(count){if(!toast){toast=document.createElement('div');toast.className='email-new-notification';toast.setAttribute('role','status');toast.setAttribute('aria-live','polite');document.body.appendChild(toast);}clearTimeout(hideTimer);toast.hidden=false;toast.innerHTML='<span aria-hidden="true">✉</span><button type="button">'+(count===1?'Recebeste um novo email':count+' novos emails')+'</button><button type="button" aria-label="Fechar aviso">×</button>';toast.querySelector('button').onclick=()=>{toast.hidden=true;openInbox();};toast.querySelector('[aria-label]').onclick=()=>toast.hidden=true;hideTimer=setTimeout(()=>toast.hidden=true,5000);}
 async function sync(force=false){if(!active||inflight||!ready()||document.hidden||globalThis.navigator?.onLine===false||(!force&&lastCheck&&Date.now()-lastCheck<INTERVAL))return;
  const stamp=generation;inflight=true;lastCheck=Date.now();try{const r=await api('poll',{lastUid:baseline?.latestUid||0,validity:baseline?.validity||0});if(stamp!==generation||!active)return;
   const changed=baseline&&r.validity===baseline.validity&&r.newCount>0;
   baseline={validity:r.validity,latestUid:baseline?.validity===r.validity?Math.max(baseline.latestUid,r.latestUid):r.latestUid};unread=r.unread;paint();if(changed){notify(r.newCount);onInboxUpdate();}
  }catch{/* Polling failures keep the previous badge; the mailbox shows explicit errors on refresh. */}finally{if(stamp===generation)inflight=false;}
 }
 function start(){if(active){sync();return;}active=true;generation++;lastCheck=0;baseline=null;unread=0;paint();sync();}
 function stop(){active=false;generation++;inflight=false;lastCheck=0;baseline=null;unread=0;clearTimeout(hideTimer);if(toast)toast.hidden=true;paint();}
 const timer=setInterval(()=>sync(),INTERVAL);document.addEventListener('visibilitychange',()=>sync());window.addEventListener('focus',()=>sync());
 return {start,stop,sync,paint,destroy(){stop();clearInterval(timer);}};
}
