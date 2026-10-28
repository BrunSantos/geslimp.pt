import {validDate,todayPortugal} from './client-dates.js';
// Operações atómicas: nunca substituímos toda a base de dados com uma cópia do navegador.
export function createDataStore(api, db) {
  const { doc, collection, runTransaction, serverTimestamp } = api;
  const shifts = ['Manhã', 'Tarde', 'Noite'];
  return {
    async deleteClient(id) {
      // Admin-only deletion. Associated records are retained and checked by the UI.
      await runTransaction(db,async tx=>{const ref=doc(db,'clients',id);const snap=await tx.get(ref);if(!snap.exists())throw Error('Ficha não encontrada.');tx.delete(ref);});
    },
    async deleteCancelledBooking(id) {
      await runTransaction(db,async tx=>{const ref=doc(db,'bookings',id);const snap=await tx.get(ref);if(!snap.exists()||snap.data().status!=='cancelada'||snap.data().day>=todayPortugal())throw Error('Só podes apagar marcações canceladas de dias passados.');const day=await tx.get(doc(db,'availability',snap.data().day));if(day.data()?.bookingId===id)throw Error('O dia ainda está ocupado por esta marcação.');tx.delete(ref);});
    },
    async deleteCancelledService(id) {
      await runTransaction(db,async tx=>{const ref=doc(db,'services',id);const snap=await tx.get(ref);const s=snap.data();if(!snap.exists()||s.status!=='cancelado'||(s.endDate||s.startDate)>=todayPortugal())throw Error('Só podes apagar serviços cancelados de dias passados.');tx.delete(ref);});
    },
    async setDay(day, slots) {
      if (day < todayPortugal()) throw Error('Não é possível alterar a disponibilidade de dias passados.');
      if (!/^\d{4}-\d{2}-\d{2}$/.test(day) || slots.length !== 3 || slots.some(s => typeof s !== 'boolean')) throw Error('Disponibilidade inválida.');
      await runTransaction(db, async tx => {
        const ref = doc(db, 'availability', day);
        const snapshot = await tx.get(ref);
        tx.set(ref, { slots, bookingId: snapshot.exists() ? (snapshot.data().bookingId || '') : '', updatedAt: serverTimestamp() });
      });
    },
    async createBooking(input) {
      if (!validDate(input.day) || input.day < todayPortugal()) throw Error('Não é possível criar marcações em datas passadas.');
      const ref = doc(collection(db, 'bookings'));
      const dayRef = doc(db, 'availability', input.day);
      await runTransaction(db, async tx => {
        const day = await tx.get(dayRef);
        const data = day.exists() ? day.data() : {};
        if (data.bookingId) throw Error('Este dia já tem uma marcação. Atualiza o calendário.');
        if (!data.slots?.[shifts.indexOf(input.shift)]) throw Error('Este turno está fechado. Abre-o no calendário.');
        tx.set(ref, { ...input, status: 'pendente', createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
        tx.update(dayRef, { bookingId: ref.id, updatedAt: serverTimestamp() });
      });
      return ref.id;
    },
    async changeStatus(id, status) {
      if (!['confirmada', 'cancelada'].includes(status)) throw Error('Estado inválido.');
      const ref = doc(db, 'bookings', id);
      await runTransaction(db, async tx => {
        const booking = await tx.get(ref);
        if (!booking.exists()) throw Error('Marcação não encontrada.');
        const data = booking.data();
        const dayRef = doc(db, 'availability', data.day);
        const day = await tx.get(dayRef);
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
        tx.set(ref,{...fields,createdAt:existing.exists() ? existing.data().createdAt : serverTimestamp(),updatedAt:serverTimestamp()});
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
        let bookingRef;
        if (bookingId) {
          bookingRef = doc(db, 'bookings', bookingId);
          const booking = await tx.get(bookingRef);
          if (!booking.exists()) throw Error('A marcação deixou de existir.');
        }
        tx.set(ref, { ...fields, createdAt: current.exists() ? (current.data().createdAt || serverTimestamp()) : serverTimestamp(), updatedAt: serverTimestamp() }, { merge: true });
        if (bookingRef) tx.update(bookingRef, { clientId: id, updatedAt: serverTimestamp() });
      });
    }
  };
}
