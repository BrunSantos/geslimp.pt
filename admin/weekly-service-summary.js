import {recurringVisits,recurring} from '../recurrence.js?v=111';

// Datas civis de Lisboa recebidas da aplicação; cálculo em UTC evita desvios de DST.
export function weekBounds(today){
 const date=new Date(today+'T12:00:00Z');
 date.setUTCDate(date.getUTCDate()-(date.getUTCDay()+6)%7);
 const from=date.toISOString().slice(0,10);date.setUTCDate(date.getUTCDate()+6);
 return {from,to:date.toISOString().slice(0,10)};
}
export function weeklyServiceSummary(state,today){
 const {from,to}=weekBounds(today),services=state.services||[],bookings=state.bookings||[],completions=state.completions||[];
 const rows=new Map(),byId=new Map(services.map(s=>[s.id,s])),bookingIds=new Set(bookings.map(b=>b.id));
 const inside=day=>day>=from&&day<=to;
 function add(serviceId,day,isRecurring,done){
  if(!inside(day))return;
  const key=serviceId+'|'+day,old=rows.get(key);
  rows.set(key,{serviceId,day,recurring:isRecurring,done:day<=today&&Boolean(done||old?.done)});
 }
 for(const b of bookings){
  if(!['confirmada','concluida'].includes(b.status))continue;
  const id='site-'+b.id,s=byId.get(id);if(s?.status==='cancelado')continue;
  add(id,b.day,false,b.status==='concluida'||s?.status==='concluido');
 }
 const visits=recurringVisits(services,state.clients||[],from,to,completions);
 for(const v of visits){
  const s=byId.get(v.serviceId);if(s?.status==='cancelado')continue;
  // A marcação e a ficha importada representam a mesma visita.
  if(v.serviceId?.startsWith('site-')&&bookingIds.has(v.serviceId.slice(5)))continue;
  add(v.serviceId,v.day,s?recurring(s):Boolean(v.recurring),v.status==='concluida');
 }
 // Inclui também serviços pontuais antigos que ainda não têm turno definido.
 for(const s of services){
  if(s.frequency!=='Pontual'||s.status==='cancelado'||(s.id.startsWith('site-')&&bookingIds.has(s.id.slice(5))))continue;
  add(s.id,s.startDate,false,s.status==='concluido'||completions.some(c=>c.serviceId===s.id&&c.day===s.startDate));
 }
 const visitsInWeek=[...rows.values()],total=visitsInWeek.length,completed=visitsInWeek.filter(v=>v.done).length;
 const group=flag=>{const list=visitsInWeek.filter(v=>v.recurring===flag);return {total:list.length,completed:list.filter(v=>v.done).length};};
 return {from,to,total,completed,remaining:total-completed,percent:total?Math.round(100*completed/total):0,recurring:group(true),single:group(false)};
}
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function renderWeeklyServiceSummary(root,state,today,{ready=true,updated='Última atualização: a aguardar'}={}){
 if(!root)return;
 const n=weeklyServiceSummary(state,today),fmt=new Intl.DateTimeFormat('pt-PT',{timeZone:'UTC',day:'numeric',month:'long',year:'numeric'});
 const range=fmt.formatRange(new Date(n.from+'T12:00:00Z'),new Date(n.to+'T12:00:00Z'));
 root.setAttribute('aria-busy',String(!ready));
 root.innerHTML=`<h2 id="weekly-services-title">Serviços desta semana</h2><p class="weekly-period">${range}</p>${ready?`<div class="weekly-counts"><div><strong>${n.total}</strong><span>Programados</span></div><div class="weekly-completed"><strong>${n.completed}</strong><span>Concluídos</span></div><div class="weekly-remaining"><strong>${n.remaining}</strong><span>Por concluir</span></div></div><div class="weekly-progress-label"><strong>${n.completed} de ${n.total} serviços concluídos</strong><strong>${n.percent}%</strong></div><progress max="${n.total||1}" value="${n.completed}" aria-label="Serviços concluídos nesta semana">${n.percent}%</progress>${!n.total?'<p class="weekly-empty">Sem serviços programados para esta semana.</p>':''}<p class="weekly-help">Inclui visitas recorrentes e serviços pontuais.</p><dl class="weekly-breakdown"><div><dt>Recorrentes</dt><dd>${n.recurring.completed} de ${n.recurring.total} concluídos</dd></div><div><dt>Pontuais</dt><dd>${n.single.completed} de ${n.single.total} concluídos</dd></div></dl>`:'<p role="status">A carregar os serviços da semana…</p>'}<div class="weekly-footer"><small id="weekly-services-updated">${esc(updated)}</small><button type="button" class="btn primary" id="weekly-services-agenda" ${ready?'':'disabled'}>Ver agenda da semana</button></div>`;
 return n;
}
