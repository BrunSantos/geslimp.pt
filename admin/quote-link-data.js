export const publicKeys=['name','title','date','valid','frequency','type','discount','vat','taxnote','scope','terms','materials','lines','number','revision'];
export function publicQuote(q){return Object.fromEntries(publicKeys.map(k=>[k,q[k]]));}
export function randomToken(){return [...crypto.getRandomValues(new Uint8Array(32))].map(n=>n.toString(16).padStart(2,'0')).join('');}
export const linkState={awaiting_client:'Aguarda resposta do cliente',awaiting_geslimp:'Aguarda resposta da GesLimp',accepted:'Confirmado pela GesLimp',refused:'Recusado pela GesLimp',revoked:'Link desativado'};
export function canAnswer(s,quoteId,now=Date.now()){return s.status==='awaiting_client'&&s.quoteId===quoteId&&s.expiresAt.toMillis()>now;}
