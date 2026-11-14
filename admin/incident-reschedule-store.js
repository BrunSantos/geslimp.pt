export const interruptionKey=(id,day)=>id+'-'+day;
export async function prepareIncidentMove(api,db,tx,auth,r,workers){
 const account=await tx.get(api.doc(db,'admins',auth.currentUser.uid));if(account.data()?.enabled!==true||r.uid!==auth.currentUser.uid)throw Error('Só a administração pode reagendar por incidência.');
 const sourceRef=api.doc(db,'serviceInterruptions',interruptionKey(r.serviceId,r.day)),previous=await tx.get(sourceRef);if(previous.exists())throw Error('Esta ocorrência já foi reagendada por incidência.');
 const phase=await tx.get(api.doc(db,'serviceWork',r.serviceId,'days',r.day));let started=phase.data()?.started===true;
 for(const d of workers.docs){const row=await tx.get(d.ref),w=row.data();if(w?.status==='completed'||w?.finishedAt)throw Error('O serviço já foi finalizado. Usa Correção manual.');if(w?.startedAt||w?.status==='started')started=true;}
 if(!started)throw Error('Este serviço ainda não foi iniciado. Usa o reagendamento normal.');
 const incident=await tx.get(api.doc(db,'serviceIncidents',r.incidentId)),i=incident.data();if(!i||i.serviceId!==r.serviceId||i.day!==r.day||i.status!=='open')throw Error('Escolhe uma incidência aberta desta ocorrência.');
 if(r.targetDay===r.day&&r.targetShift===r.originalShift)throw Error('Escolhe outra data ou outro turno.');
 return {sourceRef,incident:i,phaseRef:phase.ref,phaseExists:phase.exists()};
}
export function writeIncidentMove(api,db,tx,auth,r,prepared,targetId){
 if(!prepared.phaseExists)tx.set(prepared.phaseRef,{serviceId:r.serviceId,day:r.day,started:true,updatedAt:api.serverTimestamp()});
 tx.set(prepared.sourceRef,{serviceId:r.serviceId,clientId:r.clientId,day:r.day,shift:r.originalShift,incidentId:r.incidentId,reason:r.message.trim(),targetServiceId:targetId,targetDay:r.targetDay,targetShift:r.targetShift,status:'interrupted',actorUid:auth.currentUser.uid,createdAt:api.serverTimestamp()});
}
