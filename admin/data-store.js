import {liveSlots,shiftExpired} from '../shift-time.js?v=56';
import {mergeOpenings} from './agenda-data.js?v=49';
import {serviceFromBooking} from './booking-service.js';
import {validDate,todayPortugal} from './client-dates.js';
// Operações atómicas: nunca substituímos toda a base de dados com uma cópia do navegador.
export function createDataStore(api, db) {
  const { doc, collection, runTransaction, serverTimestamp, getDocsFromServer, query, where } = api;
  const shifts = ['Manhã', 'Tarde', 'Noite'];
  return {
    async deleteClient(id) {
      const groups=await Promise.all(['services','bookings'].map(name=>getDocsFromServer(query(collection(db,name),where('clientId','==',id)))));
      const linked=groups.flatMap((snapshot,i)=>snapshot.docs.map(d=>({ref:doc(db,i===0?'services':'bookings',d.id),kind:i===0?'service':'booking'})));
      if(linked.length>15)throw Error('Esta ficha tem muitos registos associados. Apaga primeiro alguns dos registos cancelados individualmente.');
      await runTransaction(db,async tx=>{
        const ref=doc(db,'clients',id),client=await tx.get(ref);
        if(!client.exists())throw Error('Ficha não encontrada.');
        const snapshots=[];
        for(const item of linked)snapshots.push(await tx.get(item.ref));
        for(let i=0;i<linked.length;i++){
          const snap=snapshots[i];if(!snap.exists())continue;
          const value=snap.data(),expected=linked[i].kind==='service'?'cancelado':'cancelada';
          if(value.clientId!==id||value.status!==expected)throw Error('Existem serviços ou marcações por cancelar. Atualiza os dados e tenta novamente.');
        }
        for(const item of linked)tx.delete(item.ref);
        tx.delete(ref);
      });
    },
    async deleteCancelledBooking(id) {
      await runTransaction(db,async tx=>{const ref=doc(db,'bookings',id);const snap=await tx.get(ref);if(!snap.exists()||snap.data().status!=='cancelada')throw Error('Só podes apagar marcações canceladas.');const day=await tx.get(doc(db,'availability',snap.data().day));if(day.data()?.bookingId===id)throw Error('O dia ainda está ocupado por esta marcação.');tx.delete(ref);});
    },
    async deleteCancelledService(id) {
      await runTransaction(db,async tx=>{const ref=doc(db,'services',id);const snap=await tx.get(ref);if(!snap.exists()||snap.data().status!=='cancelado')throw Error('Só podes apagar serviços cancelados.');tx.delete(ref);});
    },
    async setDay(day, slots) {
      if (day < todayPortugal()) throw Error('Não é possível alterar a disponibilidade de dias passados.');
      if (!/^\d{4}-\d{2}-\d{2}$/.test(day) || slots.length !== 3 || slots.some(s => typeof s !== 'boolean')) throw Error('Disponibilidade inválida.');
      slots=liveSlots(day,slots);
      await runTransaction(db, async tx => {
        const ref = doc(db, 'availability', day);
        const snapshot = await tx.get(ref);
        const historyRef=doc(db,'availabilityHistory',day),history=await tx.get(historyRef);
        const everOpened=mergeOpenings(history.data()?.slots,snapshot.data()?.slots,slots);
        tx.set(historyRef,{slots:everOpened,createdAt:history.data()?.createdAt||serverTimestamp(),updatedAt:serverTimestamp()});
        tx.set(ref, { slots, bookingId: snapshot.exists() ? (snapshot.data().bookingId || '') : '', updatedAt: serverTimestamp() });
      });
    },
    async createBooking(input) {
      if (!validDate(input.day) || input.day < todayPortugal()) throw Error('Não é possível criar marcações em datas passadas.');
      const indices=input.shift==='Dia inteiro'?[0,1,2]:[shifts.indexOf(input.shift)];if(indices.some(i=>i<0||shiftExpired(input.day,i)))throw Error('O horário deste turno já passou. Escolhe outro turno ou outra data.');
      const ref = doc(collection(db, 'bookings'));
      const dayRef = doc(db, 'availability', input.day);
      await runTransaction(db, async tx => {
        const day = await tx.get(dayRef);
        const data = day.exists() ? day.data() : {};
        if (data.bookingId) throw Error('Este dia já tem uma marcação. Atualiza o calendário.');
        if (input.shift==='Dia inteiro'?!data.slots?.every(Boolean):!data.slots?.[shifts.indexOf(input.shift)]) throw Error('Este turno está fechado. Abre-o no calendário.');
        tx.set(ref, { ...input, source:'admin', status: 'pendente', createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
        tx.update(dayRef, { bookingId: ref.id, updatedAt: serverTimestamp() });
      });
      return ref.id;
    },
    async changeStatus(id, status) {
      if (!['confirmada', 'cancelada','concluida'].includes(status)) throw Error('Estado inválido.');
      const ref = doc(db, 'bookings', id);
      await runTransaction(db, async tx => {
        const booking = await tx.get(ref);
        if (!booking.exists()) throw Error('Marcação não encontrada.');
        const data = booking.data();
        const dayRef = doc(db, 'availability', data.day);
        const day = await tx.get(dayRef);
        if(status==='concluida'&&(data.status!=='confirmada'||data.day>todayPortugal()))throw Error('Só podes concluir uma marcação confirmada de hoje ou de um dia anterior.');
        if(data.status==='concluida')throw Error('A marcação já foi concluída.');
        if (data.status === 'cancelada') throw Error('Esta marcação já foi cancelada.');
        if (day.data()?.bookingId !== id) throw Error('O calendário foi alterado. Atualiza a página antes de continuar.');
        tx.update(ref, { status, updatedAt: serverTimestamp() });
        if (status === 'cancelada') tx.update(dayRef, { bookingId: '', updatedAt: serverTimestamp() });
      });
    },
    async saveService(service) {
      const {id, ...fields} = service;
      if(!validDate(fields.startDate)|| (fields.endDate && (!validDate(fields.endDate)||fields.endDate<fields.startDate))) throw Error('Indica datas válidas para o serviço.');
      fields.status=fields.status||'ativo';fields.endDate=fields.frequency==='Pontual'?fields.startDate:(fields.endDate||'');
      const ref = id ? doc(db,'services',id) : doc(collection(db,'services'));
      await runTransaction(db, async tx => {
        const client = await tx.get(doc(db,'clients',fields.clientId));
        const existing = await tx.get(ref);
        if (!client.exists()) throw Error('Cliente não encontrado.');
        const c = client.data();
        if (!c.phone?.trim() || !c.address?.trim() || !c.postcode?.trim() || !c.city?.trim()) throw Error('Completa primeiro o contacto e a morada na ficha do cliente.');
        if (existing.exists() && existing.data().clientId !== fields.clientId) throw Error('Este serviço pertence a outro cliente.');
        tx.set(ref,{...(existing.data()?.employeeId!==undefined?{employeeId:existing.data().employeeId}:{}),...fields,createdAt:existing.exists() ? existing.data().createdAt : serverTimestamp(),updatedAt:serverTimestamp()});
      });
      return ref.id;
    },
    async saveClient(client, bookingId) {
      if (!client.phone?.trim() || !client.address?.trim() || !/^\d{4}-\d{3}$/.test(client.postcode || '') || !client.city?.trim()) throw Error('Preenche o telefone, a morada, o código postal e a localidade.');
      if (!validDate(client.clientSince) || client.clientSince > todayPortugal()) throw Error('Indica uma data de início válida para o cliente.');
      const { id, ...fields } = client;
      const ref = doc(db, 'clients', id);
      await runTransaction(db, async tx => {
        const current = await tx.get(ref);
        let bookingRef, importedService, serviceRef, existingService;
        if (bookingId) {
          bookingRef = doc(db, 'bookings', bookingId);
          const booking = await tx.get(bookingRef);
          if (!booking.exists()) throw Error('A marcação deixou de existir.');
          if(booking.data().clientId && booking.data().clientId!==id)throw Error('Esta marcação já está associada a outra ficha. Atualiza os dados.');
          importedService=serviceFromBooking(booking.data(),id);
          if(importedService){serviceRef=doc(db,'services','site-'+bookingId);existingService=await tx.get(serviceRef);}

        }
        tx.set(ref, { ...fields, createdAt: current.exists() ? (current.data().createdAt || serverTimestamp()) : serverTimestamp(), updatedAt: serverTimestamp() }, { merge: true });
        if (bookingRef) tx.update(bookingRef, { clientId: id, updatedAt: serverTimestamp() });
        if(importedService && !existingService.exists())tx.set(serviceRef,{...importedService,createdAt:serverTimestamp(),updatedAt:serverTimestamp()});
      });
    }
  };
}
