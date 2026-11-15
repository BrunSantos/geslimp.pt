import {legacyLinks} from './service-family-legacy.js?v=26.11.9';
const cache=new WeakMap();
// Business service identity is stable; dated records are occurrences, never extra client services.
export function familyIndex(state){
 const cached=cache.get(state);if(cached&&cached.services===state.services&&cached.history===state.rescheduleHistory&&cached.requests===state.rescheduleRequests)return cached.index;
 const services=state.services||[],byId=new Map(services.map(s=>[s.id,s])),edges=new Map(),ambiguous=new Set();
 for(const h of [...(state.rescheduleHistory||[]),...(state.rescheduleRequests||[]).filter(r=>r.status==='approved').map(r=>({ownerServiceId:r.serviceId,resultServiceId:r.resultServiceId,before:{day:r.day},createdAt:r.decidedAt}))]){const child=h.resultServiceId,parent=h.ownerServiceId;if(!child||!parent||child===parent||!byId.has(child)||!byId.has(parent)||byId.get(child).clientId!==byId.get(parent).clientId)continue;const old=edges.get(child);if(ambiguous.has(child))continue;if(old&&old.parent!==parent){edges.delete(child);ambiguous.add(child);continue;}if(!old||(h.createdAt?.seconds||0)<(old.stamp||0))edges.set(child,{parent,day:h.before?.day||'',stamp:h.createdAt?.seconds||0});}
 for(const s of services){if(s.continuationOf&&byId.has(s.continuationOf.serviceId))edges.set(s.id,{parent:s.continuationOf.serviceId,day:s.continuationOf.day});if(s.occurrenceOf&&byId.has(s.occurrenceOf.serviceId))edges.set(s.id,{parent:byId.has(s.occurrenceOf.previousRecordId)?s.occurrenceOf.previousRecordId:s.occurrenceOf.serviceId,root:s.occurrenceOf.serviceId,day:s.occurrenceOf.originalDay});}
 for(const link of legacyLinks(state))if(!edges.has(link.childId)&&!ambiguous.has(link.childId))edges.set(link.childId,{parent:link.parentId,day:link.day});
 const result=new Map();
 for(const s of services){let id=s.id,day=s.startDate||'',depth=0;const seen=new Set([id]);while(edges.has(id)){const e=edges.get(id);if(!byId.has(e.parent)||seen.has(e.parent)||byId.get(e.parent).clientId!==s.clientId)break;day=e.day||day;id=e.parent;seen.add(id);depth++;}result.set(s.id,{rootId:id,originalDay:day,depth,previousId:edges.get(s.id)?.parent||'',recordId:s.id});}
 const index={byId,meta:result};cache.set(state,{services:state.services,history:state.rescheduleHistory,requests:state.rescheduleRequests,index});return index;
}
export function familyMeta(id,state){return familyIndex(state).meta.get(id)||{rootId:id,originalDay:'',depth:0,recordId:id};}
export function isOccurrenceRecord(s,state){return familyMeta(s.id,state).rootId!==s.id;}
export function rootServices(state){return (state.services||[]).filter(s=>!isOccurrenceRecord(s,state));}
export function occurrenceIdentity(id,day,state){const {byId,meta}=familyIndex(state),m=meta.get(id)||{rootId:id,originalDay:day,depth:0},root=byId.get(m.rootId);return m.rootId+'|'+(root?.frequency==='Pontual'?'single':m.depth?m.originalDay:day);}
export function isSupersededOccurrence(id,day,state){const index=familyIndex(state),m=index.meta.get(id);if(!m)return false;const key=occurrenceIdentity(id,day,state);return (state.services||[]).some(s=>{const candidate=index.meta.get(s.id);return s.status!=='cancelado'&&candidate?.depth>m.depth&&occurrenceIdentity(s.id,s.startDate,state)===key;});}
export function familyRecords(rootId,state){return (state.services||[]).filter(s=>familyMeta(s.id,state).rootId===rootId);}
export function completedFamilyOccurrences(rootId,state){const done=new Set();for(const c of state.completions||[]){if(familyMeta(c.serviceId,state).rootId===rootId&&!isSupersededOccurrence(c.serviceId,c.day,state))done.add(occurrenceIdentity(c.serviceId,c.day,state));}for(const s of familyRecords(rootId,state))if(s.frequency==='Pontual'&&s.status==='concluido'&&!isSupersededOccurrence(s.id,s.startDate,state))done.add(occurrenceIdentity(s.id,s.startDate,state));return done.size;}
export function familyOccurrences(rootId,state){return familyRecords(rootId,state).filter(s=>s.id!==rootId&&!isSupersededOccurrence(s.id,s.startDate,state)).sort((a,b)=>(b.startDate||'').localeCompare(a.startDate||''));}
