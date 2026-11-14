// Resolve legacy records from immutable structured history; never match by title or notes.
export async function resolveServiceFamily(api,db,tx,sid,service,day){
 let current=sid,value=service,originalDay=day;const visited=new Set([sid]);
 for(let n=0;n<20;n++){
  let parent='',sourceDay='';
  if(value.occurrenceOf){parent=value.occurrenceOf.serviceId;sourceDay=value.occurrenceOf.originalDay;}
  else if(value.continuationOf){parent=value.continuationOf.serviceId;sourceDay=value.continuationOf.day;}
  else{
   const read=api.getDocsFromServer||api.getDocs,history=await read(api.query(api.collectionGroup(db,'changeHistory'),api.where('resultServiceId','==',current)));
   const links=history.docs.filter(d=>d.ref.parent.parent.id!==current),parents=[...new Set(links.map(d=>d.ref.parent.parent.id))];
   if(parents.length>1)throw Error('Este registo tem ligações diferentes no histórico. Verifica o serviço original antes de reagendar.');
   if(parents.length){const proof=await tx.get(links.find(d=>d.ref.parent.parent.id===parents[0]).ref);parent=parents[0];sourceDay=proof.data()?.before?.day||'';}
  }
  if(!parent) return {serviceId:current,originalDay};
  if(visited.has(parent))throw Error('Foi encontrada uma ligação circular no histórico do serviço.');
  const source=await tx.get(api.doc(db,'services',parent));if(!source.exists()||source.data().clientId!==service.clientId)throw Error('A ligação ao serviço original não é válida.');
  visited.add(parent);current=parent;value=source.data();originalDay=sourceDay||originalDay;
 }
 throw Error('O histórico deste serviço tem demasiadas ligações para reagendar automaticamente.');
}
