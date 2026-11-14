import {crewOf} from '../capacity.js?v=111';
import {validDate,todayPortugal} from './client-dates.js';
// Interpret datetime-local as Portugal continental, independent of browser timezone.
export function localLisbon(value){
 if(!/^\d{4}-\d\d-\d\dT\d\d:\d\d$/.test(value)||!validDate(value.slice(0,10)))throw Error('Indica uma data e hora válidas.');
 const [y,m,d,h,min]=value.match(/\d+/g).map(Number);if(h>23||min>59)throw Error('Hora inválida.');
 const base=Date.UTC(y,m-1,d,h,min),fmt=new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/Lisbon',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'});
 const matches=[];for(const delta of [-60,0,60]){const ms=base+delta*60000;if(fmt.format(new Date(ms)).replace(' ','T')===value)matches.push(ms);}
 if(matches.length!==1)throw Error(matches.length?'Esta hora repete-se na mudança de hora. Escolhe uma hora sem ambiguidade.':'Esta hora não existe em Portugal continental.');return matches[0];
}
export function localValue(t){if(!t)return '';return new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/Lisbon',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(t.toDate?.()||new Date(t)).replace(' ','T');}
export function validateManual(r,now=Date.now()){
 if(!r.message?.trim()||r.message.trim().length>5000)throw Error('Indica o motivo da correção (até 5000 caracteres).');
 if(!validDate(r.targetDay)||r.targetDay>todayPortugal(new Date(now))||!['Manhã','Tarde','Noite','Dia inteiro'].includes(r.targetShift))throw Error('Escolhe a data real, até hoje, e um turno válido.');
 const m=r.manual;if(!m?.uid||!m.employeeId)throw Error('Seleciona um colaborador com acesso à aplicação.');
 const start=localLisbon(m.start),finish=m.finish?localLisbon(m.finish):null;
 if(m.start.slice(0,10)!==r.targetDay||start>now||finish!==null&&(finish<start||finish>now||finish-start>86400000))throw Error('O início deve corresponder à data real. O fim deve ser posterior ao início, até agora e com duração máxima de 24 horas.');
 return {start,finish};
}
export async function prepareManual(api,db,tx,r,workers,incidents){
 const admin=await tx.get(api.doc(db,'admins',r.uid));if(admin.data()?.enabled!==true)throw Error('Só a administração pode fazer correções manuais.');
 const values=validateManual(r),beforeWorkers={},beforeIncidents={},sourceRows=[],incidentRows=[];
 for(const d of workers.docs){const s=await tx.get(d.ref);if(s.exists()){beforeWorkers[d.id]=s.data();sourceRows.push({uid:d.id,data:s.data(),ref:d.ref});}}
 for(const d of incidents.docs){const s=await tx.get(d.ref);if(s.exists()){beforeIncidents[d.id]=s.data();incidentRows.push({id:d.id,data:s.data(),ref:d.ref});}}
 const service=await tx.get(api.doc(db,'services',r.serviceId)),client=await tx.get(api.doc(db,'clients',service.data().clientId));if(!crewOf(service.data(),client.data()).includes(r.manual.employeeId))throw Error('O colaborador não está atribuído ao serviço.');
 if(sourceRows.some(w=>w.data.status==='completed')&&values.finish===null)throw Error('Este serviço está finalizado. Indica o início e o fim reais.');
 const selected=sourceRows.find(w=>w.uid===r.manual.uid);if(selected&&selected.data.employeeId!==r.manual.employeeId)throw Error('O colaborador do registo foi alterado. Abre novamente a correção.');
 const employee=await tx.get(api.doc(db,'employees',r.manual.employeeId));if(!employee.exists())throw Error('Colaborador não encontrado.');
 if(!selected){if(r.manual.uid===r.uid){if(employee.data().email?.toLowerCase()!==r.manual.actorEmail?.toLowerCase())throw Error('A conta não corresponde ao colaborador.');}else{const access=await tx.get(api.doc(db,'employeeAccess',r.manual.uid));if(access.data()?.employeeId!==r.manual.employeeId||access.data()?.enabled!==true){const link=await tx.get(api.doc(db,'employeeAdminLinks',r.manual.employeeId)),account=await tx.get(api.doc(db,'admins',r.manual.uid));if(link.data()?.uid!==r.manual.uid||account.data()?.enabled!==true)throw Error('O acesso deste colaborador não está ativo.');}}}
 if(selected?.data.status==='completed'&&values.finish===null)throw Error('Um serviço finalizado deve manter uma hora de fim.');
 const audit=api.doc(api.collection(db,'services',r.serviceId,'manualCorrections'));
 return {auditId:audit.id,values,beforeWorkers,beforeIncidents,sourceRows,incidentRows};
}
export async function readManualTarget(api,db,tx,r,p,targetId){
 p.phaseRef=api.doc(db,'serviceWork',targetId,'days',r.targetDay);p.phase=await tx.get(p.phaseRef);if(targetId===r.serviceId&&r.targetDay===r.day)return;
 for(const uid of new Set([...p.sourceRows.map(w=>w.uid),r.manual.uid])){const s=await tx.get(api.doc(db,'serviceWork',targetId,'days',r.targetDay,'workers',uid));if(s.exists())throw Error('Já existem registos na data de destino. Corrige-os separadamente para não os substituir.');}
}
export function writeManual(api,db,tx,r,p,s,targetId,done){
 if(!p.phase?.exists())tx.set(p.phaseRef,{serviceId:targetId,day:r.targetDay,started:true,updatedAt:api.serverTimestamp()});
 const moved=targetId!==r.serviceId||r.targetDay!==r.day,afterWorkers={};
 for(const w of p.sourceRows)afterWorkers[w.uid]={...w.data,serviceId:targetId,day:r.targetDay,correctionId:p.auditId,updatedAt:api.serverTimestamp()};
 const old=p.beforeWorkers[r.manual.uid];afterWorkers[r.manual.uid]={serviceId:targetId,clientId:s.clientId,day:r.targetDay,uid:r.manual.uid,employeeId:r.manual.employeeId,status:p.values.finish===null?'started':'completed',startedAt:api.Timestamp.fromMillis(p.values.start),finishedAt:p.values.finish===null?null:api.Timestamp.fromMillis(p.values.finish),comment:old?.comment||'',updatedAt:api.serverTimestamp(),correctionId:p.auditId};
 const audit={actorUid:r.uid,actorName:r.manual.actorEmail||r.uid,reason:r.message.trim(),createdAt:api.serverTimestamp(),sourceServiceId:r.serviceId,targetServiceId:targetId,before:{day:r.day,shift:s.shift},after:{day:r.targetDay,shift:r.targetShift},beforeWorkers:p.beforeWorkers,afterWorkers,beforeIncidents:p.beforeIncidents,beforeCompletion:done.data()||null};
 for(const sid of new Set([r.serviceId,targetId]))tx.set(api.doc(db,'services',sid,'manualCorrections',p.auditId),audit);
 if(moved){tx.set(api.doc(db,'services',r.serviceId,'manualCorrectionHeads',r.day),{correctionId:p.auditId,updatedAt:api.serverTimestamp()});for(const w of p.sourceRows)tx.delete(w.ref);for(const i of p.incidentRows)tx.update(i.ref,{serviceId:targetId,day:r.targetDay,correctionId:p.auditId});if(done.exists())tx.delete(done.ref);}
 for(const [uid,data] of Object.entries(afterWorkers))tx.set(api.doc(db,'serviceWork',targetId,'days',r.targetDay,'workers',uid),data);
 const finished=Object.values(afterWorkers).some(w=>w.status==='completed');
 if(s.frequency==='Pontual'||moved){if(finished)tx.update(api.doc(db,'services',targetId),{status:'concluido',updatedAt:api.serverTimestamp()});if(targetId.startsWith('site-')&&finished)tx.update(api.doc(db,'bookings',targetId.slice(5)),{status:'concluida',updatedAt:api.serverTimestamp()});}
 else if(finished&&!done.exists())tx.set(api.doc(db,'serviceCompletions',targetId+'-'+r.targetDay),{serviceId:targetId,clientId:s.clientId,day:r.targetDay,shift:r.targetShift,employeeIds:[r.manual.employeeId],status:'concluida',createdAt:api.serverTimestamp()});
 return targetId;
}
