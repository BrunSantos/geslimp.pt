// Inclui janelas criadas depois do arranque e acompanha o teclado/rotação.
const mobile=matchMedia('(max-width:850px)');let scheduled=false,revealTimer;
function sync(){
 scheduled=false;
 const dialogs=[...document.querySelectorAll('dialog')];
 document.documentElement.classList.toggle('mobile-dialog-open',mobile.matches&&dialogs.some(d=>d.open));
 const v=window.visualViewport;
 // Não forçar a largura quando o utilizador amplia manualmente a página.
 if(!mobile.matches||(v&&v.scale>1.01))return;
 const values={'--mobile-dialog-top':(v?.offsetTop||0)+'px','--mobile-dialog-left':(v?.offsetLeft||0)+'px','--mobile-dialog-width':(v?.width||document.documentElement.clientWidth)+'px','--mobile-dialog-height':(v?.height||innerHeight)+'px'};
 for(const d of dialogs)for(const [key,value] of Object.entries(values))if(d.style.getPropertyValue(key)!==value)d.style.setProperty(key,value);
 const quote=document.querySelector('#quote-editor'),heading=quote?.querySelector('#q-heading'),close=quote?.querySelector('#q-close');
 if(heading&&close&&!quote.querySelector('.mobile-dialog-heading')){
  const row=document.createElement('div');row.className='mobile-dialog-heading';heading.before(row);row.append(heading);
  const button=document.createElement('button');button.type='button';button.className='btn mobile-dialog-close';button.textContent='Fechar';button.onclick=()=>close.click();row.append(button);
 }
}
function schedule(){if(!scheduled){scheduled=true;requestAnimationFrame(sync);}}
function reveal(){
 clearTimeout(revealTimer);revealTimer=setTimeout(()=>{
  const field=document.activeElement,dialog=field?.closest('dialog[open]');if(!mobile.matches||!dialog||!field.matches('input,select,textarea'))return;
  const r=field.getBoundingClientRect(),d=dialog.getBoundingClientRect(),top=d.top+18,bottom=d.bottom-24;
  if(r.bottom>bottom)dialog.scrollBy({top:r.bottom-bottom,behavior:'auto'});else if(r.top<top)dialog.scrollBy({top:r.top-top,behavior:'auto'});
 },180);
}
document.addEventListener('focusin',e=>{if(e.target.closest('dialog')&&e.target.matches('input,select,textarea')){schedule();reveal();}});
const observer=new MutationObserver(schedule);observer.observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['open']});
window.addEventListener('resize',()=>{schedule();reveal();});mobile.addEventListener('change',schedule);
window.visualViewport?.addEventListener('resize',()=>{schedule();reveal();});window.visualViewport?.addEventListener('scroll',schedule);
sync();
