import {recurrenceShifts,weekdayOf,occurs} from './recurrence.js?v=68';
export const shiftIndices=shift=>shift==='Dia inteiro'?[0,1,2]:[recurrenceShifts.indexOf(shift)].filter(i=>i>=0);
export const crewOf=(record,client)=>Array.isArray(record.employeeIds)?record.employeeIds:(record.employeeId?[record.employeeId]:client?.employeeId?[client.employeeId]:[]);
export const needed=record=>Math.max(1,record.workersNeeded||crewOf(record).length||1);
export function groupEntries(group){return group?.entries|| (group?.serviceId?[{serviceId:group.serviceId,startDate:group.startDate,endDate:group.endDate||'',seats:1}]:[]);}
export function weeklyUsed(groups,day,index,exclude=''){const group=groups.find(g=>g.key===weekdayOf(day)+'-'+index);return groupEntries(group).filter(r=>r.serviceId!==exclude&&day>=r.startDate&&(!r.endDate||day<=r.endDate)).reduce((n,r)=>n+r.seats,0);}
export function freeSeats(data,groups,day,index){if(!data?.capacity)return !data?.bookingId&&data?.slots?.[index]&&!weeklyUsed(groups,day,index)?1:0;return Math.max(0,data.capacity[index]-(data.reservations?.[index]?.length||0)-weeklyUsed(groups,day,index));}
export const slotMap=arrays=>Object.fromEntries([0,1,2].map(i=>[String(i),arrays[i]||[]]));
export const slotArrays=map=>[0,1,2].map(i=>map?.[i]||[]);
export function reservationsFrom(bookings,day){const slots=[[],[],[]];for(const b of bookings.filter(b=>b.day===day&&b.status!=='cancelada'))for(const i of shiftIndices(b.shift))slots[i].push(...Array(needed(b)).fill(b.id));return slotMap(slots);}
export const overlaps=(a,b)=>a.startDate<=(b.endDate||'9999-12-31')&&b.startDate<=(a.endDate||'9999-12-31');
