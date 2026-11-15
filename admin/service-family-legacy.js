const text=v=>String(v??'').trim().normalize('NFC');
const crew=s=>[...new Set([...(s.employeeIds||[]),s.employeeId].filter(Boolean))].sort().join('|');
const validDay=(p,day)=>{if(!/^\d{4}-\d{2}-\d{2}$/.test(day)||day<p.startDate||(p.endDate&&day>p.endDate))return false;const d=new Date(day+'T12:00:00Z');if(!Number.isFinite(+d)||d.toISOString().slice(0,10)!==day)return false;const weekday=d.getUTCDay()||7;return weekday===Number(p.weekday);};
// Old rescheduling versions cloned the fields and added a literal reason, but no parent ID.
// Require a unique clone signature AND a unique excluded source date; never title alone.
export function legacyLinks(state){
 const services=state.services||[],history=state.rescheduleHistory||[],known=new Set();
 for(const s of services)if(s.occurrenceOf||s.continuationOf)known.add(s.id);
 for(const h of history)if(h.ownerServiceId&&h.resultServiceId&&h.ownerServiceId!==h.resultServiceId)known.add(h.resultServiceId);
 for(const r of state.rescheduleRequests||[])if(r.status==='approved'&&r.resultServiceId&&r.serviceId!==r.resultServiceId)known.add(r.resultServiceId);
 const parents=services.filter(s=>['Semanal','Quinzenal'].includes(s.frequency)&&!s.occurrenceOf&&!s.continuationOf),candidates=[];
 for(const child of services){
  if(child.frequency!=='Pontual'||known.has(child.id)||child.endDate!==child.startDate)continue;
  const proofs=history.filter(h=>h.ownerServiceId===child.id&&h.kind==='reschedule'&&h.status!=='rejected').map(h=>h.before?.day).filter(Boolean),choices=[];
  for(const parent of parents){
   if(parent.clientId!==child.clientId||!text(child.title)||!['title','serviceType','estimatedDuration','areas'].every(k=>text(parent[k])===text(child[k]))||crew(parent)!==crew(child))continue;
   const base=text(parent.notes),notes=text(child.notes),prefix=base?base+'\nReagendamento: ':'Reagendamento: ';
   if(!notes.startsWith(prefix)||!notes.slice(prefix.length).trim())continue;
   const claimed=new Set(services.filter(s=>s.id!==child.id&&s.occurrenceOf?.serviceId===parent.id).map(s=>s.occurrenceOf.originalDay));
   for(const h of history)if(h.ownerServiceId===parent.id&&h.resultServiceId&&h.resultServiceId!==child.id&&h.resultServiceId!==parent.id)claimed.add(h.before?.day);
   for(const r of state.rescheduleRequests||[])if(r.serviceId===parent.id&&r.status==='approved'&&r.resultServiceId&&r.resultServiceId!==child.id&&r.resultServiceId!==parent.id)claimed.add(r.day);
   const days=[...new Set(parent.excludedDays||[])].filter(day=>validDay(parent,day)&&!claimed.has(day));
   const proven=[...new Set(proofs)].filter(day=>days.includes(day));
   const sourceDays=proven.length?proven:days;
   if(sourceDays.length===1)choices.push({childId:child.id,parentId:parent.id,day:sourceDays[0],reason:'Associação automática de ocorrência antiga reagendada: dados copiados, motivo registado e data retirada da recorrência.'});
  }
  if(choices.length===1)candidates.push(choices[0]);
 }
 return candidates.filter(link=>candidates.filter(other=>other.parentId===link.parentId&&other.day===link.day).length===1);
}
