export const roles=[['CEO / Gerente',0],['Gestor de operações',1],['Supervisor',1],['Encarregado',1],['Responsável de qualidade',1],['Responsável de segurança',1],['Administrativo',2],['Comercial',2],['Atendimento ao cliente',2],['Responsável de armazém',2],['Manutenção',2],['Motorista',2],['Técnico de limpeza',3],['Auxiliar de limpeza',3],['Limpeza industrial',3],['Housekeeping',3],['Outra função',3]];
export const contracts=['Sem termo','A termo certo','A termo incerto','Prestação de serviços','Estágio','Gerência / administração','Não aplicável','Outro'];
export const levelOf=role=>roles.find(r=>r[0]===role)?.[1]??3;
export const initials=name=>String(name||'').trim().split(/\s+/).filter(Boolean).slice(0,2).map(s=>s[0]).join('').toLocaleUpperCase('pt-PT');
export const photoValid=value=>typeof value==='string'&&(value===''||(value.length<=180000&&/^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/.test(value)));
export function validDate(s){if(!/^\d{4}-\d{2}-\d{2}$/.test(s))return false;const d=new Date(s+'T12:00:00Z');return !Number.isNaN(d.getTime())&&d.toISOString().slice(0,10)===s}
export function validateEmployee(d,id,employees){
 if(!d.name||d.name.length>100)throw Error('Preenche o nome do colaborador.');
 if(!roles.some(r=>r[0]===d.role))throw Error('Escolhe o cargo.');
 if(!contracts.includes(d.contractType))throw Error('Escolhe o tipo de contrato.');
 if(!validDate(d.entryDate))throw Error('Indica uma data de entrada válida.');
 if(d.birthDate&&(!validDate(d.birthDate)||d.birthDate>d.entryDate))throw Error('Verifica a data de nascimento.');
 for(const k of ['contractEnd','exitDate'])if(d[k]&&(!validDate(d[k])||d[k]<d.entryDate))throw Error('A data de término ou saída não pode ser anterior à entrada.');
 if(d.status==='ativo'&&d.exitDate)throw Error('Retira a data de saída ou marca o colaborador como inativo.');
 if(d.taxId&&!/^\d{9}$/.test(d.taxId))throw Error('O NIF deve ter 9 algarismos.');
 if(d.postcode&&!/^\d{4}-\d{3}$/.test(d.postcode))throw Error('O código postal deve ter o formato 0000-000.');
 if(!d.phone||d.phone.replace(/\D/g,'').length<7||d.phone.replace(/\D/g,'').length>15)throw Error('Preenche um telemóvel válido.');
 if(!d.email||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.email))throw Error('Verifica o email.');
 if(d.managerId){const m=employees.find(e=>e.id===d.managerId);if(!m||m.id===id||levelOf(m.role)>=levelOf(d.role))throw Error('Escolhe um responsável de um nível hierárquico superior.');}
 if(!photoValid(d.photoData))throw Error('Seleciona novamente a fotografia.');
}
