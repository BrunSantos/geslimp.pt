import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js';
import { getAuth, setPersistence, browserSessionPersistence, signInWithEmailAndPassword, onAuthStateChanged, signOut, sendPasswordResetEmail, reauthenticateWithCredential, EmailAuthProvider, updatePassword } from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js';
import { getFirestore, collection, doc, onSnapshot, runTransaction, serverTimestamp } from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js';
import { firebaseConfig } from './firebase-config.js';
import { createDataStore } from './data-store.js';
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
auth.languageCode = 'pt';
const db = getFirestore(app);
const store = createDataStore({collection, doc, runTransaction, serverTimestamp}, db);
let state = {days: {}, bookings: [], clients: []};
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
  el.textContent = message;
  el.hidden = !message;
  el.classList.toggle('is-error', error);
  if (message && !error && message !== 'A guardar…') noticeTimer = setTimeout(() => { el.hidden = true; el.textContent = ''; }, 4500);
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
  await perform(() => store.setDay(day, slots), 'Disponibilidade guardada.');
}

let chosen=new Date();chosen.setHours(0,0,0,0);let view=new Date(chosen.getFullYear(),chosen.getMonth(),1);const $=s=>document.querySelector(s);const key=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;const escapeHtml=s=>String(s||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));const shifts=['Manhã','Tarde','Noite'];function holidaysPT(year){let a=year%19,b=Math.floor(year/100),c=year%100,d=Math.floor(b/4),e=b%4,f=Math.floor((b+8)/25),g=Math.floor((b-f+1)/3),h=(19*a+b-d-g+15)%30,i=Math.floor(c/4),k=c%4,l=(32+2*e+2*i-h-k)%7,m=Math.floor((a+11*h+22*l)/451),month=Math.floor((h+l-7*m+114)/31),day=(h+l-7*m+114)%31+1,easter=new Date(year,month-1,day),out={};[['01-01','Ano Novo'],['04-25','Dia da Liberdade'],['05-01','Dia do Trabalhador'],['06-10','Dia de Portugal'],['08-15','Assunção de Nossa Senhora'],['10-05','Implantação da República'],['11-01','Dia de Todos os Santos'],['12-01','Restauração da Independência'],['12-08','Imaculada Conceição'],['12-25','Natal']].forEach(([date,name])=>out[year+'-'+date]=name);[[-2,'Sexta-feira Santa'],[0,'Domingo de Páscoa'],[60,'Corpo de Deus']].forEach(([offset,name])=>{let dt=new Date(easter);dt.setDate(dt.getDate()+offset);out[key(dt)]=name});return out}function holiday(d){return holidaysPT(d.getFullYear())[key(d)]||''}function occupied(k){return Boolean(dayLocks[k])||state.bookings.some(b=>b.day===k&&b.status!=='cancelada')}function get(k){return state.days[k]||[false,false,false]}function page(id){document.querySelectorAll('.section').forEach(e=>e.classList.toggle('active',e.id===id));document.querySelectorAll('.nav button').forEach(e=>e.classList.toggle('active',e.dataset.page===id));$('#title').textContent=({overview:'Visão geral',availability:'Disponibilidade',week:'Agenda semanal',clients:'Clientes',account:'Conta de administrador',bookings:'Marcações'})[id]}const menu=$('#menu-toggle'), nav=$('#main-nav');function closeMenu(){nav.classList.remove('is-open');menu.setAttribute('aria-expanded','false');menu.setAttribute('aria-label','Abrir menu')}menu.onclick=()=>{let open=nav.classList.toggle('is-open');menu.setAttribute('aria-expanded',String(open));menu.setAttribute('aria-label',open?'Fechar menu':'Abrir menu')};document.addEventListener('keydown',e=>{if(e.key==='Escape')closeMenu()});document.querySelectorAll('.nav button').forEach(b=>b.onclick=()=>{page(b.dataset.page);closeMenu()});$('.go-bookings').onclick=()=>page('bookings');$('.go-overview').onclick=()=>page('overview');$('.prev').onclick=()=>{view.setMonth(view.getMonth()-1);render()};$('.next').onclick=()=>{view.setMonth(view.getMonth()+1);render()};$('#openAll').onclick=()=>writeDay([true,true,true]);$('#closeAll').onclick=()=>writeDay([false,false,false]);$('#add').onclick=()=>{$('#dayInput').value=key(chosen);$('#modal').showModal()};$('#cancel').onclick=()=>$('#modal').close();$('#filter').onchange=render;$('#form').onsubmit=async e=>{e.preventDefault();const input={name:$('#name').value.trim(),day:$('#dayInput').value,shift:$('#shift').value,notes:$('#notes').value.trim()};if(!input.name)return;const ok=await perform(()=>store.createBooking(input),'Marcação guardada.');if(ok){$('#form').reset();$('#modal').close()}};function bookingHtml(b){return `<div class="booking"><div><strong>${escapeHtml(b.name)}</strong><span class="muted">${escapeHtml(b.day.split('-').reverse().join('/'))} · ${escapeHtml(b.shift)}${b.notes?' · '+escapeHtml(b.notes):''}</span></div><div class="row"><button class="btn" data-client-booking="${escapeHtml(b.id)}">${b.clientId?'Ficha do cliente':'Criar ficha'}</button><span class="badge ${b.status}">${b.status}</span>${b.status==='pendente'?`<button class="btn" data-action="confirmada" data-id="${escapeHtml(b.id)}">Confirmar</button>`:''}${b.status!=='cancelada'?`<button class="btn danger" data-action="cancelada" data-id="${escapeHtml(b.id)}">Cancelar</button>`:''}</div></div>`}function render(){document.querySelectorAll('.month').forEach(e=>e.textContent=new Intl.DateTimeFormat('pt-PT',{month:'long',year:'numeric'}).format(view));let c=$('#calendar');c.innerHTML=['Seg','Ter','Qua','Qui','Sex','Sáb','Dom'].map(x=>`<div class="weekday">${x}</div>`).join('');let offset=(new Date(view.getFullYear(),view.getMonth(),1).getDay()+6)%7;for(let i=0;i<offset;i++)c.innerHTML+='<div class="day blank"></div>';let n=new Date(view.getFullYear(),view.getMonth()+1,0).getDate(),a=0,bl=0;for(let i=1;i<=n;i++){let d=new Date(view.getFullYear(),view.getMonth(),i),k=key(d),isOpen=get(k).some(Boolean)&&!occupied(k);if(isOpen)a++;else bl++;let button=document.createElement('button');let feriado=holiday(d);button.className='day '+(isOpen?'day-open':'day-closed')+(occupied(k)?' day-booked':'')+(k===key(chosen)?' sel':'')+(feriado?' holiday':'');button.setAttribute('aria-label',i+(feriado?' de '+feriado:'')+', '+(occupied(k)?'marcado':isOpen?'disponível':'fechado'));button.innerHTML=`<strong>${i}</strong>${feriado?'<span class="holiday-mark" aria-hidden="true">✦</span>':''}<span class="dot ${isOpen?'':'off'}">${occupied(k)?'Marcado':isOpen?'Disponível':'Fechado'}</span>`;button.onclick=()=>{chosen=d;render()};c.appendChild(button)}$('#available').textContent=a;$('#blocked').textContent=bl;$('#pending').textContent=state.bookings.filter(x=>x.status==='pendente').length;$('#confirmed').textContent=state.bookings.filter(x=>x.status==='confirmada').length;$('#selected-title').textContent=new Intl.DateTimeFormat('pt-PT',{day:'numeric',month:'long'}).format(chosen)+(holiday(chosen)?' · '+holiday(chosen):'');$('#turns').innerHTML=shifts.map((s,i)=>`<label class="turn"><span><strong>${s}</strong><small>${occupied(key(chosen))?'Dia com marcação':get(key(chosen))[i]?'Aberto':'Fechado'}</small></span><input class="switch" type="checkbox" data-shift="${i}" ${get(key(chosen))[i]?'checked':''}></label>`).join('');document.querySelectorAll('[data-shift]').forEach(x=>x.onchange=()=>{const slots=[...get(key(chosen))];slots[x.dataset.shift]=x.checked;writeDay(slots)});let bs=state.bookings.filter(b=>!$('#filter').value||b.status===$('#filter').value);$('#booking-list').innerHTML=bs.length?bs.map(bookingHtml).join(''):'<div class="empty">Ainda não há marcações neste estado.</div>';$('#recent').innerHTML=state.bookings.length?state.bookings.slice(0,3).map(bookingHtml).join(''):'<div class="empty">Ainda não há pedidos.</div>';document.querySelectorAll('[data-action]').forEach(b=>b.onclick=async()=>{if(b.dataset.action==='cancelada'&&!confirm('Cancelar esta marcação? O dia voltará a estar disponível se tiver turnos abertos.'))return;await perform(()=>store.changeStatus(b.dataset.id,b.dataset.action),'Estado da marcação atualizado.')} )}$('#outlook-setup').onclick=()=>$('#outlook-dialog').showModal();$('#outlook-close').onclick=()=>$('#outlook-dialog').close();let weekStart=new Date();weekStart.setHours(0,0,0,0);let mobileDays=1;const mobileQuery=matchMedia('(max-width: 850px)');if(!mobileQuery.matches)weekStart.setDate(weekStart.getDate()-(weekStart.getDay()+6)%7);function periodSize(){return mobileQuery.matches?mobileDays:7}function renderWeek(){let count=periodSize();let end=new Date(weekStart);end.setDate(end.getDate()+count-1);const fmt=new Intl.DateTimeFormat('pt-PT',{day:'numeric',month:'short',year:'numeric'});$('#week-label').textContent=count===1?fmt.format(weekStart):fmt.format(weekStart)+' — '+fmt.format(end);let days=Array.from({length:count},(_,i)=>{let d=new Date(weekStart);d.setDate(d.getDate()+i);return d});$('#weekly').style.setProperty('--day-count',count);let out='<div class="week-head"></div>'+days.map(d=>`<div class="week-head"><strong>${new Intl.DateTimeFormat('pt-PT',{weekday:mobileQuery.matches?'short':'long'}).format(d)}</strong><small>${new Intl.DateTimeFormat('pt-PT',{day:'numeric',month:'short'}).format(d)}</small>${holiday(d)?`<small class="holiday-name">✦ ${escapeHtml(holiday(d))}</small>`:''}</div>`).join('');shifts.forEach(shift=>{out+=`<div class="week-time">${shift}</div>`;days.forEach(d=>{const items=state.bookings.filter(b=>b.day===key(d)&&b.shift===shift&&b.status!=='cancelada');out+='<div>'+items.map(b=>`<span class="week-item"><strong>${escapeHtml(b.name)}</strong><small>${escapeHtml(b.status)}</small><button class="btn week-client" data-week-client="${escapeHtml(b.id)}">${b.clientId?'Ficha':'Criar ficha'}</button></span>`).join('')+'</div>'})});$('#weekly').innerHTML=out}const originalRender=render;render=function(){originalRender();renderWeek()};$('#week-prev').onclick=()=>{weekStart.setDate(weekStart.getDate()-periodSize());renderWeek()};$('#week-next').onclick=()=>{weekStart.setDate(weekStart.getDate()+periodSize());renderWeek()};$('#week-today').onclick=()=>{weekStart=new Date();weekStart.setHours(0,0,0,0);if(!mobileQuery.matches)weekStart.setDate(weekStart.getDate()-(weekStart.getDay()+6)%7);renderWeek()};document.querySelectorAll('[data-days]').forEach(b=>b.onclick=()=>{mobileDays=Number(b.dataset.days);document.querySelectorAll('[data-days]').forEach(x=>{let active=x===b;x.classList.toggle('selected',active);x.setAttribute('aria-pressed',String(active))});renderWeek()});mobileQuery.addEventListener('change',()=>{if(!mobileQuery.matches)weekStart.setDate(weekStart.getDate()-(weekStart.getDay()+6)%7);renderWeek()});let postcodeController=null;let postcodeTimer=null;const postcodeInput=$('#client-postcode');postcodeInput.addEventListener('input',()=>{let digits=postcodeInput.value.replace(/\D/g,'').slice(0,7);postcodeInput.value=digits.length>4?digits.slice(0,4)+'-'+digits.slice(4):digits;postcodeInput.setCustomValidity('');clearTimeout(postcodeTimer);if(postcodeController)postcodeController.abort();$('#postcode-suggestions').replaceChildren();$('#postcode-status').textContent='';if(digits.length===7)postcodeTimer=setTimeout(()=>lookupPostcode(postcodeInput.value),300)});postcodeInput.addEventListener('blur',()=>{postcodeInput.setCustomValidity(postcodeInput.value&&!/^\d{4}-\d{3}$/.test(postcodeInput.value)?'Introduz os 7 dígitos do código postal.':'')});async function lookupPostcode(cp){postcodeController=new AbortController();let signal=postcodeController.signal;$('#postcode-status').textContent='A procurar moradas…';try{let response=await fetch('https://json.geoapi.pt/codigo_postal/'+encodeURIComponent(cp),{headers:{Accept:'application/json'},signal});if(!response.ok)throw Error();let data=await response.json();if(signal.aborted||postcodeInput.value!==cp)return;let locality=String(data.Localidade||data['Designação Postal']||data.Concelho||'').trim();let streets=[...(Array.isArray(data.partes)?data.partes.map(x=>x&&x['Artéria']):[]),...(Array.isArray(data.ruas)?data.ruas:[])].filter(x=>typeof x==='string'&&x.trim());streets=[...new Map(streets.map(x=>[x.trim().toLocaleLowerCase('pt-PT'),x.trim()])).values()];let container=$('#postcode-suggestions');container.replaceChildren();if(!streets.length){$('#postcode-status').textContent='Não encontrámos ruas para este código postal. Podes escrever a morada manualmente.';if(locality&&!$('#client-city').value)$('#client-city').value=locality;return}streets.forEach(street=>{let button=document.createElement('button');button.type='button';button.className='postcode-option';button.textContent=street+(locality?' — '+locality:'');button.onclick=()=>{$('#client-address').value=street;$('#client-city').value=locality;container.replaceChildren();$('#postcode-status').textContent='Morada selecionada. Acrescenta o número da porta e o andar.';$('#client-address').focus();$('#client-address').setSelectionRange(street.length,street.length)};container.append(button)});$('#postcode-status').textContent=streets.length===1?'Escolhe a morada encontrada.':'Escolhe uma das '+streets.length+' moradas encontradas.'}catch(e){if(e.name==='AbortError')return;$('#postcode-status').textContent='Não foi possível obter sugestões. Podes escrever a morada e a localidade manualmente.'}}state.clients=Array.isArray(state.clients)?state.clients:[];let editingClient=null,linkBooking=null;function openClient(client,booking){clearTimeout(postcodeTimer);if(postcodeController)postcodeController.abort();$('#postcode-status').textContent='';$('#postcode-suggestions').replaceChildren();editingClient=client?client.id:null;linkBooking=booking?booking.id:null;$('#client-title').textContent=client?'Editar ficha de cliente':'Nova ficha de cliente';$('#client-name').value=client?.name||booking?.name||'';$('#client-phone').value=client?.phone||'';$('#client-email').value=client?.email||'';$('#client-address').value=client?.address||'';$('#client-postcode').value=client?.postcode||'';$('#client-city').value=client?.city||'';$('#client-type').value=client?.type||'';$('#client-service').value=client?.service||'';$('#client-service-details').value=client?.serviceDetails||'';$('#client-notes').value=client?.notes||'';$('#client-modal').showModal()}$('#new-client').onclick=()=>openClient(null,null);$('#client-cancel').onclick=()=>$('#client-modal').close();$('#client-form').onsubmit=async e=>{e.preventDefault();let c={id:editingClient||crypto.randomUUID(),name:$('#client-name').value.trim(),phone:$('#client-phone').value.trim(),email:$('#client-email').value.trim(),address:$('#client-address').value.trim(),postcode:$('#client-postcode').value.trim(),city:$('#client-city').value.trim(),type:$('#client-type').value,service:$('#client-service').value,serviceDetails:$('#client-service-details').value.trim(),notes:$('#client-notes').value.trim()};if(!c.name)return;const ok=await perform(()=>store.saveClient(c,linkBooking),'Ficha de cliente guardada.');if(ok)$('#client-modal').close()};function renderClients(){let box=$('#client-list');box.innerHTML=state.clients.length?state.clients.map(c=>{let address=[c.address,c.postcode,c.city].filter(Boolean).join(', ');let url=address?'https://www.waze.com/ul?q='+encodeURIComponent(address)+'&navigate=yes':'';let booked=state.bookings.filter(b=>b.clientId===c.id).map(b=>`${escapeHtml(b.day.split('-').reverse().join('/'))} · ${escapeHtml(b.shift)} · ${escapeHtml(b.status)}`).join('<br>');return `<div class="client-card"><div><strong>${escapeHtml(c.name)}</strong><div class="muted">${c.phone?'Telefone: '+escapeHtml(c.phone)+'<br>':''}${c.email?'Email: '+escapeHtml(c.email)+'<br>':''}${address?'Morada: '+escapeHtml(address)+'<br>':''}${c.type?'Tipo de cliente: '+escapeHtml(c.type)+'<br>':''}${c.service?'Limpeza solicitada: '+escapeHtml(c.service)+'<br>':''}${c.serviceDetails?'Detalhes da limpeza: '+escapeHtml(c.serviceDetails)+'<br>':''}${c.notes?'Observações: '+escapeHtml(c.notes)+'<br>':''}${booked?'Marcações:<br>'+booked:'Sem marcações associadas'}</div></div><div class="row"><button class="btn" data-edit-client="${escapeHtml(c.id)}">Editar</button>${url?`<a class="btn waze-link" href="${url}" target="_blank" rel="noopener noreferrer">Abrir no Waze ↗</a>`:''}</div></div>`}).join(''):'<div class="empty">Ainda não há fichas de cliente. Podes criar uma ficha a partir de uma marcação.</div>';document.querySelectorAll('[data-edit-client]').forEach(x=>x.onclick=()=>openClient(state.clients.find(c=>c.id===x.dataset.editClient),null));document.querySelectorAll('[data-client-booking]').forEach(x=>x.onclick=()=>{let b=state.bookings.find(b=>b.id===x.dataset.clientBooking);let c=b.clientId?state.clients.find(c=>c.id===b.clientId):null;openClient(c,b)})}$('#weekly').addEventListener('click',e=>{let button=e.target.closest('[data-week-client]');if(!button)return;let b=state.bookings.find(x=>x.id===button.dataset.weekClient);if(!b)return;openClient(b.clientId?state.clients.find(c=>c.id===b.clientId):null,b)});const previousRender=render;render=function(){previousRender();renderClients()};function adjustMobileDialogs(){if(!matchMedia('(max-width: 850px)').matches)return;let v=window.visualViewport;document.querySelectorAll('dialog').forEach(dialog=>{dialog.style.setProperty('--visible-height',(v?v.height:window.innerHeight)+'px');dialog.style.setProperty('--visible-top',(v?v.offsetTop:0)+'px')})}function revealDialogField(){const field=document.activeElement;if(!field||!field.closest('dialog[open]'))return;setTimeout(()=>{if(document.activeElement===field)field.scrollIntoView({block:'nearest',inline:'nearest',behavior:'smooth'})},180)}if(window.visualViewport){window.visualViewport.addEventListener('resize',()=>{adjustMobileDialogs();revealDialogField()});window.visualViewport.addEventListener('scroll',adjustMobileDialogs)}window.addEventListener('resize',adjustMobileDialogs);document.querySelectorAll('dialog').forEach(dialog=>dialog.addEventListener('focusin',e=>{if(e.target.matches('input,select,textarea')){adjustMobileDialogs();revealDialogField()}}));adjustMobileDialogs();$('#date').textContent=new Intl.DateTimeFormat('pt-PT',{weekday:'long',day:'numeric',month:'long',year:'numeric'}).format(new Date());render();

function stopData() {
  stops.forEach(stop => stop()); stops = [];
  adminReady = false;
  state = { days: {}, bookings: [], clients: [] }; dayLocks = {};
  document.body.classList.add('auth-locked');
  document.querySelectorAll('dialog[open]').forEach(d => d.close());
  render();
}
function authMessage(text) { $('#auth-status').textContent = text; }
function loadAdminData(user, token) {
  let loaded = new Set();
  function ready(name) {
    loaded.add(name);
    if (loaded.size === 3 && token === generation) {
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
$('#login-reset').onclick = async () => {
  const email = $('#login-email').value.trim();
  if (!email || !$('#login-email').checkValidity()) { authMessage('Preenche o teu email para pedir a recuperação.'); $('#login-email').focus(); return; }
  $('#login-reset').disabled = true;
  try {
    await sendPasswordResetEmail(auth, email);
    authMessage('Se existir uma conta elegível para este email, receberás uma mensagem com as instruções. Verifica também o spam.');
  } catch (error) { authMessage(describeError(error)); }
  finally { $('#login-reset').disabled = false; }
};
async function logout() {
  stopData();
  try { await signOut(auth); } catch (error) { authMessage(describeError(error)); }
}
$('#logout').onclick = logout;
$('#auth-logout').onclick = logout;
$('#account-reset').onclick = async () => {
  if (!auth.currentUser?.email) return;
  await perform(() => sendPasswordResetEmail(auth, auth.currentUser.email), 'Pedido de recuperação enviado. Verifica o email e o spam.');
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
