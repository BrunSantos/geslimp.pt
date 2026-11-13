import {portugalClock} from './shift-time.js?v=111';

export function serviceStartWindow(service, day, now = new Date()) {
  const clock = portugalClock(now);
  const hours = {'Manhã':[9,14], 'Tarde':[14,19], 'Noite':[19,24], 'Dia inteiro':[9,24]};
  const range = hours[service?.shift];
  if (!range) return {allowed:false, message:'Turno por definir. Reagenda o serviço.'};
  const label = `${String(range[0]).padStart(2,'0')}:00–${range[1] === 24 ? '24:00' : String(range[1]).padStart(2,'0')+':00'}`;
  const allowed = day === clock.day && clock.hour >= range[0] && clock.hour < range[1];
  return {allowed, message:allowed ? '' : day === clock.day && clock.hour < range[0]
    ? `O serviço pode iniciar às ${String(range[0]).padStart(2,'0')}:00. Para outro horário, reagenda o serviço.`
    : `Início disponível apenas no dia marcado, no turno ${label}. Reagenda o serviço.`};
}
