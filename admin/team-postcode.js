export function initTeamPostcode(){
 const $=s=>document.querySelector(s),input=$('#team-postcode'),status=$('#team-postcode-status'),list=$('#team-postcode-suggestions');let timer,controller,generation=0;
 function clear(){clearTimeout(timer);controller?.abort();generation++;list.replaceChildren();status.textContent='';input.setCustomValidity('');}
 async function lookup(cp){const token=generation;controller=new AbortController();status.textContent='A procurar moradas…';try{
 const response=await fetch('https://json.geoapi.pt/codigo_postal/'+encodeURIComponent(cp),{headers:{Accept:'application/json'},signal:controller.signal});if(!response.ok)throw Error();const data=await response.json();if(token!==generation||input.value!==cp)return;
 const locality=String(data.Localidade||data['Designação Postal']||data.Concelho||'').trim();const streets=[...new Set([...(Array.isArray(data.partes)?data.partes.map(p=>p?.['Artéria']):[]),...(Array.isArray(data.ruas)?data.ruas:[])].filter(s=>typeof s==='string'&&s.trim()).map(s=>s.trim()))];
 list.replaceChildren();if(!streets.length){status.textContent='Não encontrámos ruas. Podes preencher a morada manualmente.';if(!$('#team-city').value)$('#team-city').value=locality;return;}
 for(const street of streets){const b=document.createElement('button');b.type='button';b.className='btn postcode-option';b.textContent=street+(locality?' — '+locality:'');b.onclick=()=>{$('#team-address').value=street;$('#team-city').value=locality;list.replaceChildren();status.textContent='Morada selecionada. Acrescenta o número da porta e o andar.';$('#team-address').focus();};list.append(b);}status.textContent='Escolhe a morada encontrada.';
 }catch(error){if(token===generation&&error.name!=='AbortError')status.textContent='Não foi possível procurar a morada. Podes preenchê-la manualmente.';}}
 input.addEventListener('input',()=>{clear();const digits=input.value.replace(/\D/g,'').slice(0,7);input.value=digits.length>4?digits.slice(0,4)+'-'+digits.slice(4):digits;if(digits.length===7)timer=setTimeout(()=>lookup(input.value),300);});
 input.addEventListener('blur',()=>input.setCustomValidity(input.value&&!/^\d{4}-\d{3}$/.test(input.value)?'Introduz os 7 dígitos do código postal.':''));return {clear};
}
