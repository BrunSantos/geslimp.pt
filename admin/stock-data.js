export const supplierSeeds=[['continente','Continente'],['pingo-doce','Pingo Doce'],['auchan','Auchan'],['lidl','Lidl'],['mercadona','Mercadona'],['aldi','ALDI'],['intermarche','Intermarché'],['e-leclerc','E.Leclerc'],['minipreco','Minipreço'],['meu-super','Meu Super'],['amanhecer','Amanhecer'],['spar','SPAR'],['coviran','Covirán'],['froiz','Froiz'],['supercor','Supercor / El Corte Inglés'],['apolonia','Apolónia'],['solmar','Solmar'],['grupo-bensaude','Casa Cheia'],['super-sao-roque','Super São Roque']].map(([id,name])=>({id:'builtin-'+id,name}));
export const categories=['Detergentes','Desinfetantes','Panos e esponjas','Sacos e descartáveis','Equipamento de proteção','Utensílios','Máquinas','Outro'];
export const units=['unidade','embalagem','litro','kg'];
export const money=cents=>new Intl.NumberFormat('pt-PT',{style:'currency',currency:'EUR'}).format(cents/100);
export const quantity=milli=>new Intl.NumberFormat('pt-PT',{maximumFractionDigits:3}).format(milli/1000);
export function milli(value){const n=Number(value);if(!Number.isFinite(n)||n<0||Math.abs(n*1000-Math.round(n*1000))>.00001)throw Error('Indica uma quantidade válida, com até três casas decimais.');return Math.round(n*1000)}
export function cents(value){const n=Number(value);if(!Number.isFinite(n)||n<0||Math.abs(n*100-Math.round(n*100))>.00001)throw Error('Indica um preço válido, com até duas casas decimais.');return Math.round(n*100)}
export function movementValues(item,kind,qty,price=0){
 if(!Number.isSafeInteger(qty)||qty<=0||qty>10000000)throw Error('Indica uma quantidade superior a zero.');
 if(item.kind==='equipment'&&qty%1000)throw Error('As máquinas e equipamentos são movimentados em unidades inteiras.');
 const balance={qtyMilli:item.qtyMilli,onLoanMilli:item.onLoanMilli,inventoryValueCents:item.inventoryValueCents};let totalCents=0;
 if(kind==='purchase'){if(!Number.isSafeInteger(price)||price<0||price>10000000)throw Error('Preço inválido.');totalCents=Math.round(qty*price/1000);balance.qtyMilli+=qty;balance.inventoryValueCents+=totalCents}
 else if(kind==='issue'){if(item.kind!=='consumable')throw Error('Usa empréstimo para entregar equipamentos.');if(qty>balance.qtyMilli)throw Error('Stock insuficiente.');totalCents=qty===balance.qtyMilli?balance.inventoryValueCents:Math.round(balance.inventoryValueCents*qty/balance.qtyMilli);balance.qtyMilli-=qty;balance.inventoryValueCents-=totalCents}
 else if(kind==='loan'){if(item.kind!=='equipment')throw Error('Apenas os equipamentos podem ser emprestados.');if(qty>balance.qtyMilli)throw Error('Não existem unidades disponíveis suficientes.');balance.qtyMilli-=qty;balance.onLoanMilli+=qty}
 else if(kind==='return'){if(item.kind!=='equipment'||qty>balance.onLoanMilli)throw Error('Quantidade de devolução inválida.');balance.qtyMilli+=qty;balance.onLoanMilli-=qty}
 else throw Error('Movimento inválido.');
 if(balance.qtyMilli>10000000||balance.onLoanMilli>10000000||balance.inventoryValueCents>1000000000)throw Error('O valor ou a quantidade ultrapassa o limite deste artigo.');
 return {...balance,totalCents};
}
export function expenseReport(movements,{from='',to='',employeeId=''}={}){
 const filtered=movements.filter(m=>(!from||m.day>=from)&&(!to||m.day<=to));const purchases=filtered.filter(m=>m.kind==='purchase');const issues=filtered.filter(m=>m.kind==='issue'&&(!employeeId||m.employeeId===employeeId));const byEmployee={};for(const m of issues)byEmployee[m.employeeId]=(byEmployee[m.employeeId]||0)+m.totalCents;
 return {purchasedCents:purchases.reduce((n,m)=>n+m.totalCents,0),usedCents:issues.reduce((n,m)=>n+m.totalCents,0),byEmployee,issues};
}
export function clientProfitReport(movements,receipts,{from='',to=''}={}){
 const inside=row=>(!from||row.day>=from)&&(!to||row.day<=to);const rows={};let receivedCents=0,productCents=0,generalCents=0;
 for(const r of receipts.filter(r=>r.status==='received'&&inside(r))){receivedCents+=r.amountCents;const row=rows[r.clientId]||(rows[r.clientId]={receivedCents:0,productCents:0});row.receivedCents+=r.amountCents;}
 for(const m of movements.filter(m=>m.kind==='issue'&&inside(m))){productCents+=m.totalCents;if(m.clientId){const row=rows[m.clientId]||(rows[m.clientId]={receivedCents:0,productCents:0});row.productCents+=m.totalCents}else generalCents+=m.totalCents}
 return {rows,receivedCents,productCents,generalCents,marginCents:receivedCents-productCents};
}
