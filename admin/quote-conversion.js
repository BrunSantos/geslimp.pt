// Validar e associar o orçamento dentro da mesma transação que reserva a agenda.
export async function quoteConversion(api,db,tx,conversion,serviceId,fields,existing){
 if(!conversion)return ()=>{};
 const ref=api.doc(db,'quotes',conversion.id),snap=await tx.get(ref),q=snap.data();
 if(!q||q.status!=='aceite')throw Error('O orçamento já não está aceite. Atualiza os dados antes de criar o serviço.');
 if(q.serviceId||existing?.exists())throw Error('Já existe um serviço para este orçamento. Atualiza os dados para o consultar.');
 if(serviceId!=='quote-'+conversion.id||fields.clientId!==q.clientId||fields.frequency!==q.frequency||fields.status!=='ativo')throw Error('Mantém o cliente, a frequência do orçamento e o estado Ativo.');
 if(q.linkId){const link=await tx.get(api.doc(db,'quoteLinks',q.linkId));if(link.data()?.status!=='accepted'||link.data()?.quoteId!==conversion.id)throw Error('Falta a confirmação final da GesLimp para este orçamento.');}
 const base=Math.round(q.lines.reduce((n,l)=>n+l.qty*l.price,0)*100)/100,net=Math.round(base*(1-q.discount/100)*100)/100,tax=Math.round(net*q.vat)/100,amountCents=Math.round((net+tax)*100),month=fields.startDate.slice(0,7);
 if(amountCents>100000000)throw Error('O valor excede o limite permitido para o registo de recebimentos.');
 return ()=>{tx.update(ref,{serviceId,updatedAt:api.serverTimestamp()});if(amountCents>0)tx.set(api.doc(db,'serviceRates',serviceId+'-'+month),{serviceId,month,mode:fields.frequency==='Pontual'?'once':'monthly',amountCents,updatedAt:api.serverTimestamp()});};
}
