// Hora local de Portugal continental; um turno deixa de aceitar marcações ao começar.
export const shiftStartHours=[9,14,19];
export function portugalClock(now=new Date()){
 const parts=Object.fromEntries(new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Lisbon',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',hourCycle:'h23'}).formatToParts(now).map(p=>[p.type,p.value]));
 return {day:parts.year+'-'+parts.month+'-'+parts.day,hour:Number(parts.hour)};
}
export function shiftExpired(day,index,now=new Date()){const clock=portugalClock(now);return day<clock.day||(day===clock.day&&clock.hour>=shiftStartHours[index]);}
export function liveSlots(day,slots,now=new Date()){return [0,1,2].map(i=>slots?.[i]===true&&!shiftExpired(day,i,now));}
