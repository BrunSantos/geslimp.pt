export const activityKey=(id,day)=>JSON.stringify([id,day]);
const millis=t=>t?.toMillis?.()??(t?.seconds!=null?t.seconds*1000:0);
export function activityModel(entry,workers=[],incidents=[],employees=[],completed=false){
  const name=id=>employees.find(e=>e.id===id)?.name||'Colaborador';
  const events=[];
  for(const w of workers){
    if(w.startedAt)events.push({kind:'start',label:'Serviço iniciado',at:millis(w.startedAt),who:name(w.employeeId)});
    if(w.finishedAt)events.push({kind:'finish',label:'Serviço finalizado',at:millis(w.finishedAt),who:name(w.employeeId),note:w.comment||''});
  }
  for(const i of incidents)events.push({kind:'incident',label:'Incidência comunicada',at:millis(i.createdAt),who:name(i.employeeId),note:i.message||'',resolved:i.status==='resolved'});
  const finished=completed||entry.status==='concluida'||entry.status==='concluido'||workers.some(w=>w.status==='completed');
  const started=workers.some(w=>w.startedAt||w.status==='started'||w.status==='completed');
  if(finished&&!events.some(e=>e.kind==='finish'))events.push({kind:'finish',label:'Serviço finalizado',at:0,who:'',note:'Sem hora de finalização registada.'});
  events.sort((a,b)=>a.at===0?1:b.at===0?-1:a.at-b.at);
  return {status:finished?'finished':started?'running':'waiting',started:started||finished,incidents:incidents.length,unresolved:incidents.filter(i=>i.status!=='resolved').length,events};
}
export function activityTotals(models){return {total:models.length,started:models.filter(m=>m.started).length,waiting:models.filter(m=>m.status==='waiting').length,running:models.filter(m=>m.status==='running').length,finished:models.filter(m=>m.status==='finished').length,withIncident:models.filter(m=>m.incidents>0).length,unresolved:models.filter(m=>m.unresolved>0).length};}
