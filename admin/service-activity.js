import {activityKey,activityModel,activityTotals} from './service-activity-model.js?v=120';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function activityPlaceholder(id,day,status='',today=false){return `<div class="service-activity" data-activity-id="${esc(id)}" data-activity-day="${esc(day)}" data-activity-status="${esc(status)}"${today?' data-activity-today="true"':''}><p>A carregar acompanhamento…</p></div>`;}
export function initServiceActivity({api,db,auth,ready,getState}){
  let owner='',epoch=0,queued=false;const records=new Map(),days=new Map();
  const clock=new Intl.DateTimeFormat('pt-PT',{timeZone:'Europe/Lisbon',hour:'2-digit',minute:'2-digit'});
  const put=(el,html)=>{if(el.innerHTML!==html){el.innerHTML=html;delete el.dataset.activitySignature;}};
  function model(el){const state=getState(),id=el.dataset.activityId,day=el.dataset.activityDay,row=records.get(activityKey(id,day)),daily=days.get(day);return activityModel({status:el.dataset.activityStatus},row?.rows||[],(daily?.rows||[]).filter(i=>i.serviceId===id),state.employees,state.completions.some(c=>c.serviceId===id&&c.day===day));}
  function paint(){
    const elements=[...document.querySelectorAll('[data-activity-id]')];
    for(const el of elements){
      const row=records.get(activityKey(el.dataset.activityId,el.dataset.activityDay)),daily=days.get(el.dataset.activityDay);
      if(!ready()){put(el,'');continue;}
      if(row?.error||daily?.error){put(el,'<p class="activity-error">Não foi possível consultar o acompanhamento.</p>');continue;}
      if(!row?.loaded||!daily?.loaded){put(el,'<p>A carregar acompanhamento…</p>');continue;}
      const m=model(el),labels={waiting:'Por iniciar',running:'Em curso',finished:'Finalizado'};
      const events=m.events.length?'<ol class="activity-timeline" aria-label="Acompanhamento do serviço">'+m.events.map(e=>`<li class="activity-${e.kind}"><span>${esc(e.label)}</span>${e.at||e.who?'<small class="activity-event-meta">'+(e.at?'<time>'+esc(clock.format(new Date(e.at)))+'</time>':'')+(e.at&&e.who?' · ':'')+esc(e.who)+'</small>':''}${e.note?'<p>'+esc(e.note)+'</p>':''}${e.kind==='incident'?'<small>'+(e.resolved?'Incidência resolvida':'Por resolver')+'</small>':''}</li>`).join('')+'</ol>':'<p class="activity-waiting">Ainda sem registo de início.</p>';
      const calendar=Boolean(el.closest('#weekly,#overview-summary'));
      const signature=JSON.stringify([m,calendar]);if(el.dataset.activitySignature!==signature){
        if(calendar){el.classList.add('activity-calendar');el.innerHTML=m.events.length?events:'<p class="activity-state activity-waiting">Por iniciar</p>';}
        else{const open=el.querySelector('details')?.open;el.innerHTML=`<details${open?' open':''}><summary><span class="activity-state activity-${m.status}">${labels[m.status]}</span>${m.incidents?'<span class="activity-incident-label"> · Com incidência</span>':''}</summary>${events}</details>`;}
        el.dataset.activitySignature=signature;
      }
    }
    const summary=document.getElementById('overview-activity-chart');if(!summary)return;
    const unique=new Map(elements.filter(el=>el.dataset.activityToday).map(el=>[activityKey(el.dataset.activityId,el.dataset.activityDay),el]));
    if(!ready()){put(summary,'');return;}
    const list=[...unique.values()];if(!list.length){put(summary,'');return;}
    if(list.some(el=>records.get(activityKey(el.dataset.activityId,el.dataset.activityDay))?.error||days.get(el.dataset.activityDay)?.error)){put(summary,'<p class="activity-error">Resumo indisponível: não foi possível consultar todos os registos.</p>');return;}
    if(list.some(el=>!records.get(activityKey(el.dataset.activityId,el.dataset.activityDay))?.loaded||!days.get(el.dataset.activityDay)?.loaded)){put(summary,'<p>A carregar o resumo dos serviços…</p>');return;}
    const n=activityTotals(list.map(model));
    put(summary,`<div class="activity-counts"><span>${n.total} serviços</span><span>${n.started} já iniciados</span><span>${n.finished} finalizados</span></div><div class="activity-chart" role="img" aria-label="${n.waiting} por iniciar, ${n.running} em curso, ${n.finished} finalizados">${[['waiting',n.waiting],['running',n.running],['finished',n.finished]].map(([type,count])=>`<span class="activity-${type}" style="width:${100*count/n.total}%"></span>`).join('')}</div><div class="activity-legend"><span>${n.waiting} por iniciar</span><span>${n.running} em curso</span><span>${n.finished} finalizados</span></div><p class="activity-incident-label">${n.withIncident} serviços com incidência · ${n.unresolved} por resolver</p>`);
  }
  function sync(){
    const next=ready()?auth.currentUser?.uid||'':'';
    if(owner!==next){owner=next;epoch++;for(const r of [...records.values(),...days.values()])r.stop?.();records.clear();days.clear();document.querySelectorAll('[data-activity-signature]').forEach(el=>delete el.dataset.activitySignature);}
    if(!owner){paint();return;}
    const needed=new Map(),neededDays=new Set();
    for(const el of document.querySelectorAll('[data-activity-id]')){const id=el.dataset.activityId,day=el.dataset.activityDay;if(!id||!/^\d{4}-\d{2}-\d{2}$/.test(day)||id.includes('/'))continue;needed.set(activityKey(id,day),{id,day});neededDays.add(day);}
    for(const [key,row] of records)if(!needed.has(key)){row.stop?.();records.delete(key);}
    for(const [day,row] of days)if(!neededDays.has(day)){row.stop?.();days.delete(day);}
    const token=epoch;
    for(const [key,{id,day}] of needed)if(!records.has(key)){const row={rows:[],loaded:false};records.set(key,row);row.stop=api.onSnapshot(api.collection(db,'serviceWork',id,'days',day,'workers'),s=>{if(token!==epoch||records.get(key)!==row)return;row.rows=s.docs.map(d=>d.data());row.loaded=true;row.error=false;paint();},()=>{if(token!==epoch||records.get(key)!==row)return;row.error=true;paint();});}
    for(const day of neededDays)if(!days.has(day)){const row={rows:[],loaded:false};days.set(day,row);row.stop=api.onSnapshot(api.query(api.collection(db,'serviceIncidents'),api.where('day','==',day)),s=>{if(token!==epoch||days.get(day)!==row)return;row.rows=s.docs.map(d=>d.data());row.loaded=true;row.error=false;paint();},()=>{if(token!==epoch||days.get(day)!==row)return;row.error=true;paint();});}
    paint();
  }
  const schedule=()=>{if(queued)return;queued=true;queueMicrotask(()=>{queued=false;sync();});};
  const observer=new MutationObserver(schedule);observer.observe(document.querySelector('main'),{childList:true,subtree:true});
  return {sync};
}
