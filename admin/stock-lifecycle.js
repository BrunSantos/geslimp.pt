// A ficha retirada preserva o nome/unidade usados pelos movimentos históricos.
// A eliminação completa bloqueia novos movimentos antes de apagar por lotes.
export function createStockLifecycle(api,db){
 const {doc,collection,query,where,getDocs,runTransaction,writeBatch,serverTimestamp}=api;
 const ref=id=>doc(db,'stockItems',id);
 async function change(id,mode){
  if(!['active','inactive','keep','purge'].includes(mode))throw Error('Opção inválida.');
  await runTransaction(db,async tx=>{
   const r=ref(id),snap=await tx.get(r);if(!snap.exists())throw Error('Artigo não encontrado.');
   const item=snap.data();
   if(item.deleted&&mode!=='purge')throw Error('Este artigo já foi apagado.');
   tx.update(r,{archived:mode!=='active',deleted:['keep','purge'].includes(mode),deletionMode:['keep','purge'].includes(mode)?mode:'',updatedAt:serverTimestamp()});
  });
 }
 async function removeRefs(refs){for(let i=0;i<refs.length;i+=200){const batch=writeBatch(db);for(const r of refs.slice(i,i+200))batch.delete(r);await batch.commit();}}
 async function purge(id){
  await change(id,'purge');
  // As partes da fatura são apagadas antes do respetivo documento pai.
  const invoices=await getDocs(query(collection(db,'stockInvoices'),where('itemId','==',id)));
  for(const invoice of invoices.docs){const parts=await getDocs(collection(db,'stockInvoices',invoice.id,'parts'));await removeRefs(parts.docs.map(d=>d.ref));await removeRefs([invoice.ref]);}
  for(const name of ['stockLoans','stockMovements']){const snap=await getDocs(query(collection(db,name),where('itemId','==',id)));await removeRefs(snap.docs.map(d=>d.ref));}
  // Só no fim removemos a ficha. Em caso de falha fica possível retomar.
  const batch=writeBatch(db);batch.delete(ref(id));await batch.commit();
 }
 return {change,purge};
}
