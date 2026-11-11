export const agendaShifts=['Manhã','Tarde','Noite'];
export const weekdayNames=['Segunda-feira','Terça-feira','Quarta-feira','Quinta-feira','Sexta-feira','Sábado','Domingo'];
export const bookingSlots=b=>b.shift==='Dia inteiro'?[0,1,2]:[agendaShifts.indexOf(b.shift)].filter(i=>i>=0);
export const mergeOpenings=(...arrays)=>[0,1,2].map(i=>arrays.some(a=>a?.[i]===true));
export function upcomingOpenDays(days,bookings,locks,today){return Object.entries(days).filter(([day,slots])=>day>=today&&slots.some(Boolean)&&!locks[day]&&!bookings.some(b=>b.day===day&&b.status!=='cancelada')).sort(([a],[b])=>a.localeCompare(b)).map(([day,slots])=>({day,slots}));}
export function agendaReport({days={},history={},bookings=[],from='',to=''}){
 const dates=new Set([...Object.keys(days),...Object.keys(history),...bookings.map(b=>b.day)]);const rows=[];
 for(const day of [...dates].sort()){if(!/^\d{4}-\d{2}-\d{2}$/.test(day)||(from&&day<from)||(to&&day>to))continue;
  const all=bookings.filter(b=>b.day===day),proof=[false,false,false];for(const b of all)for(const i of bookingSlots(b))proof[i]=true;
  const opened=mergeOpenings(days[day],history[day]?.slots,proof),occupied=new Set(),requested=new Set(),realized=new Set(),pending=new Set();let site=0,manual=0,siteRequests=0,manualRequests=0;
  for(const b of all){if(b.status==='cancelada')continue;if(b.source==='site')siteRequests++;else manualRequests++;const slots=bookingSlots(b);for(const i of slots)requested.add(i);if(b.status==='pendente'){for(const i of slots)pending.add(i)}if(['confirmada','concluida'].includes(b.status)){for(const i of slots)occupied.add(i);if(b.source==='site')site++;else manual++}if(b.status==='concluida')for(const i of slots)realized.add(i);}
  if(!opened.some(Boolean)&&!requested.size)continue;
  const weekday=(new Date(day+'T12:00:00Z').getUTCDay()+6)%7;rows.push({day,weekday,opened,occupied:[...occupied].sort(),requested:[...requested].sort(),realized:[...realized].sort(),pending:[...pending].sort(),site,manual,siteRequests,manualRequests,requestedBookings:siteRequests+manualRequests,fullDay:occupied.size===3,hasHistory:!!history[day]});
 }
 const summarize=list=>{const opened=list.reduce((n,r)=>n+r.opened.filter(Boolean).length,0),occupied=list.reduce((n,r)=>n+r.occupied.length,0),requested=list.reduce((n,r)=>n+r.requested.length,0),realized=list.reduce((n,r)=>n+r.realized.length,0);return {opened,occupied,requested,realized,rate:opened?occupied/opened*100:0}};
 const weekday=weekdayNames.map((name,i)=>({name,...summarize(rows.filter(r=>r.weekday===i)),openedDays:rows.filter(r=>r.weekday===i).length,requestedBookings:rows.filter(r=>r.weekday===i).reduce((n,r)=>n+r.requestedBookings,0)}));
 const shift=agendaShifts.map((name,i)=>{const opened=rows.filter(r=>r.opened[i]).length,occupied=rows.filter(r=>r.occupied.includes(i)).length,requested=rows.filter(r=>r.requested.includes(i)).length,realized=rows.filter(r=>r.realized.includes(i)).length;return {name,opened,occupied,requested,realized,rate:opened?occupied/opened*100:0}});
 return {rows,weekday,shift,...summarize(rows),openedDays:rows.length,occupiedDays:rows.filter(r=>r.occupied.length).length,realizedDays:rows.filter(r=>r.realized.length).length,fullDays:rows.filter(r=>r.fullDay).length,site:rows.reduce((n,r)=>n+r.site,0),manual:rows.reduce((n,r)=>n+r.manual,0)};
}
