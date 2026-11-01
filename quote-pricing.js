export const monthlyQuote=q=>['Semanal','Mensal'].includes(q.frequency);
export const quoteTotalLabel=q=>monthlyQuote(q)?'Valor mensal':'Total';
export const quotePaymentNote=q=>monthlyQuote(q)?'Pagamento mensal. O valor apresentado corresponde ao mês completo, com a frequência de limpeza indicada.':'';
export const quoteAddressLabel=q=>q.customerType==='Particular'?'Morada':'Morada do trabalho';
