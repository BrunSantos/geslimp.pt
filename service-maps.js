import {createMapLinks} from './admin/map-links.js';

const escapeHtml = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

export function serviceMaps(client) {
  const links = createMapLinks(client || {});
  if (!links) return '';
  return '<div class="service-directions"><p>Abrir percurso</p><div class="service-map-buttons" role="group" aria-label="Aplicações de mapas">' +
    [['waze', 'Waze'], ['apple', 'Apple Maps'], ['google', 'Google Maps']].map(([key, name]) => {
      const image = new URL('./admin/map-' + key + '.jpg', import.meta.url).href;
      return '<a href="' + escapeHtml(links[key]) + '" target="_blank" rel="noopener noreferrer" aria-label="Abrir percurso no ' + name + '" title="Abrir no ' + name + '"><img src="' + escapeHtml(image) + '" width="32" height="32" alt=""></a>';
    }).join('') + '</div></div>';
}
