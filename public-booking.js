import {slotReserved,weekdayOf} from './recurrence.js?v=59';
import {shiftExpired} from './shift-time.js?v=56';
export async function createPublicBooking(api,db,uid,input){
 const {doc,collection,runTransaction,serverTimestamp}=api;
 const booking=doc(collection(db,'bookings')),day=doc(db,'availability',input.day);
 await runTransaction(db,async tx=>{
  const index=['Manhã','Tarde','Noite'].indexOf(input.shift);if(index<0)throw Error('Escolha um turno válido.');const lock=await tx.get(doc(db,'recurringSlots',weekdayOf(input.day)+'-'+index));if(lock.exists()&&slotReserved([lock.data()],input.day,index))throw Error('Este turno está reservado por um serviço semanal. Escolha outro.');
  const snapshot=await tx.get(day);const data=snapshot.exists()?snapshot.data():{};
  if(data.bookingId)throw Error('Este dia acabou de ficar ocupado. Escolha outra data.');
  if(index<0||shiftExpired(input.day,index)||!data.slots?.[index])throw Error('O período selecionado já não está disponível. Escolha outro.');
  tx.set(booking,{...input,status:'pendente',source:'site',ownerUid:uid,createdAt:serverTimestamp(),updatedAt:serverTimestamp()});
  tx.update(day,{bookingId:booking.id,updatedAt:serverTimestamp()});
 });
 return booking.id;
}
