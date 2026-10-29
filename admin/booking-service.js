// Preserve the customer's wording while mapping to the internal cleaning category.
export function serviceFromBooking(booking, clientId) {
  const categories={'Limpeza profunda':'Casa completa','Limpeza pós-obra':'Limpeza pós-obra','Condomínio':'Condomínio','Empresa':'Espaço comercial','Serviço personalizado':'Outra limpeza'};
  if(!booking.requestedService || !categories[booking.requestedService]) return null;
  return {clientId,title:booking.requestedService,serviceType:categories[booking.requestedService],frequency:'Pontual',startDate:booking.day,endDate:booking.day,status:booking.status==='cancelada'?'cancelado':'ativo',estimatedDuration:'',areas:'',notes:booking.notes||''};
}
