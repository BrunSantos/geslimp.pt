// Operações atómicas: nunca substituímos toda a base de dados com uma cópia do navegador.
export function createDataStore(api, db) {
  const { doc, collection, runTransaction, serverTimestamp } = api;
  const shifts = ['Manhã', 'Tarde', 'Noite'];
  return {
    async setDay(day, slots) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(day) || slots.length !== 3 || slots.some(s => typeof s !== 'boolean')) throw Error('Disponibilidade inválida.');
      await runTransaction(db, async tx => {
        const ref = doc(db, 'availability', day);
        const snapshot = await tx.get(ref);
        tx.set(ref, { slots, bookingId: snapshot.exists() ? (snapshot.data().bookingId || '') : '', updatedAt: serverTimestamp() });
      });
    },
    async createBooking(input) {
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
    async saveClient(client, bookingId) {
      const { id, ...fields } = client;
      const ref = doc(db, 'clients', id);
      await runTransaction(db, async tx => {
        let bookingRef;
        if (bookingId) {
          bookingRef = doc(db, 'bookings', bookingId);
          const booking = await tx.get(bookingRef);
          if (!booking.exists()) throw Error('A marcação deixou de existir.');
        }
        tx.set(ref, { ...fields, updatedAt: serverTimestamp() }, { merge: true });
        if (bookingRef) tx.update(bookingRef, { clientId: id, updatedAt: serverTimestamp() });
      });
    }
  };
}
