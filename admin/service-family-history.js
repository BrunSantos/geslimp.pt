import * as api from '../firestore-feedback.js?v=131';
import {familyMeta,familyRecords,occurrenceIdentity} from './service-family.js?v=26.11.9';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const ms=t=>t?.toMillis?.()||(t?.seconds? t.seconds*1000:0),date=d=>d?d.split('-').reverse().join('/'):'—';
export function historyEvents(state,records,data){
 const name=id=>state.employees?.find(e=>e.id===id)?.name||id||'Colaborador',events=[],dedup=new Set();
 const add=(sid,day,event,key)=>{if(key&&dedup.has(key))return;if(key)dedup.add(key);events.push({...event,serviceId:sid,day,key:occurrenceIdentity(sid,day,state)});};
 for(const item of data){
  const sid=item.id;
  for(const r of item.requests||[])add(sid,r.day,{label:r.status==='pending'?'Pedido de reagendamento pendente':'Pedido de reagendamento',at:ms(r.createdAt),who:name(r.employeeId),note:date(r.day)+' · '+r.originalShift+' → '+date(r.targetDay)+' · '+r.targetShift+'\nMotivo: '+r.message},'request-'+r.id);
  for(const h of item.changes||[]){const fingerprint=JSON.stringify([h.status,h.before,h.after,h.reason,h.actorUid,ms(h.createdAt)]);add(sid,h.before?.day||h.after?.day,{label:h.status==='rejected'?'Pedido de reagendamento recusado':h.status==='linked'?'Ocorrência antiga integrada':'Reagendamento',at:ms(h.createdAt),who:h.actorName||h.actorUid,note:date(h.before?.day)+' · '+(h.before?.shift||'')+' → '+date(h.after?.day)+' · '+(h.after?.shift||'')+'\nMotivo: '+h.reason},'move-'+fingerprint);}
  for(const w of item.workers||[]){if(w.startedAt)add(sid,w.day,{label:'Serviço iniciado',at:ms(w.startedAt),who:name(w.employeeId),note:''},'start-'+sid+'-'+w.uid+'-'+w.day);if(w.finishedAt)add(sid,w.day,{label:state.interruptions?.[sid+'-'+w.day]?'Fim do trabalho realizado':'Serviço finalizado',at:ms(w.finishedAt),who:name(w.employeeId),note:w.comment||''},'finish-'+sid+'-'+w.uid+'-'+w.day);}
  for(const i of item.incidents||[])add(sid,i.day,{label:'Incidência comunicada',at:ms(i.createdAt),who:name(i.employeeId),note:i.message+(i.status==='resolved'?'\nResolvida: '+(i.resolution||''):'\nPor resolver')},'incident-'+i.id);
  for(const c of item.corrections||[])add(sid,c.before?.day,{label:'Correção manual',at:ms(c.createdAt),who:c.actorName||c.actorUid,note:'Motivo: '+c.reason+'\n'+Object.entries(c.afterWorkers||{}).map(([uid,w])=>{const old=c.beforeWorkers?.[uid],fmt=t=>t?new Date(ms(t)).toLocaleString('pt-PT',{timeZone:'Europe/Lisbon'}):'—';return name(w.employeeId)+': '+fmt(old?.startedAt)+' / '+fmt(old?.finishedAt)+' → '+fmt(w.startedAt)+' / '+fmt(w.finishedAt);}).join('\n')},'correction-'+c.id);
 }
 for(const i of Object.values(state.interruptions||{}))if(records.some(r=>r.id===i.serviceId))add(i.serviceId,i.day,{label:'Interrompido · Reagendado',at:ms(i.createdAt),who:i.actorUid,note:date(i.targetDay)+' · '+i.targetShift+'\nMotivo: '+i.reason},'interruption-'+i.serviceId+'-'+i.day);
 for(const c of state.completions||[])if(records.some(r=>r.id===c.serviceId)&&!events.some(e=>e.serviceId===c.serviceId&&e.day===c.day&&e.label==='Serviço finalizado'))add(c.serviceId,c.day,{label:'Serviço finalizado',at:ms(c.createdAt),who:(c.employeeIds||[]).map(name).join(', '),note:'Conclusão registada.'},'completion-'+c.serviceId+'-'+c.day);
 return events.sort((a,b)=>a.at-b.at);
}
const historySources={changes:'Reagendamentos',workers:'Inícios e fins do serviço',incidents:'Incidências',corrections:'Correções manuais',requests:'Pedidos de reagendamento'};
export function historyFailure(error){
 const code=String(error?.code||'unknown').replace(/^firestore\//,'');
 const message=String(error?.message||'');
 const url=message.match(/https:\/\/console\.firebase\.google\.com\/[^\s<>"']+/)?.[0]||'';
 const missingIndex=code==='failed-precondition'&&/index|índice/i.test(message);
 return {code,link:missingIndex?url:'',text:missingIndex?'Falta um índice no Firestore.':code==='permission-denied'?'A conta não tem autorização para esta leitura.':['unavailable','deadline-exceeded'].includes(code)?'Não foi possível contactar o Firestore. Tenta novamente.':code==='unauthenticated'?'A sessão expirou. Volta a entrar.':'Não foi possível ler estes registos.'};
}
function withDeadline(operation){let timer;return Promise.race([Promise.resolve().then(operation),new Promise((_,reject)=>{timer=setTimeout(()=>reject(Object.assign(Error('Tempo de espera excedido'),{code:'deadline-exceeded'})),20000);})]).finally(()=>clearTimeout(timer));}
export async function loadHistoryData(db,records,client=api){
 const results=await Promise.all(records.map(async s=>{
  const queries={changes:()=>client.collection(db,'services',s.id,'changeHistory'),workers:()=>client.query(client.collectionGroup(db,'workers'),client.where('serviceId','==',s.id)),incidents:()=>client.query(client.collection(db,'serviceIncidents'),client.where('serviceId','==',s.id)),corrections:()=>client.collection(db,'services',s.id,'manualCorrections'),requests:()=>client.query(client.collection(db,'serviceRescheduleRequests'),client.where('serviceId','==',s.id))};
  const keys=Object.keys(queries),settled=await Promise.allSettled(keys.map(key=>withDeadline(()=>client.getDocsFromServer(queries[key]())))),data={id:s.id},failures=[];
  settled.forEach((result,i)=>{const source=keys[i];data[source]=[];if(result.status==='fulfilled')data[source]=result.value.docs.map(d=>({...d.data(),id:d.id}));else{failures.push({serviceId:s.id,source,...historyFailure(result.reason)});console.error('GesLimp: falha no histórico', {serviceId:s.id,source,code:result.reason?.code||'unknown'},result.reason);}});
  return {data,failures};
 }));
 return {data:results.map(r=>r.data),failures:results.flatMap(r=>r.failures)};
}
export function initServiceHistory({db,getState}){
 const dialog=document.createElement('dialog');dialog.className='service-family-history work-modal';dialog.innerHTML='<h2>Histórico do serviço</h2><p data-history-title></p><div data-history-warning role="status"></div><div data-family-history></div><div class="actions"><button type="button" class="btn" data-history-retry hidden>Tentar novamente</button><button type="button" class="btn" data-history-close>Fechar</button></div>';document.body.append(dialog);
 let epoch=0,selectedId='';const retry=dialog.querySelector('[data-history-retry]'),body=dialog.querySelector('[data-family-history]'),warning=dialog.querySelector('[data-history-warning]');
 dialog.querySelector('[data-history-close]').onclick=()=>{epoch++;dialog.close();};dialog.addEventListener('cancel',()=>epoch++);dialog.addEventListener('close',()=>epoch++);
 async function load(){
  const ticket=++epoch,state=getState(),rootId=familyMeta(selectedId,state).rootId,records=familyRecords(rootId,state),root=records.find(r=>r.id===rootId);
  dialog.querySelector('[data-history-title]').textContent=root?.title||'Serviço';body.textContent='A carregar o histórico…';body.setAttribute('aria-busy','true');warning.replaceChildren();retry.hidden=true;retry.disabled=true;
  try{
   const {data,failures}=await loadHistoryData(db,records);if(ticket!==epoch)return;
   const events=historyEvents(state,records,data),groups=new Map();for(const event of events){if(!groups.has(event.key))groups.set(event.key,[]);groups.get(event.key).push(event);}
   body.innerHTML=[...groups.values()].reverse().map(rows=>'<section><h3>Ocorrência de '+esc(date(rows[0].key.split('|')[1]==='single'?rows[0].day:rows[0].key.split('|')[1]))+'</h3><ol class="activity-timeline">'+rows.map(r=>'<li><strong>'+esc(r.label)+'</strong><small>'+esc(r.at?new Date(r.at).toLocaleString('pt-PT',{timeZone:'Europe/Lisbon'}):date(r.day))+(r.who?' · '+esc(r.who):'')+'</small>'+(r.note?'<p>'+esc(r.note).replace(/\n/g,'<br>')+'</p>':'')+'</li>').join('')+'</ol></section>').join('')||(failures.length?'<p>Não foi possível obter registos suficientes para apresentar o histórico.</p>':'<p>Ainda não existem registos de atividade.</p>');
   if(failures.length){const p=document.createElement('p');p.textContent='Histórico incompleto. Os registos disponíveis são apresentados abaixo.';warning.append(p);const unique=new Map();for(const f of failures)unique.set(f.source+'|'+f.code+'|'+f.link,f);for(const f of unique.values()){const row=document.createElement('p');row.textContent=historySources[f.source]+': '+f.text+' ('+f.code+')';if(f.link){const a=document.createElement('a');a.href=f.link;a.target='_blank';a.rel='noopener noreferrer';a.textContent=' Abrir configuração do índice';row.append(a);}warning.append(row);}retry.hidden=false;}
  }catch(error){if(ticket!==epoch)return;console.error('GesLimp: erro ao apresentar histórico',error);body.textContent='Não foi possível apresentar o histórico. Tenta novamente.';retry.hidden=false;}
  finally{if(ticket===epoch){body.setAttribute('aria-busy','false');retry.disabled=false;}}
 }
 retry.onclick=()=>load();document.addEventListener('click',e=>{const button=e.target.closest('[data-service-change-history]');if(!button)return;selectedId=button.dataset.serviceChangeHistory;if(!dialog.open)dialog.showModal();load();});
}
