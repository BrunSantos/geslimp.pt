import DOMPurify from './mail-sanitize.js?v=26.11.21';
export function emailFragment(message,preserveCid=false,fitReading=false){
 const body=DOMPurify.sanitize(message.html||'',{RETURN_DOM:true,FORBID_TAGS:['form','input','button','iframe','svg','math','object','embed','video','audio','link','meta','base'],FORBID_ATTR:['srcset','ping']});
 const images=new Map((message.inlineImages||[]).filter(x=>/^image\/(png|jpeg|gif|webp)$/.test(x.mime)&&/^[A-Za-z0-9+/=]+$/.test(x.data)).map(x=>[x.cid,'data:'+x.mime+';base64,'+x.data]));
 for(const img of body.querySelectorAll('img')){const source=img.getAttribute('src')||'';let url='';if(source.toLowerCase().startsWith('cid:'))url=preserveCid&&(message.forwardCids||[]).includes(source.slice(4))?source:images.has(source.slice(4))?(preserveCid?source:images.get(source.slice(4))):'';else try{const parsed=new URL(source);if(parsed.protocol==='https:')url=parsed.href;}catch{}
  if(url)img.setAttribute('src',url);else img.removeAttribute('src');img.setAttribute('referrerpolicy','no-referrer');img.removeAttribute('srcset');}
 for(const link of body.querySelectorAll('a')){try{if(new URL(link.getAttribute('href')).protocol!=='https:')link.removeAttribute('href');}catch{link.removeAttribute('href');}link.setAttribute('target','_blank');link.setAttribute('rel','noopener noreferrer');}
 if(fitReading){
  for(const style of body.querySelectorAll('style'))style.remove();
  for(const el of body.querySelectorAll('*')){
   const style=el.style;
   if(!style)continue;
   for(const prop of ['width','min-width','max-width','inline-size','min-inline-size','max-inline-size','padding','padding-left','padding-right','padding-inline','padding-inline-start','padding-inline-end','margin','margin-left','margin-right','margin-inline','margin-inline-start','margin-inline-end','position','inset','left','right','transform','translate','zoom','overflow','overflow-x','white-space','text-indent','float','table-layout']){
    if(el.hasAttribute('style'))style.removeProperty(prop);
   }
   el.removeAttribute('nowrap');
   if(!el.matches('img'))el.removeAttribute('width');
   if(el.matches('table')){el.removeAttribute('cellpadding');el.removeAttribute('cellspacing');}
  }
 }
 return body.innerHTML;
}
export function emailDocument(message){const html=emailFragment(message,false,true);
 return '<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src \'none\'; img-src https: data:; style-src \'unsafe-inline\'; base-uri \'none\'; form-action \'none\';"><meta name="referrer" content="no-referrer"><style>body{font:15px/1.5 Arial,sans-serif;margin:0;padding:12px;color:#243642;overflow-wrap:anywhere}*{box-sizing:border-box;min-width:0!important}html,body{width:100%;max-width:100%;overflow-x:auto}body *{max-width:100%!important}img{max-width:100%!important;height:auto!important;object-fit:contain;display:inline-block;vertical-align:middle}table{width:100%!important;max-width:100%!important;table-layout:fixed!important;border-collapse:collapse}td,th{min-width:0!important;overflow-wrap:anywhere!important;word-break:normal}blockquote{margin:1em 0;padding-inline-start:min(12px,3vw);border-inline-start:2px solid #d8e2ea}td,th{padding-inline:min(6px,1vw)}pre{white-space:pre-wrap!important;overflow-wrap:anywhere}div,p{overflow-wrap:anywhere!important}a{color:#0d61aa}</style></head><body>'+html+'</body></html>';
}
