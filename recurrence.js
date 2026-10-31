export const weekNames=['Segunda-feira','Terça-feira','Quarta-feira','Quinta-feira','Sexta-feira','Sábado','Domingo'];
export const recurrenceShifts=['Manhã','Tarde','Noite'];
export const weekdayOf=day=>(new Date(day+'T12:00:00Z').getUTCDay()+6)%7+1;
export const recurring=s=>s.frequency==='Semanal'&&Number.isInteger(s.weekday)&&s.weekday>=1&&s.weekday<=7&&recurrenceShifts.includes(s.shift);
export const slotKey=s=>s.weekday+'-'+recurrenceShifts.indexOf(s.shift);
export function occurs(s,day){return recurring(s)&&s.status!=='cancelado'&&day>=s.startDate&&(!s.endDate||day<=s.endDate)&&weekdayOf(day)===s.weekday;}
export function slotReserved(locks,day,index){return locks.some(s=>occurs({...s,frequency:'Semanal',status:'ativo'},day)&&recurrenceShifts.indexOf(s.shift)===index);}
export function recurringVisits(services,clients,from,to){const out=[];for(const s of services){if(!recurring(s)||s.status==='cancelado')continue;const start=[s.startDate,from].sort().at(-1),end=s.endDate&&s.endDate<to?s.endDate:to;if(!start||!end||start>end)continue;for(let date=new Date(start+'T12:00:00Z');date.toISOString().slice(0,10)<=end;date.setUTCDate(date.getUTCDate()+1)){const day=date.toISOString().slice(0,10);if(occurs(s,day))out.push({id:'recurring-'+s.id+'-'+day,serviceId:s.id,clientId:s.clientId,name:clients.find(c=>c.id===s.clientId)?.name||'Cliente',day,shift:s.shift,status:'confirmada',source:'admin',createdAt:s.createdAt,recurring:true});}}return out;}
