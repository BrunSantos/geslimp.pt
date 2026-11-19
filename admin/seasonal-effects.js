const birthdays=new Set(['01-20','04-28','05-11','06-25','09-06','10-28','11-11']);
export function seasonForDate(date=new Date()){
 const parts=Object.fromEntries(new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Lisbon',month:'2-digit',day:'2-digit'}).formatToParts(date).map(p=>[p.type,p.value]));
 const birthday=birthdays.has(parts.month+'-'+parts.day);
 const snow=parts.month==='11'||(parts.month==='12'&&Number(parts.day)<=24);
 if(parts.month==='12'&&parts.day==='25')return 'christmas';
 return snow?(birthday?'snow-birthday':'snow'):(birthday?'birthday':'');
}
function startSeasonalEffects(){
 if(document.getElementById('geslimp-seasonal'))return;
 const canvas=document.createElement('canvas');canvas.id='geslimp-seasonal';canvas.setAttribute('aria-hidden','true');canvas.style.cssText='position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:1000';document.body.appendChild(canvas);
 const greeting=document.createElement('div');greeting.id='geslimp-christmas';greeting.hidden=true;greeting.textContent='🎄 Feliz Natal! — GesLimp ✨';document.body.appendChild(greeting);
 const ctx=canvas.getContext('2d');if(!ctx){canvas.remove();return;}const motion=matchMedia('(prefers-reduced-motion: reduce)');let particles=[],mode='',frame=0,last=0,width=0,height=0;
 function size(){width=innerWidth;height=innerHeight;const ratio=Math.min(devicePixelRatio||1,2);canvas.width=width*ratio;canvas.height=height*ratio;ctx.setTransform(ratio,0,0,ratio,0,0);}
 function particle(initial=false,kind=mode){return {kind,x:Math.random()*width,y:initial?Math.random()*height:-25,size:kind==='snow'?2.2+Math.random()*5.4:2.5+Math.random()*4,opacity:.36+Math.random()*.22,speed:kind==='snow'?13+Math.random()*14:24+Math.random()*20,phase:Math.random()*Math.PI*2,angle:Math.random()*Math.PI,color:['#0b65ad','#55a547','#d1ad54','#d992ac'][Math.floor(Math.random()*4)]};}
 function draw(time){frame=0;const delta=last?Math.min((time-last)/1000,.06):0;last=time;ctx.clearRect(0,0,width,height);
  for(let i=0;i<particles.length;i++){const p=particles[i];p.y+=p.speed*delta;p.x+=Math.sin(time/2400+p.phase)*5*delta;if(p.y>height+25)particles[i]=particle(false,p.kind);ctx.save();ctx.translate(p.x,p.y);ctx.rotate(p.angle+(p.kind==='birthday'?time/1500:0));ctx.globalAlpha=p.opacity;
   if(p.kind==='snow'){ctx.strokeStyle='#92b7cc';ctx.lineWidth=.8;for(let n=0;n<6;n++){ctx.rotate(Math.PI/3);ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(p.size,0);ctx.moveTo(p.size*.6,0);ctx.lineTo(p.size*.4,-p.size*.25);ctx.moveTo(p.size*.6,0);ctx.lineTo(p.size*.4,p.size*.25);ctx.stroke();}}
   else{ctx.fillStyle=p.color;ctx.fillRect(-2,-p.size*1.4,3,p.size*2.8);}ctx.restore();}
  frame=requestAnimationFrame(draw);
 }
 function update(){const next=seasonForDate();const visible=!document.hidden&&!document.body.classList.contains('auth-locked');greeting.hidden=!visible||next!=='christmas';const active=!!next&&next!=='christmas'&&visible&&!motion.matches;canvas.hidden=!active;if(!active){if(frame)cancelAnimationFrame(frame);frame=0;last=0;ctx.clearRect(0,0,width,height);return;}if(mode!==next||!particles.length){mode=next;particles=Array.from({length:Math.min(mode.startsWith('snow')?24:18,Math.max(9,Math.ceil(width/70)))},(_,i)=>particle(true,mode==='snow-birthday'?(i%2?'snow':'birthday'):mode));}if(!frame){last=0;frame=requestAnimationFrame(draw);}}
 size();window.addEventListener('resize',()=>{size();update();});document.addEventListener('visibilitychange',update);motion.addEventListener?.('change',update);new MutationObserver(update).observe(document.body,{attributes:true,attributeFilter:['class']});setInterval(update,60000);update();
}
if(typeof document!=='undefined')startSeasonalEffects();
