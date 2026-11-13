export function initCalendarRefresh({canRefresh,refresh,onError=()=>{},interval=600000,events=document,timer=setInterval}){
  let running=false;
  async function run(){
    if(running||!canRefresh())return;
    running=true;
    try{await refresh();}catch(error){onError(error);}finally{running=false;}
  }
  const id=timer(run,interval);
  events.addEventListener('visibilitychange',run);
  (events.defaultView||events).addEventListener('online',run);
  return {run,id};
}
