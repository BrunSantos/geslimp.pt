import {collection,doc,getDoc,getDocs,runTransaction} from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js';

// Revisions form a family through parentId. Duplicates have no parent.
export function quoteFamily(quotes,id){
 const ids=new Set([id]);let changed=true;
 while(changed){changed=false;for(const q of quotes){if(ids.has(q.id)&&q.parentId&&!ids.has(q.parentId)){ids.add(q.parentId);changed=true}if(q.parentId&&ids.has(q.parentId)&&!ids.has(q.id)){ids.add(q.id);changed=true}}}
 return quotes.filter(q=>ids.has(q.id));
}
// Firestore query and transaction snapshots may return map keys in different orders.
// Compare field values canonically, including nested maps and Timestamp JSON values.
export const fingerprint=s=>JSON.stringify(s.exists()?s.data():null,(_key,value)=>{
 if(value&&typeof value==='object'&&!Array.isArray(value))return Object.fromEntries(Object.keys(value).sort().map(key=>[key,value[key]]));
 return value;
});
export async function deleteQuoteHistory(ctx,id){
 if(!ctx.ready())throw Error('Inicia sessão como administrador.');
 const counter=doc(ctx.db,'quoteCounters','main');
 const before=await getDoc(counter);
 const [qs,ls]=await Promise.all([getDocs(collection(ctx.db,'quotes')),getDocs(collection(ctx.db,'quoteLinks'))]);
 const all=qs.docs.map(s=>({...s.data(),id:s.id}));
 const selected=all.find(q=>q.id===id);if(!selected)throw Error('Este orçamento já foi apagado.');
 const family=quoteFamily(all,id),ids=new Set(family.map(q=>q.id));
 const tokens=new Set(family.map(q=>q.linkId).filter(Boolean));
 const links=ls.docs.filter(s=>ids.has(s.data().quoteId)||tokens.has(s.id));
 const records=[...qs.docs.filter(s=>ids.has(s.id)),...links];
 if(records.length>400)throw Error('Este histórico é demasiado extenso para apagar numa única operação.');
 if(family.some(q=>q.serviceId))throw Error('Não é possível apagar: este orçamento ou uma das suas revisões já deu origem a um serviço.');
 const message=`Apagar definitivamente o orçamento ${selected.number} e todo o seu histórico?\n\nSerão apagadas ${family.length} versão(ões), incluindo respostas e comentários. Os links partilhados deixarão de funcionar.\n\nEsta ação não pode ser anulada.`;
 if(!await confirmQuoteDeletion(message))return false;
 await runTransaction(ctx.db,async tx=>{
  const freshCounter=await tx.get(counter);
  if(fingerprint(freshCounter)!==fingerprint(before))throw Error('Os orçamentos foram atualizados noutra sessão. Tenta apagar novamente.');
  for(const original of records){const fresh=await tx.get(original.ref);if(fingerprint(fresh)!==fingerprint(original))throw Error('O orçamento ou uma resposta foi alterado entretanto. Revê os dados e tenta novamente.');}
  for(const s of records)tx.delete(s.ref);
 });
}

export function confirmQuoteDeletion(message){
 return new Promise(resolve=>{
  const dialog=document.createElement('dialog');
  dialog.setAttribute('aria-labelledby','quote-delete-heading');
  dialog.innerHTML='<h2 id="quote-delete-heading">Apagar orçamento e histórico</h2><p class="quote-delete-description" style="white-space:pre-line"></p><div class="actions"><button type="button" class="btn" data-cancel>Cancelar</button><button type="button" class="btn danger" data-confirm>Apagar definitivamente</button></div>';
  dialog.querySelector('p').textContent=message;
  let finished=false;
  function finish(value){if(finished)return;finished=true;dialog.close();dialog.remove();resolve(value)}
  dialog.querySelector('[data-cancel]').onclick=()=>finish(false);
  dialog.querySelector('[data-confirm]').onclick=()=>finish(true);
  dialog.addEventListener('cancel',event=>{event.preventDefault();finish(false)});
  document.body.append(dialog);dialog.showModal();dialog.querySelector('[data-cancel]').focus();
 });
}
