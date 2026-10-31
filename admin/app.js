import {recurring,occurs,recurringVisits,weekNames} from '../recurrence.js?v=59';
import {initEmployeeProjections} from './employee-projections.js?v=59';
import {initReportReset} from './report-reset.js?v=59';
import {liveSlots,shiftExpired} from '../shift-time.js?v=56';
import {initAgendaReport} from './agenda-report.js?v=59';
import {bookingSlots} from './agenda-data.js?v=49';
import {resetAdminNavigation} from './navigation-start.js?v=48';
import {initStock} from './stock.js?v=59';
import {initTeam} from './team.js?v=58';
import {initQuotes} from './quotes.js?v=44';
import {todayPortugal, validDate, isPremium} from './client-dates.js';
import { createMapLinks } from './map-links.js';
import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js';
import { getAuth, setPersistence, browserSessionPersistence, signInWithEmailAndPassword, onAuthStateChanged, signOut, sendPasswordResetEmail, reauthenticateWithCredential, EmailAuthProvider, updatePassword } from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js';
import { getFirestore, collection, doc, onSnapshot, getDocsFromServer, query, where, runTransaction, serverTimestamp } from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js';
import { firebaseConfig } from './firebase-config.js';
import { createDataStore } from './data-store.js?v=59';
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
auth.languageCode = 'pt';
const db = getFirestore(app);
const store = createDataStore({collection, doc, runTransaction, serverTimestamp, getDocsFromServer, query, where}, db);
let state = {days: {}, bookings: [], clients: [], services: []};
let dayLocks = {};
let adminReady = false;
let busy = false;
let stopRole = null;
let stops = [];
let generation = 0;
function describeError(error) {
  const messages = {
    'auth/invalid-credential': 'Email ou palavra-passe incorretos.',
    'auth/wrong-password': 'A palavra-passe atual está incorreta.',
    'auth/invalid-email': 'Introduz um email válido.',
    'auth/user-not-found': 'Não foi possível iniciar sessão. Confirma os dados.',
    'auth/user-disabled': 'Esta conta está desativada.',
    'auth/operation-not-allowed': 'Não é possível iniciar sessão neste momento. Contacta o responsável pela administração.',
    'auth/configuration-not-found': 'O acesso ainda não está disponível. Contacta o responsável pela administração.',
    'auth/unauthorized-domain': 'O acesso por este endereço ainda não está disponível. Contacta o responsável pela administração.',
    'auth/too-many-requests': 'Demasiadas tentativas. Aguarda e tenta novamente.',
    'auth/network-request-failed': 'Não foi possível estabelecer ligação. Verifica a Internet.',
    'auth/weak-password': 'Escolhe uma palavra-passe mais forte.',
    'auth/password-does-not-meet-requirements': 'A nova palavra-passe não cumpre os requisitos de segurança.',
    'permission-denied': 'A tua conta não tem autorização para esta operação.',
    'unavailable': 'O serviço está temporariamente indisponível. Tenta novamente.',
    'failed-precondition': 'Não foi possível carregar os dados. Contacta o responsável pela administração.'
  };
  return messages[error.code] || (error.code ? 'Não foi possível concluir a operação. Tenta novamente.' : error.message || 'Não foi possível concluir a operação.');
}
let noticeTimer;
function notice(message, error = false) {
  const el = document.querySelector('#cloud-status');
  clearTimeout(noticeTimer);
  el.replaceChildren();
  el.hidden = !message;
  el.classList.toggle('is-error', error);
  if (!message) return;
  const text=document.createElement('span');text.textContent=message;el.append(text);
  if(message !== 'A guardar…') {
    const close=document.createElement('button');close.type='button';close.className='notice-close';close.setAttribute('aria-label','Fechar aviso');
    close.innerHTML='<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18" fill="none" stroke="currentColor" stroke-width="2"/></svg>';
    close.onclick=()=>notice('');el.append(close);
    noticeTimer=setTimeout(()=>notice(''),error?8000:4500);
  }
}

async function perform(operation, message) {
  if (!adminReady || busy) return false;
  if (!navigator.onLine) { notice('Sem Internet. Liga-te à rede antes de guardar alterações.', true); return false; }
  busy = true;
  document.body.classList.add('saving');
  notice('A guardar…');
  try {
    await operation();
    notice(message || 'Alterações guardadas.');
    return true;
  } catch (error) {
    notice(describeError(error), true);
    return false;
  } finally {
    busy = false;
    document.body.classList.remove('saving');
    render();
  }
}
async function writeDay(slots) {
  const day = key(chosen);
  if(day < todayPortugal()){notice('Os dias passados estão disponíveis apenas para consulta.',true);render();return;}
  await perform(() => store.setDay(day, slots), 'Disponibilidade guardada.');
}

let chosen=new Date();chosen.setHours(0,0,0,0);let view=new Date(chosen.getFullYear(),chosen.getMonth(),1);let overviewView=new Date(view);let overviewChosen=new Date(chosen);const $=s=>document.querySelector(s);const key=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;const escapeHtml=s=>String(s||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));const shifts=['Manhã','Tarde','Noite'];function holidaysPT(year){let a=year%19,b=Math.floor(year/100),c=year%100,d=Math.floor(b/4),e=b%4,f=Math.floor((b+8)/25),g=Math.floor((b-f+1)/3),h=(19*a+b-d-g+15)%30,i=Math.floor(c/4),k=c%4,l=(32+2*e+2*i-h-k)%7,m=Math.floor((a+11*h+22*l)/451),month=Math.floor((h+l-7*m+114)/31),day=(h+l-7*m+114)%31+1,easter=new Date(year,month-1,day),out={};[['01-01','Ano Novo'],['04-25','Dia da Liberdade'],['05-01','Dia do Trabalhador'],['06-10','Dia de Portugal'],['08-15','Assunção de Nossa Senhora'],['10-05','Implantação da República'],['11-01','Dia de Todos os Santos'],['12-01','Restauração da Independência'],['12-08','Imaculada Conceição'],['12-25','Natal']].forEach(([date,name])=>out[year+'-'+date]=name);[[-2,'Sexta-feira Santa'],[0,'Domingo de Páscoa'],[60,'Corpo de Deus']].forEach(([offset,name])=>{let dt=new Date(easter);dt.setDate(dt.getDate()+offset);out[key(dt)]=name});return out}function holiday(d){return holidaysPT(d.getFullYear())[key(d)]||''}function occupied(k){return Boolean(dayLocks[k])||state.bookings.some(b=>b.day===k&&b.status!=='cancelada')}function recurrenceAt(day,index){return state.services.find(s=>s.status==='ativo'&&occurs(s,day)&&shifts[index]===s.shift)}function get(k){return (state.days[k]||[false,false,false]).map((open,i)=>open&&!recurrenceAt(k,i))}function page(id){notice('');document.querySelectorAll('.nav-group').forEach(group=>{group.open=!!group.querySelector('[data-page="'+id+'"]')});document.querySelectorAll('.section').forEach(e=>e.classList.toggle('active',e.id===id));document.querySelectorAll('.nav button').forEach(e=>e.classList.toggle('active',e.dataset.page===id));$('#title').textContent=({overview:'Visão geral',availability:'Disponibilidade',week:'Agenda semanal',clients:'Clientes',account:'Conta de administrador',quotes:'Orçamentos',team:'Equipa',stock:'Artigos em stock',shopping:'Lista de compras',stockloans:'Empréstimos de equipamentos',stockreports:'Despesas e relatórios',agendareports:'Relatórios de ocupação',bookings:'Marcações'})[id];if(id==='overview'){render()}}const menu=$('#menu-toggle'), nav=$('#main-nav');function closeMenu(){nav.classList.remove('is-open');menu.setAttribute('aria-expanded','false');menu.setAttribute('aria-label','Abrir menu')}menu.onclick=()=>{let open=nav.classList.toggle('is-open');menu.setAttribute('aria-expanded',String(open));menu.setAttribute('aria-label',open?'Fechar menu':'Abrir menu')};document.addEventListener('keydown',e=>{if(e.key==='Escape')closeMenu()});document.querySelectorAll('.nav button').forEach(b=>b.onclick=()=>{page(b.dataset.page);closeMenu()});$('.go-bookings').onclick=()=>page('bookings');$('#overview-prev').onclick=()=>{overviewView.setMonth(overviewView.getMonth()-1);render()};$('#overview-next').onclick=()=>{overviewView.setMonth(overviewView.getMonth()+1);render()};$('#availability-today').onclick=()=>{chosen=new Date(todayPortugal()+'T12:00:00');view=new Date(chosen.getFullYear(),chosen.getMonth(),1);render()};$('.prev').onclick=()=>{view.setMonth(view.getMonth()-1);render()};$('.next').onclick=()=>{view.setMonth(view.getMonth()+1);render()};$('#openAll').onclick=()=>writeDay([true,true,true]);$('#closeAll').onclick=()=>writeDay([false,false,false]);$('#add').onclick=()=>{$('#dayInput').min=todayPortugal();$('#dayInput').value=key(chosen)<todayPortugal()?todayPortugal():key(chosen);$('#modal').showModal()};$('#cancel').onclick=()=>$('#modal').close();$('#filter').onchange=render;$('#form').onsubmit=async e=>{e.preventDefault();const input={name:$('#name').value.trim(),day:$('#dayInput').value,shift:$('#shift').value,notes:$('#notes').value.trim()};if(!input.name)return;if(input.day<todayPortugal()){notice('Escolhe uma data de hoje em diante.',true);$('#dayInput').reportValidity();return;}const ok=await perform(()=>store.createBooking(input),'Marcação guardada.');if(ok){$('#form').reset();$('#modal').close()}};function bookingHtml(b){
  const client=state.clients.find(c=>c.id===b.clientId);
  const address=b.address||client?.address||'',postcode=b.postcode||client?.postcode||'',city=b.city||client?.city||'';
  const phone=b.phone||client?.phone||'',email=b.email||client?.email||'';
  const phoneHref=String(phone).replace(/[^+0-9]/g,'');
  return `<article class="booking booking-detail"><div class="booking-info"><strong class="booking-name">${escapeHtml(b.name)}</strong>
  ${address?`<div class="booking-contact">${escapeHtml(address)}</div>`:''}
  ${postcode||city?`<div class="booking-contact">${escapeHtml([postcode,city].filter(Boolean).join(' · '))}</div>`:''}
  ${phone?`<div class="booking-contact"><span>Telefone:</span> <a href="tel:${escapeHtml(phoneHref)}">${escapeHtml(phone)}</a></div>`:''}
  ${email?`<div class="booking-contact"><span>Email:</span> <a href="mailto:${escapeHtml(encodeURIComponent(email))}">${escapeHtml(email)}</a></div>`:''}
  <div class="booking-service">${b.requestedService?`<div><b>Serviço:</b> ${escapeHtml(b.requestedService)}</div>`:''}<div><b>Data:</b> ${escapeHtml(b.day.split('-').reverse().join('/'))} · ${escapeHtml(b.shift)}</div></div>
  </div><div class="row booking-actions"><button class="btn" data-client-booking="${escapeHtml(b.id)}">${b.clientId?'Ver ficha':'Criar ficha'}</button><span class="badge ${escapeHtml(b.status)}">${({pendente:'Pendente',confirmada:'Confirmada',cancelada:'Cancelada',concluida:'Concluída'})[b.status]||escapeHtml(b.status)}</span>${b.status==='pendente'?`<button class="btn" data-action="confirmada" data-id="${escapeHtml(b.id)}">Confirmar</button>`:''}${b.status==='cancelada'?`<button class="btn danger" data-delete-booking="${escapeHtml(b.id)}">Apagar</button>`:''}${b.status==='confirmada'&&b.day<=todayPortugal()?`<button class="btn primary" data-action="concluida" data-id="${escapeHtml(b.id)}">Concluir marcação</button>`:''}${['pendente','confirmada'].includes(b.status)?`<button class="btn danger" data-action="cancelada" data-id="${escapeHtml(b.id)}">Cancelar</button>`:''}</div>
  ${b.notes?`<div class="booking-observations"><strong>Observações do cliente</strong><div>${escapeHtml(b.notes)}</div></div>`:''}</article>`;
}
function renderMonthGrid(container,month,selected,onSelect){container.innerHTML=['Seg','Ter','Qua','Qui','Sex','Sáb','Dom'].map(x=>`<div class="weekday">${x}</div>`).join('');const today=todayPortugal();const currentMonth=month.getFullYear()+'-'+String(month.getMonth()+1).padStart(2,'0');const first=1;const offset=(new Date(month.getFullYear(),month.getMonth(),first).getDay()+6)%7;for(let i=0;i<offset;i++){const blank=document.createElement('div');blank.className='day blank';container.append(blank)}let available=0,blocked=0;const n=new Date(month.getFullYear(),month.getMonth()+1,0).getDate();for(let i=first;i<=n;i++){let d=new Date(month.getFullYear(),month.getMonth(),i),k=key(d),past=k<todayPortugal(),open=!past&&liveSlots(k,get(k)).some(Boolean)&&!occupied(k),feriado=holiday(d);if(!past){open?available++:blocked++;}const button=document.createElement('button');button.type='button';button.className='day '+(open?'day-open':'day-closed')+(occupied(k)?' day-booked':'')+(k===today?' is-today':'')+(k===key(selected)?' sel':'')+(feriado?' holiday':'')+(past?' day-past':'')+(!past&&container.id==='overview-calendar'&&state.bookings.some(b=>b.day===k&&b.status==='pendente')?' day-pending':'');button.disabled=past&&container.id==='calendar';if(k===today)button.setAttribute('aria-current','date');button.setAttribute('aria-label',i+(k===today?' · Hoje':'')+(feriado?' · '+feriado:'')+', '+(occupied(k)?'marcado':open?'disponível':'fechado'));button.innerHTML=`<strong>${i}</strong>${k===today?'<span class="today-label">Hoje</span>':''}${feriado?'<span class="holiday-mark" aria-hidden="true">✦</span>':''}`;button.onclick=()=>onSelect(d);container.append(button)}return{available,blocked}}
function renderOverviewDay(){const k=key(overviewChosen),booked=occupied(k);$('#overview-selected').textContent=new Intl.DateTimeFormat('pt-PT',{day:'numeric',month:'long',year:'numeric'}).format(overviewChosen)+(holiday(overviewChosen)?' · '+holiday(overviewChosen):'');const bookings=state.bookings.filter(b=>b.day===k&&b.status!=='cancelada');$('#overview-summary').innerHTML=shifts.map((shift,i)=>{const booking=bookings.find(b=>bookingSlots(b).includes(i));const label=recurrenceAt(k,i)?'Serviço semanal reservado':booking?({pendente:'Pendente',confirmada:'Confirmado',concluida:'Realizado'})[booking.status]||'Ocupado':booked?'Bloqueado pela reserva':shiftExpired(k,i)?'Horário ultrapassado':get(k)[i]?'Aberto':'Fechado';return `<div class="consultation-turn"><strong>${shift}</strong><span class="${!booked&&liveSlots(k,get(k))[i]?'is-open':''}">${label}</span></div>`}).join('')+(bookings.length?'<p class="muted">'+bookings.map(b=>escapeHtml(b.name)+' · '+escapeHtml(b.shift)+' · '+escapeHtml(b.status)).join('<br>')+'</p>':'<p class="muted">Sem marcações neste dia.</p>')}
function render(){document.querySelectorAll('.month').forEach(e=>e.textContent=new Intl.DateTimeFormat('pt-PT',{month:'long',year:'numeric'}).format(view));renderMonthGrid($('#calendar'),view,chosen,d=>{chosen=d;render()});const summary=renderMonthGrid($('#overview-calendar'),overviewView,overviewChosen,d=>{overviewChosen=d;render()});const a=summary.available,bl=summary.blocked;$('#overview-month').textContent=new Intl.DateTimeFormat('pt-PT',{month:'long',year:'numeric'}).format(overviewView);renderOverviewDay();$('#available').textContent=a;$('#blocked').textContent=bl;$('#pending').textContent=state.bookings.filter(x=>x.status==='pendente'&&x.day>=todayPortugal()).length;$('#confirmed').textContent=state.bookings.filter(x=>x.status==='confirmada'&&x.day>=todayPortugal()).length;$('#selected-title').textContent=new Intl.DateTimeFormat('pt-PT',{day:'numeric',month:'long'}).format(chosen)+(holiday(chosen)?' · '+holiday(chosen):'');$('#openAll').disabled=[0,1,2].every(i=>shiftExpired(key(chosen),i)||recurrenceAt(key(chosen),i));$('#openAll').textContent=key(chosen)===todayPortugal()?'Abrir turnos restantes':'Abrir todos os turnos';$('#closeAll').disabled=key(chosen)<todayPortugal();$('#turns').innerHTML=shifts.map((s,i)=>`<label class="turn"><span><strong>${s}</strong><small>${recurrenceAt(key(chosen),i)?'Reservado · '+escapeHtml(state.clients.find(c=>c.id===recurrenceAt(key(chosen),i).clientId)?.name||'Serviço semanal'):shiftExpired(key(chosen),i)?'Horário ultrapassado':occupied(key(chosen))?'Dia com marcação':get(key(chosen))[i]?'Aberto':'Fechado'}</small></span><input class="switch" type="checkbox" data-shift="${i}" ${liveSlots(key(chosen),get(key(chosen)))[i]?'checked':''} ${shiftExpired(key(chosen),i)||recurrenceAt(key(chosen),i)?'disabled':''}></label>`).join('');document.querySelectorAll('[data-shift]').forEach(x=>x.onchange=()=>{const slots=[...get(key(chosen))];slots[x.dataset.shift]=x.checked;writeDay(slots)});let bs=state.bookings.filter(b=>!$('#filter').value||b.status===$('#filter').value);$('#booking-list').innerHTML=bs.length?bs.map(bookingHtml).join(''):'<div class="empty">Ainda não há marcações neste estado.</div>';const overviewRecent=state.bookings.filter(b=>b.day>=todayPortugal());$('#recent').innerHTML=overviewRecent.length?overviewRecent.slice(0,3).map(b=>`<div class="booking"><div><strong>${escapeHtml(b.name)}</strong><span class="muted">${escapeHtml(b.day.split('-').reverse().join('/'))} · ${escapeHtml(b.shift)}</span></div><span class="badge ${escapeHtml(b.status)}">${escapeHtml(b.status)}</span></div>`).join(''):'<div class="empty">Ainda não há pedidos.</div>';document.querySelectorAll('[data-action]').forEach(b=>b.onclick=async()=>{if(b.dataset.action==='cancelada'&&!confirm('Cancelar esta marcação? O dia voltará a estar disponível se tiver turnos abertos.'))return;await perform(()=>store.changeStatus(b.dataset.id,b.dataset.action),'Estado da marcação atualizado.')} )}$('#outlook-setup').onclick=()=>$('#outlook-dialog').showModal();$('#outlook-close').onclick=()=>$('#outlook-dialog').close();let weekStart=new Date();weekStart.setHours(0,0,0,0);let mobileDays=1;const mobileQuery=matchMedia('(max-width: 850px)');if(!mobileQuery.matches)weekStart.setDate(weekStart.getDate()-(weekStart.getDay()+6)%7);function periodSize(){return mobileQuery.matches?mobileDays:7}function renderWeek(){let count=periodSize();let end=new Date(weekStart);end.setDate(end.getDate()+count-1);const fmt=new Intl.DateTimeFormat('pt-PT',{day:'numeric',month:'short',year:'numeric'});$('#week-label').textContent=count===1?fmt.format(weekStart):fmt.format(weekStart)+' — '+fmt.format(end);let days=Array.from({length:count},(_,i)=>{let d=new Date(weekStart);d.setDate(d.getDate()+i);return d});$('#weekly').style.setProperty('--day-count',count);let out='<div class="week-head"></div>'+days.map(d=>`<div class="week-head${key(d)===todayPortugal()?' is-today':''}" ${key(d)===todayPortugal()?'aria-current="date"':''}><strong>${new Intl.DateTimeFormat('pt-PT',{weekday:mobileQuery.matches?'short':'long'}).format(d)}</strong><small>${new Intl.DateTimeFormat('pt-PT',{day:'numeric',month:'short'}).format(d)}</small>${key(d)===todayPortugal()?'<span class="today-label">Hoje</span>':''}${holiday(d)?`<small class="holiday-name">✦ ${escapeHtml(holiday(d))}</small>`:''}</div>`).join('');shifts.forEach(shift=>{out+=`<div class="week-time">${shift}</div>`;days.forEach(d=>{const items=[...state.bookings,...recurringVisits(state.services,state.clients,key(d),key(d))].filter(b=>b.day===key(d)&&(b.shift===shift||b.shift==='Dia inteiro')&&b.status!=='cancelada');out+='<div class="'+(key(d)===todayPortugal()?'week-today-column':'')+'">'+items.map(b=>`<span class="week-item"><strong>${escapeHtml(b.name)}</strong><small>${escapeHtml(b.status)}</small><button class="btn week-client" data-week-client="${escapeHtml(b.id)}">${b.clientId?'Ficha':'Criar ficha'}</button>${b.recurring?'<small>↻ Semanal</small>':''}</span>`).join('')+'</div>'})});$('#weekly').innerHTML=out}const originalRender=render;render=function(){originalRender();renderWeek()};$('#week-prev').onclick=()=>{weekStart.setDate(weekStart.getDate()-periodSize());renderWeek()};$('#week-next').onclick=()=>{weekStart.setDate(weekStart.getDate()+periodSize());renderWeek()};$('#week-today').onclick=()=>{weekStart=new Date(todayPortugal()+'T12:00:00');if(!mobileQuery.matches)weekStart.setDate(weekStart.getDate()-(weekStart.getDay()+6)%7);renderWeek()};document.querySelectorAll('[data-days]').forEach(b=>b.onclick=()=>{mobileDays=Number(b.dataset.days);document.querySelectorAll('[data-days]').forEach(x=>{let active=x===b;x.classList.toggle('selected',active);x.setAttribute('aria-pressed',String(active))});renderWeek()});mobileQuery.addEventListener('change',()=>{if(!mobileQuery.matches)weekStart.setDate(weekStart.getDate()-(weekStart.getDay()+6)%7);renderWeek()});let postcodeController=null;let postcodeTimer=null;const postcodeInput=$('#client-postcode');postcodeInput.addEventListener('input',()=>{let digits=postcodeInput.value.replace(/\D/g,'').slice(0,7);postcodeInput.value=digits.length>4?digits.slice(0,4)+'-'+digits.slice(4):digits;postcodeInput.setCustomValidity('');clearTimeout(postcodeTimer);if(postcodeController)postcodeController.abort();$('#postcode-suggestions').replaceChildren();$('#postcode-status').textContent='';if(digits.length===7)postcodeTimer=setTimeout(()=>lookupPostcode(postcodeInput.value),300)});postcodeInput.addEventListener('blur',()=>{postcodeInput.setCustomValidity(postcodeInput.value&&!/^\d{4}-\d{3}$/.test(postcodeInput.value)?'Introduz os 7 dígitos do código postal.':'')});async function lookupPostcode(cp){postcodeController=new AbortController();let signal=postcodeController.signal;$('#postcode-status').textContent='A procurar moradas…';try{let response=await fetch('https://json.geoapi.pt/codigo_postal/'+encodeURIComponent(cp),{headers:{Accept:'application/json'},signal});if(!response.ok)throw Error();let data=await response.json();if(signal.aborted||postcodeInput.value!==cp)return;let locality=String(data.Localidade||data['Designação Postal']||data.Concelho||'').trim();let streets=[...(Array.isArray(data.partes)?data.partes.map(x=>x&&x['Artéria']):[]),...(Array.isArray(data.ruas)?data.ruas:[])].filter(x=>typeof x==='string'&&x.trim());streets=[...new Map(streets.map(x=>[x.trim().toLocaleLowerCase('pt-PT'),x.trim()])).values()];let container=$('#postcode-suggestions');container.replaceChildren();if(!streets.length){$('#postcode-status').textContent='Não encontrámos ruas para este código postal. Podes escrever a morada manualmente.';if(locality&&!$('#client-city').value)$('#client-city').value=locality;return}streets.forEach(street=>{let button=document.createElement('button');button.type='button';button.className='postcode-option';button.textContent=street+(locality?' — '+locality:'');button.onclick=()=>{$('#client-address').value=street;$('#client-city').value=locality;container.replaceChildren();$('#postcode-status').textContent='Morada selecionada. Acrescenta o número da porta e o andar.';$('#client-address').focus();$('#client-address').setSelectionRange(street.length,street.length)};container.append(button)});$('#postcode-status').textContent=streets.length===1?'Escolhe a morada encontrada.':'Escolhe uma das '+streets.length+' moradas encontradas.'}catch(e){if(e.name==='AbortError')return;$('#postcode-status').textContent='Não foi possível obter sugestões. Podes escrever a morada e a localidade manualmente.'}}let serviceClientId = null;
let editingServiceId = null;
const serviceTypes = ['Casa completa','Divisões específicas da casa','Condomínio','Escritório','Espaço comercial','Limpeza pós-obra','Outra limpeza'];
function clientStart(client) { return client.clientSince || (client.createdAt?.toDate ? todayPortugal(client.createdAt.toDate()) : ''); }
function clientPremium(client) { return isPremium(clientStart(client)); }
function openServices(id) {
  notice('');
  serviceClientId = id;
  renderServiceList();
  if (!$('#services-modal').open) $('#services-modal').showModal();
}
function renderServiceList() {
  const client = state.clients.find(c=>c.id===serviceClientId);
  if (!client) return;
  $('#services-client-name').textContent = client.name;
  const services = state.services.filter(s=>s.clientId===client.id).sort((a,b)=>(b.startDate||'').localeCompare(a.startDate||''));
  $('#services-list').innerHTML = services.length ? services.map(s=>`<article class="service-record"><div class="head"><strong>${escapeHtml(s.title)}</strong><button class="btn" data-edit-service="${escapeHtml(s.id)}">Editar</button></div><span class="service-frequency">${escapeHtml(s.frequency)}${recurring(s)?' · '+weekNames[s.weekday-1]+' · '+escapeHtml(s.shift):''} · ${serviceStatusLabel(s)}</span><div class="muted">${escapeHtml(s.serviceType)}<br>Início: ${escapeHtml(s.startDate.split('-').reverse().join('/'))}${(s.endDate||s.frequency==='Pontual')?'<br>Término: '+escapeHtml((s.endDate||s.startDate).split('-').reverse().join('/')):'<br>Sem data de término'}${s.estimatedDuration?'<br>Duração prevista: '+escapeHtml(s.estimatedDuration):''}${s.areas?'<br>Áreas e tarefas: '+escapeHtml(s.areas):''}${s.notes?'<br>Observações: '+escapeHtml(s.notes):''}</div><div class="service-buttons">${(s.status||'ativo')==='ativo'?`<button class="btn" data-service-complete="${escapeHtml(s.id)}">Concluir</button><button class="btn" data-service-reschedule="${escapeHtml(s.id)}">Reagendar</button><button class="btn danger" data-service-cancel="${escapeHtml(s.id)}">Cancelar serviço</button>`:''}${s.status==='cancelado'?`<button class="btn danger" data-service-delete="${escapeHtml(s.id)}">Apagar serviço</button>`:''}</div></article>`).join('') : '<div class="empty">Ainda não há serviços adicionados a esta ficha.</div>';
  $('#legacy-service').hidden = Boolean(services.length || !client.service);
  $('#legacy-service').textContent = client.service ? 'Informação anterior: '+client.service+(client.serviceDetails?' · '+client.serviceDetails:'')+'. Usa “Adicionar serviço” para a organizar numa ficha de trabalho.' : '';
  $('#services-list').querySelectorAll('[data-edit-service]').forEach(button=>button.onclick=()=>openServiceForm(state.services.find(s=>s.id===button.dataset.editService)));
}
function openServiceForm(service) {
  notice('');
  const client = state.clients.find(c=>c.id===serviceClientId);
  if (!client) return;
  editingServiceId = service?.id || null;
  const hasServices=state.services.some(s=>s.clientId===client.id);
  $('#service-form').reset();
  $('#service-form-status').textContent='';
  $('#service-heading').textContent = service ? 'Editar serviço' : 'Adicionar serviço';
  $('#service-title').value=service?.title || (!hasServices?client.service:'') || '';
  $('#service-type').value=service?.serviceType || (!hasServices?client.service:'') || '';
  $('#service-frequency').value=service?.frequency || 'Pontual';
  $('#service-weekday').value=service?.weekday||'';$('#service-turn').value=service?.shift||'';
  $('#service-start').value=service?.startDate || todayPortugal();
  $('#service-end').value=service?.endDate || (service?.frequency==='Pontual'?service.startDate:'');
  $('#service-state').value=service?.status || 'ativo';
  delete $('#service-end').dataset.single;
  $('#service-no-end').checked=$('#service-frequency').value!=='Pontual'&&!service?.endDate;
  syncServiceDates();
  $('#service-duration').value=service?.estimatedDuration || '';
  $('#service-areas').value=service?.areas || '';
  $('#service-notes').value=service?.notes || (!hasServices?client.serviceDetails:'') || '';
  $('#services-modal').close();
  $('#service-modal').showModal();
}
$('#services-add').onclick=()=>openServiceForm(null);
$('#services-close').onclick=()=>$('#services-modal').close();
$('#service-cancel').onclick=()=>{$('#service-modal').close();openServices(serviceClientId)};
$('#service-form').onsubmit=async event=>{
  event.preventDefault();
  const service={id:editingServiceId,clientId:serviceClientId,title:$('#service-title').value.trim(),serviceType:$('#service-type').value,frequency:$('#service-frequency').value,...($('#service-frequency').value==='Semanal'?{weekday:Number($('#service-weekday').value),shift:$('#service-turn').value}:{}),startDate:$('#service-start').value,endDate:$('#service-end').value,status:$('#service-state').value,estimatedDuration:$('#service-duration').value.trim(),areas:$('#service-areas').value.trim(),notes:$('#service-notes').value.trim()};
  if (!service.title || !validDate(service.startDate) || (service.endDate && (!validDate(service.endDate)||service.endDate<service.startDate))) { $('#service-form-status').textContent='Preenche o nome do serviço e uma data válida.';return; }
  const ok=await perform(()=>store.saveService(service),'Serviço guardado na ficha do cliente.');
  if(ok){$('#service-modal').close();openServices(serviceClientId)}
  else $('#service-form-status').textContent=$('#cloud-status').textContent;
};
$('#client-list').addEventListener('click',event=>{const button=event.target.closest('[data-services-client]');if(button)openServices(button.dataset.servicesClient)});
// Recalcula a indicação premium quando a página volta a estar visível e ao mudar o dia.
setInterval(()=>{if(adminReady)renderClients()},60000);
document.addEventListener('visibilitychange',()=>{if(!document.hidden&&adminReady)renderClients()});
state.clients=Array.isArray(state.clients)?state.clients:[];let editingClient=null,linkBooking=null,pendingService='',pendingDetails='';function openClient(client,booking){notice('');clearTimeout(postcodeTimer);if(postcodeController)postcodeController.abort();$('#postcode-status').textContent='';$('#postcode-suggestions').replaceChildren();editingClient=client?client.id:null;linkBooking=booking?booking.id:null;pendingService=({'Limpeza profunda':'Casa completa','Limpeza pós-obra':'Limpeza pós-obra','Condomínio':'Condomínio','Empresa':'Espaço comercial','Serviço personalizado':'Outra limpeza'})[booking?.requestedService]||'';pendingDetails=booking?.notes||'';$('#client-title').textContent=client?'Editar ficha de cliente':'Nova ficha de cliente';$('#client-requested-service').textContent=booking?.requestedService?'Limpeza pedida no site: '+booking.requestedService:'';$('#client-requested-service').hidden=!booking?.requestedService;$('#client-name').value=client?.name||booking?.name||'';$('#client-phone').value=client?.phone||booking?.phone||'';$('#client-email').value=client?.email||booking?.email||'';$('#client-address').value=client?.address||booking?.address||'';$('#client-postcode').value=client?.postcode||booking?.postcode||'';$('#client-city').value=client?.city||booking?.city||'';$('#client-type').value=client?.type||'';$('#client-since').max=todayPortugal();$('#client-since').value=client?clientStart(client):todayPortugal();$('#client-form-status').textContent='';$('#client-notes').value=client?.notes||'';$('#client-modal').showModal()}$('#new-client').onclick=()=>openClient(null,null);$('#client-cancel').onclick=()=>$('#client-modal').close();$('#client-form').onsubmit=async e=>{e.preventDefault();let c={id:editingClient||crypto.randomUUID(),name:$('#client-name').value.trim(),phone:$('#client-phone').value.trim(),email:$('#client-email').value.trim(),address:$('#client-address').value.trim(),postcode:$('#client-postcode').value.trim(),city:$('#client-city').value.trim(),type:$('#client-type').value,clientSince:$('#client-since').value,service:state.clients.find(x=>x.id===editingClient)?.service||pendingService,serviceDetails:state.clients.find(x=>x.id===editingClient)?.serviceDetails||pendingDetails,notes:$('#client-notes').value.trim()};if(!c.name||!validDate(c.clientSince)||c.clientSince>todayPortugal()){$('#client-form-status').textContent='Preenche o nome e uma data de início válida.';return}const digits=c.phone.replace(/\D/g,'');if(digits.length<7||digits.length>15){$('#client-form-status').textContent='Introduz um telefone válido, incluindo o indicativo quando necessário.';$('#client-phone').focus();return}const ok=await perform(()=>store.saveClient(c,linkBooking),'Ficha de cliente guardada.');if(ok)$('#client-modal').close();else $('#client-form-status').textContent=$('#cloud-status').textContent};function renderClients(){let box=$('#client-list');box.innerHTML=state.clients.length?state.clients.map(c=>{let address=[c.address,c.postcode,c.city].filter(Boolean).join(', ');const maps=createMapLinks(c);let booked=state.bookings.filter(b=>b.clientId===c.id).map(b=>`${escapeHtml(b.day.split('-').reverse().join('/'))} · ${escapeHtml(b.shift)} · ${escapeHtml(b.status)}`).join('<br>');return `<div class="client-card"><div><strong>${escapeHtml(c.name)}${clientPremium(c)?'<span class="premium-badge"><span aria-hidden="true">👑</span> Cliente premium</span>':''}</strong><div class="muted">${c.phone?'Telefone: '+escapeHtml(c.phone)+'<br>':''}${c.email?'Email: '+escapeHtml(c.email)+'<br>':''}${address?'Morada: '+escapeHtml(address)+'<br>':''}${state.bookings.some(b=>b.clientId===c.id&&b.requestedService)?'Limpezas pedidas no site: '+[...new Set(state.bookings.filter(b=>b.clientId===c.id&&b.requestedService).map(b=>b.requestedService))].map(escapeHtml).join(', ')+'<br>':''}${c.type?'Tipo de cliente: '+escapeHtml(c.type)+'<br>':''}${clientStart(c)?'Cliente desde: '+escapeHtml(clientStart(c).split('-').reverse().join('/'))+'<br>':'Data de início por definir<br>'}${c.notes?'Observações: '+escapeHtml(c.notes)+'<br>':''}${booked?'Marcações:<br>'+booked:'Sem marcações associadas'}</div></div><div class="row client-actions"><button class="btn" data-services-client="${escapeHtml(c.id)}">Serviços (${state.services.filter(s=>s.clientId===c.id).length})</button><button class="btn" data-edit-client="${escapeHtml(c.id)}">Editar</button><button class="btn danger" data-delete-client="${escapeHtml(c.id)}">Apagar ficha</button>${maps?`<a class="btn map-button" href="${escapeHtml(maps.waze)}" target="_blank" rel="noopener noreferrer" title="Abrir no Waze" aria-label="Abrir morada no Waze"><img src="map-waze.jpg" alt="" width="30" height="30"></a><a class="btn map-button" href="${escapeHtml(maps.apple)}" target="_blank" rel="noopener noreferrer" title="Abrir no Apple Maps" aria-label="Abrir morada no Apple Maps"><img src="map-apple.jpg" alt="" width="30" height="30"></a><a class="btn map-button" href="${escapeHtml(maps.google)}" target="_blank" rel="noopener noreferrer" title="Abrir no Google Maps" aria-label="Abrir morada no Google Maps"><img src="map-google.jpg" alt="" width="30" height="30"></a>`:''}</div></div>`}).join(''):'<div class="empty">Ainda não há fichas de cliente. Podes criar uma ficha a partir de uma marcação.</div>';renderServiceList();document.querySelectorAll('[data-edit-client]').forEach(x=>x.onclick=()=>openClient(state.clients.find(c=>c.id===x.dataset.editClient),null));document.querySelectorAll('[data-client-booking]').forEach(x=>x.onclick=()=>{let b=state.bookings.find(b=>b.id===x.dataset.clientBooking);let c=b.clientId?state.clients.find(c=>c.id===b.clientId):null;openClient(c,b)})}$('#weekly').addEventListener('click',e=>{let button=e.target.closest('[data-week-client]');if(!button)return;let b=state.bookings.find(x=>x.id===button.dataset.weekClient)||recurringVisits(state.services,state.clients,key(weekStart),key(new Date(weekStart.getFullYear(),weekStart.getMonth(),weekStart.getDate()+7))).find(x=>x.id===button.dataset.weekClient);if(!b)return;openClient(b.clientId?state.clients.find(c=>c.id===b.clientId):null,b)});const previousRender=render;render=function(){previousRender();renderClients()};function adjustMobileDialogs(){if(!matchMedia('(max-width: 850px)').matches)return;let v=window.visualViewport;document.querySelectorAll('dialog').forEach(dialog=>{dialog.style.setProperty('--visible-height',(v?v.height:window.innerHeight)+'px');dialog.style.setProperty('--visible-top',(v?v.offsetTop:0)+'px')})}function revealDialogField(){const field=document.activeElement;if(!field||!field.closest('dialog[open]'))return;setTimeout(()=>{if(document.activeElement===field)field.scrollIntoView({block:'nearest',inline:'nearest',behavior:'smooth'})},180)}if(window.visualViewport){window.visualViewport.addEventListener('resize',()=>{adjustMobileDialogs();revealDialogField()});window.visualViewport.addEventListener('scroll',adjustMobileDialogs)}window.addEventListener('resize',adjustMobileDialogs);document.querySelectorAll('dialog').forEach(dialog=>dialog.addEventListener('focusin',e=>{if(e.target.matches('input,select,textarea')){adjustMobileDialogs();revealDialogField()}}));adjustMobileDialogs();$('#date').textContent=new Intl.DateTimeFormat('pt-PT',{weekday:'long',day:'numeric',month:'long',year:'numeric'}).format(new Date());render();

function stopData() {
  resetAdminNavigation({page,closeMenu});
  stops.forEach(stop => stop()); stops = [];
  adminReady = false;
  state = { days: {}, bookings: [], clients: [], services: [] }; dayLocks = {};
  document.body.classList.add('auth-locked');
  document.querySelectorAll('dialog[open]').forEach(d => d.close());
  render();
}
function authMessage(text) { $('#auth-status').textContent = text; }
function loadAdminData(user, token) {
  let loaded = new Set();
  function ready(name) {
    loaded.add(name);
    if (loaded.size === 4 && token === generation) {
      if(!adminReady)
      adminReady = true;
      document.body.classList.remove('auth-locked');
      $('#signed-email').textContent = user.email || '';
      notice(navigator.onLine ? '' : 'Sem ligação à Internet. As alterações estão indisponíveis.', !navigator.onLine);
    }
    render();
  }
  function failure(error) {
    if (token !== generation) return;
    stopData();
    authMessage(describeError(error));
  }
  stops.push(onSnapshot(collection(db, 'availability'), {includeMetadataChanges:true}, snapshot => {
    if (token !== generation) return;
    state.days = {}; dayLocks = {};
    snapshot.forEach(d => { state.days[d.id] = d.data().slots || [false,false,false]; dayLocks[d.id] = d.data().bookingId || ''; });
    if (!snapshot.metadata.fromCache) ready('days');
  }, failure));
  stops.push(onSnapshot(collection(db, 'bookings'), {includeMetadataChanges:true}, snapshot => {
    if (token !== generation) return;
    state.bookings = snapshot.docs.map(d => ({...d.data(), id:d.id})).sort((a,b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0));
    if (!snapshot.metadata.fromCache) ready('bookings');
  }, failure));
  stops.push(onSnapshot(collection(db, 'clients'), {includeMetadataChanges:true}, snapshot => {
    if (token !== generation) return;
    state.clients = snapshot.docs.map(d => ({...d.data(), id:d.id})).sort((a,b) => a.name.localeCompare(b.name,'pt'));
    if (!snapshot.metadata.fromCache) ready('clients');
  }, failure));
  stops.push(onSnapshot(collection(db,'services'), {includeMetadataChanges:true}, snapshot=>{
    if(token!==generation)return;
    state.services=snapshot.docs.map(d=>({...d.data(),id:d.id}));
    if(!snapshot.metadata.fromCache)ready('services');
    renderServiceList();
  },failure));
}
$('#login-form').onsubmit = async event => {
  event.preventDefault();
  const button = $('#login-submit'); button.disabled = true;
  authMessage('A iniciar sessão…');
  try {
    await setPersistence(auth, browserSessionPersistence);
    await signInWithEmailAndPassword(auth, $('#login-email').value.trim(), $('#login-password').value);
    $('#login-password').value = '';
  } catch (error) { authMessage(describeError(error)); }
  finally { button.disabled = false; }
};
async function requestRecovery(email, status, button) {
  if (!email) {status.textContent='Introduz o email da tua conta.';status.dataset.state='error';return;}
  const original=button.textContent;
  button.disabled=true;button.textContent='A enviar…';
  status.textContent='A enviar o pedido de recuperação…';status.dataset.state='pending';
  try {
    await sendPasswordResetEmail(auth,email);
    status.textContent='Pedido aceite. Se esta conta puder recuperar a palavra-passe por email, receberás uma mensagem com o link. Verifica a caixa de entrada e o spam.';
    status.dataset.state='success';
  } catch(error) {
    status.textContent=describeError(error);status.dataset.state='error';
  } finally {button.disabled=false;button.textContent=original;}
}
$('#login-reset').onclick = async () => {
  const email=$('#login-email').value.trim();
  if(!email||!$('#login-email').checkValidity()){authMessage('Preenche um email válido para pedir a recuperação.');$('#login-email').focus();return;}
  await requestRecovery(email,$('#auth-status'),$('#login-reset'));
};
async function logout() {
  stopData();
  try { await signOut(auth); } catch (error) { authMessage(describeError(error)); }
}
$('#logout').onclick = logout;
$('#auth-logout').onclick = logout;
$('#account-reset').onclick = async () => {
  const email=auth.currentUser?.email;
  if(!email){$('#account-reset-status').textContent='A sessão terminou. Entra novamente para recuperar o acesso.';return;}
  await requestRecovery(email,$('#account-reset-status'),$('#account-reset'));
};
$('#password-form').onsubmit = async event => {
  event.preventDefault();
  const password = $('#new-password').value;
  if (password !== $('#confirm-password').value) { notice('As novas palavras-passe não coincidem.',true); return; }
  const user = auth.currentUser;
  if (!user?.email) return;
  const current = $('#current-password').value;
  const success = await perform(async () => {
    await reauthenticateWithCredential(user, EmailAuthProvider.credential(user.email,current));
    await updatePassword(user,password);
  }, 'Palavra-passe alterada com sucesso.');
  if (success) $('#password-form').reset();
};
window.addEventListener('offline',()=>notice('Sem Internet. Liga-te à rede para guardar alterações.',true));
window.addEventListener('online',()=>notice('Ligação à Internet restabelecida.'));
onAuthStateChanged(auth, user => {
  generation++;
  const token = generation;
  if (stopRole) { stopRole(); stopRole = null; }
  stopData();
  $('#auth-logout').hidden = !user;
  if (!user) { authMessage('Entra com a conta de administrador da GesLimp.'); return; }
  authMessage('A verificar a autorização de administrador…');
  stopRole = onSnapshot(doc(db,'admins',user.uid), {includeMetadataChanges:true}, snapshot => {
    if (token !== generation || snapshot.metadata.fromCache) return;
    if (!snapshot.exists() || snapshot.data().enabled !== true) {
      stopData();
      authMessage('A tua conta ainda não tem acesso à administração. Contacta o responsável para obter autorização.');
      return;
    }
    if (!stops.length) { authMessage('A carregar os dados…'); loadAdminData(user,token); }
  }, error => {
    if (token !== generation) return;
    stopData(); authMessage(describeError(error));
  });
});

let refreshing = false;
$('#refresh-data').onclick = async () => {
  if (refreshing || !adminReady || busy) return;
  const button=$('#refresh-data'), label=button.querySelector('span');
  const token=generation;
  refreshing=true;button.disabled=true;button.setAttribute('aria-busy','true');label.textContent='A atualizar…';
  try {
    if (!navigator.onLine) throw new Error('Sem ligação à Internet. Tenta novamente quando estiveres online.');
    // Keep the existing listeners active: they apply the authoritative snapshots.
    await Promise.all(['availability','bookings','clients','services'].map(name=>getDocsFromServer(collection(db,name))));
    if(token===generation && adminReady) notice('Dados atualizados.');
  } catch(error) {
    if(token===generation && adminReady) notice(describeError(error),true);
  } finally {
    refreshing=false;button.disabled=false;button.setAttribute('aria-busy','false');label.textContent='Atualizar';
  }
};

function serviceStatusLabel(s){return ({ativo:'Ativo',concluido:'Concluído',cancelado:'Cancelado'})[s.status||'ativo']||'Ativo'}
function syncServiceDates(){const weekly=$('#service-frequency').value==='Semanal';$('#service-recurring-fields').hidden=!weekly;$('#service-weekday').required=weekly;$('#service-turn').required=weekly;const single=$('#service-frequency').value==='Pontual';const end=$('#service-end'),noEnd=$('#service-no-end');if(!single&&end.dataset.single==='true'){noEnd.checked=true;end.value='';}end.dataset.single=String(single);$('#service-no-end-label').hidden=single;noEnd.disabled=single;end.min=$('#service-start').value;end.readOnly=single;end.disabled=!single&&noEnd.checked;if(single)end.value=$('#service-start').value;else if(noEnd.checked)end.value='';}
$('#service-no-end').addEventListener('change',syncServiceDates);
$('#service-frequency').addEventListener('change',syncServiceDates);
$('#service-start').addEventListener('change',syncServiceDates);
document.addEventListener('click',async event=>{
 const b=event.target.closest('[data-delete-client],[data-delete-booking],[data-service-complete],[data-service-reschedule],[data-service-cancel],[data-service-delete]');if(!b||busy||!adminReady)return;
 if(b.dataset.deleteClient){
  const id=b.dataset.deleteClient;
  if(state.services.some(s=>s.clientId===id&&s.status!=='cancelado')||state.bookings.some(s=>s.clientId===id&&s.status!=='cancelada')){notice('Cancela primeiro os serviços e as marcações associados a esta ficha. Depois poderás apagar a ficha e os registos cancelados em conjunto.',true);return;}
  if(confirm('Apagar definitivamente esta ficha de cliente e todos os seus serviços e marcações cancelados? Esta ação não pode ser desfeita.'))await perform(()=>store.deleteClient(id),'Ficha e registos cancelados apagados.');return;
 }
 if(b.dataset.deleteBooking){if(confirm('Apagar definitivamente esta marcação cancelada?'))await perform(()=>store.deleteCancelledBooking(b.dataset.deleteBooking),'Marcação apagada.');return;}
 const id=b.dataset.serviceComplete||b.dataset.serviceReschedule||b.dataset.serviceCancel||b.dataset.serviceDelete;
 const service=state.services.find(s=>s.id===id);if(!service)return;
 if(b.dataset.serviceReschedule){openServiceForm(service);$('#service-heading').textContent='Reagendar serviço';$('#service-start').min=todayPortugal();$('#service-state').value='ativo';$('#service-start').focus();return;}
 if(b.dataset.serviceDelete){if(confirm('Apagar definitivamente este serviço cancelado?'))await perform(()=>store.deleteCancelledService(id),'Serviço apagado.');return;}
 const status=b.dataset.serviceComplete?'concluido':'cancelado';
 if(confirm(status==='concluido'?(recurring(service)?'Concluir este serviço semanal e terminar as próximas visitas?':'Marcar este serviço como concluído?'):'Cancelar este serviço?'))await perform(()=>store.saveService({...service,status,endDate:service.frequency==='Pontual'?service.startDate:(recurring(service)&&(!service.endDate||service.endDate>todayPortugal())?todayPortugal():(service.endDate||todayPortugal()))}),'Estado do serviço atualizado.');
});

initQuotes({auth,db,getState:()=>state,ready:()=>adminReady,store,openClient,page,notice});

initTeam({auth,db,getState:()=>state,ready:()=>adminReady,notice});
adjustMobileDialogs();

initReportReset({auth,db,ready:()=>adminReady,notice});
initStock({auth,db,getState:()=>state,ready:()=>adminReady,notice});
adjustMobileDialogs();

// Cada entrada começa na Visão geral, sem recuperar secções abertas.
resetAdminNavigation({page,closeMenu});
window.addEventListener('pageshow',event=>{if(event.persisted)resetAdminNavigation({page,closeMenu})});

const agendaReportView=initAgendaReport({auth,db,getState:()=>state,ready:()=>adminReady});
const renderBeforeAgendaReports=render;render=function(){renderBeforeAgendaReports();agendaReportView.render()};

setInterval(()=>{if(adminReady&&!document.hidden)render()},30000);
document.addEventListener('visibilitychange',()=>{if(!document.hidden&&adminReady)render()});

initEmployeeProjections({auth,db,ready:()=>adminReady,notice});
