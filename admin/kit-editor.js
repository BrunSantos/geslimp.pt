import {validKitRows} from './employee-kit-store.js?v=138';
import {milli,quantity} from './stock-data.js?v=111';
export const kitEscape=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const copyKitRows=rows=>rows.map(r=>({id:r.id,label:r.label,itemId:r.itemId||'',qtyMilli:r.qtyMilli}));
export const kitTemplateInfo=t=>({templateId:t?.id||'',templateName:t?.name||(t?.id==='default'?'Kit anterior':''),serviceType:t?.serviceType||''});
export function kitRowsHtml(rows,items,{locked=false,delivered=[]}={}){
 const esc=kitEscape;
 return rows.map(row=>{
  const item=items.find(i=>i.id===row.itemId),missing=row.itemId&&!item;
  const options=items.filter(i=>!i.deleted&&(!i.archived||i.id===row.itemId));
  if(item?.deleted)options.push(item);
  return `<div class="kit-row" data-kit-row="${esc(row.id)}"><label>Artigo<input data-kit-label maxlength="100" required value="${esc(row.label)}" ${locked?'disabled':''}></label><label>Artigo no stock<select data-kit-item ${locked?'disabled':''}><option value="">Selecionar artigo</option>${missing?`<option value="${esc(row.itemId)}" selected>${esc(row.label)} · indisponível</option>`:''}${options.map(i=>`<option value="${esc(i.id)}" ${i.id===row.itemId?'selected':''}>${esc(i.name)} · ${esc(i.unit)}${i.deleted?' · apagado':i.archived?' · inativo':' · '+quantity(i.qtyMilli)+' disponíveis'}${i.kind==='equipment'?' · empréstimo':''}</option>`).join('')}</select></label><label>Quantidade<input data-kit-qty type="number" min="${item?.kind==='equipment'?'1':'0.001'}" max="10000" step="${item?.kind==='equipment'?'1':'0.001'}" required value="${row.qtyMilli/1000}" ${locked?'disabled':''}></label><button type="button" class="btn kit-remove" ${locked?'disabled':''} aria-label="Remover artigo">×</button><span class="kit-line-status">${delivered.includes(row.id)?'Entregue':item?.unit?esc(item.unit)+(item.kind==='equipment'?' · fica registado como empréstimo':''):row.itemId?'Artigo indisponível':'Associa um artigo do stock'}</span></div>`;
 }).join('')||'<p class="muted">Sem artigos. Usa «Adicionar artigo» para preparar o kit.</p>';
}
export function readKitEditor(box,items,{requireActive=false}={}){
 const rows=validKitRows([...box.querySelectorAll('[data-kit-row]')].map(el=>({id:el.dataset.kitRow,label:el.querySelector('[data-kit-label]').value.trim(),itemId:el.querySelector('[data-kit-item]').value,qtyMilli:milli(el.querySelector('[data-kit-qty]').value)})));
 for(const row of rows){const item=items.find(i=>i.id===row.itemId);if(requireActive&&(!item||item.archived||item.deleted))throw Error('Escolhe um artigo ativo para «'+row.label+'».');if(item?.kind==='equipment'&&row.qtyMilli%1000)throw Error('Os equipamentos são entregues em unidades inteiras.');}
 return rows;
}
export function bindKitEditor(box,{items,changed=()=>{},error=()=>{},busy=()=>false}){
 box.addEventListener('input',changed);
 box.addEventListener('change',e=>{
  if(e.target.matches('[data-kit-item]')){const item=items().find(i=>i.id===e.target.value),row=e.target.closest('[data-kit-row]');if(item&&row){row.querySelector('[data-kit-label]').value=item.name.slice(0,100);const q=row.querySelector('[data-kit-qty]');q.step=item.kind==='equipment'?'1':'0.001';q.min=q.step;row.querySelector('.kit-line-status').textContent=item.unit+(item.kind==='equipment'?' · fica registado como empréstimo':'');}}
  changed();
 });
 box.addEventListener('click',e=>{
  const add=e.target.closest('.kit-add'),remove=e.target.closest('.kit-remove');if((!add&&!remove)||busy()||add?.disabled||remove?.disabled)return;
  try{
   // Permite remover uma linha incompleta antes de validar o restante formulário.
   if(remove){remove.closest('[data-kit-row]').remove();changed();return;}
   if(box.querySelectorAll('[data-kit-row]').length>=30)throw Error('O kit pode ter até 30 artigos.');
   box.querySelector('.kit-rows').insertAdjacentHTML('beforeend',kitRowsHtml([{id:crypto.randomUUID(),label:'Novo artigo',itemId:'',qtyMilli:1000}],items()));changed();
  }catch(e){error(e.message);}
 });
}
