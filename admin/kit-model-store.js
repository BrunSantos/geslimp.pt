import {validKitRows} from './employee-kit-store.js?v=138';
export function validateKitModel(data){
 const name=String(data.name||'').trim(),serviceType=String(data.serviceType||'').trim();
 if(!name||name.length>100||serviceType.length>100)throw Error('Indica um nome para o kit (até 100 caracteres).');
 const rows=validKitRows(data.rows);if(!rows.length||rows.some(r=>!r.itemId))throw Error('Adiciona e associa pelo menos um artigo do stock.');
 return {name,serviceType,rows,archived:data.archived===true};
}
export function createKitModelStore(api,db){return {
 async save(data,id=''){
  const value=validateKitModel(data),key=id||crypto.randomUUID();if(key==='default')throw Error('Guarda o kit anterior como um novo modelo.');
  await api.runTransaction(db,async tx=>{
   const ref=api.doc(db,'kitTemplates',key),old=await tx.get(ref);if(id&&!old.exists())throw Error('O modelo já não existe.');
   for(const row of value.rows){const item=await tx.get(api.doc(db,'stockItems',row.itemId));if(!item.exists()||item.data().archived||item.data().deleted)throw Error('O artigo «'+row.label+'» está indisponível. Remove-o ou escolhe outro.');if(item.data().kind==='equipment'&&row.qtyMilli%1000)throw Error('Os equipamentos são preparados em unidades inteiras.');}
   tx.set(ref,{...value,createdAt:old.data()?.createdAt||api.serverTimestamp(),updatedAt:api.serverTimestamp()});
  });return key;
 },
 async setArchived(id,archived){if(id==='default')throw Error('O kit anterior mantém-se disponível.');await api.runTransaction(db,async tx=>{const ref=api.doc(db,'kitTemplates',id),snap=await tx.get(ref);if(!snap.exists())throw Error('O modelo já não existe.');tx.update(ref,{archived,updatedAt:api.serverTimestamp()});});}
};}
