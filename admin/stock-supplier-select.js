// A saved/custom ID must survive even when its supplier snapshot arrives later.
export function fillSupplierSelect(select,shops,value=select.value){
 const selected=String(value||''),options=[{id:'',name:'Selecionar loja'},...shops.map(s=>({id:s.id,name:s.name}))];
 if(selected&&!options.some(s=>s.id===selected))options.push({id:selected,name:'Fornecedor guardado · '+selected});
 const signature=JSON.stringify(options);
 if(select.dataset.supplierOptionsKey!==signature){const doc=select.ownerDocument;select.replaceChildren(...options.map(s=>{const option=doc.createElement('option');option.value=s.id;option.textContent=s.name;return option;}));select.dataset.supplierOptionsKey=signature;}
 if(select.value!==selected)select.value=selected;
}
