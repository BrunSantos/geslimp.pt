// Reorganiza os controlos existentes, preservando os seus eventos e permissões.
function menu(row, name) {
  let details = row.querySelector(':scope > .record-menu');
  if (details) return details.querySelector('.record-menu-options');
  details = document.createElement('details');
  details.className = 'record-menu';
  const summary = document.createElement('summary');
  summary.textContent = '⋯';
  summary.setAttribute('aria-label', 'Mais ações: ' + name);
  summary.title = 'Mais ações';
  const options = document.createElement('div');
  options.className = 'record-menu-options';
  details.append(summary, options);
  row.append(details);
  return options;
}
function move(button, options) {
  if (!button || button.parentElement === options) return;
  button.classList.remove('primary');
  options.append(button);
}
function arrange() {
  for (const card of document.querySelectorAll('.q-record, .stock-card, .client-card, #services-list .service-record')) {
    const quote = card.matches('.q-record'), stock = card.matches('.stock-card'), client = card.matches('.client-card');
    const row = card.querySelector(quote || stock ? ':scope > .row' : client ? '.client-actions' : '.service-buttons');
    if (!row) continue;
    row.classList.add('record-actions');
    const name = card.querySelector('h3,strong')?.textContent || 'registo';
    const options = menu(row, name);
    const primary = card.querySelector(quote ? '[data-preview]' : stock ? '[data-stock-issue],[data-stock-loan]' : client ? '[data-services-client]' : '[data-occurrence-service],[data-service-complete]');
    if (primary) { primary.classList.add('primary'); if (primary.parentElement !== row) row.prepend(primary); }
    if (stock && !primary) card.querySelector('[data-stock-history]')?.classList.add('primary');
    const selector = quote ? '[data-revise],[data-duplicate],[data-model],[data-delete-quote],[data-convert],[data-create-client],[data-share-quote],[data-decide-quote],[data-revoke-quote]' : stock ? '[data-stock-edit],[data-stock-history],[data-invoice-item]' : client ? '[data-edit-client],[data-delete-client],[data-quotes-client],[data-team-assign]' : '[data-edit-service],[data-end-recurrence],[data-service-reschedule],[data-service-cancel],[data-service-delete],[data-team-assign],[data-service-photos],[data-billing-service],[data-work-history]';
    for (const b of card.querySelectorAll(selector)) if (b !== primary) move(b, options);
    if (quote) {
      const status = row.querySelector('[data-status]');
      if (status && !status.closest('label')) { const label = document.createElement('label'); label.className = 'record-status'; label.append('Estado do orçamento', status); row.before(label); }
      card.querySelector(':scope > small')?.classList.add('record-share-help');
    }
    if (!quote && !stock && !client) {
      const recurring = Boolean(card.querySelector('[data-end-recurrence]'));
      const edit = options.querySelector('[data-edit-service]'), reschedule = options.querySelector('[data-service-reschedule]');
      if (edit) edit.textContent = recurring ? 'Editar recorrência' : 'Editar serviço';
      if (reschedule) reschedule.textContent = recurring ? 'Reagendar recorrência' : 'Reagendar serviço';
      if (recurring) options.setAttribute('aria-label', 'Ações da recorrência completa');
      options.querySelector('[data-end-recurrence]')?.classList.add('danger');
    }
    // Ações destrutivas ficam sempre no fim, separadas das restantes.
    const safe = [...options.children].filter(b => !b.classList.contains('danger'));
    const destructive = [...options.children].filter(b => b.classList.contains('danger'));
    const ordered = [...safe, ...destructive];
    if (ordered.some((b, i) => options.children[i] !== b)) options.append(...ordered);
    for (const b of destructive) b.classList.toggle('menu-danger-first', b === destructive[0]);
  }
}
let scheduled = false;
const observer = new MutationObserver(() => {
  if (scheduled) return;
  scheduled = true;
  queueMicrotask(() => { scheduled = false; observer.disconnect(); arrange(); observe(); });
});
function observe() {
  for (const id of ['quote-list','stock-items','client-list','services-list']) {
    const root = document.getElementById(id);
    if (root) observer.observe(root, {childList:true, subtree:true});
  }
}
function position(details) {
  const box = details.querySelector('.record-menu-options');
  if (!box || !details.open) return;
  const r = details.querySelector('summary').getBoundingClientRect();
  const width = Math.min(280, innerWidth - 24);
  box.style.width = width + 'px';
  box.style.left = Math.max(12, Math.min(r.right - width, innerWidth - width - 12)) + 'px';
  const below = innerHeight - r.bottom - 12, above = r.top - 12;
  const down = below >= Math.min(box.scrollHeight, 260) || below >= above;
  box.style.maxHeight = Math.max(80, down ? below : above) + 'px';
  box.style.top = down ? r.bottom + 6 + 'px' : 'auto';
  box.style.bottom = down ? 'auto' : innerHeight - r.top + 6 + 'px';
}
document.addEventListener('toggle', e => {
  const d = e.target;
  if (!d.matches?.('.record-menu') || !d.open) return;
  for (const other of document.querySelectorAll('.record-menu[open],.team-action-menu[open]')) if (other !== d) other.open = false;
  position(d);
}, true);
document.addEventListener('click', e => {
  for (const d of document.querySelectorAll('.record-menu[open]')) if (!d.contains(e.target) || e.target.closest('button,a')) d.open = false;
});
document.addEventListener('keydown', e => {
  if (e.key !== 'Escape') return;
  for (const d of document.querySelectorAll('.record-menu[open]')) { d.open = false; d.querySelector('summary').focus(); }
});
for (const event of ['resize','scroll']) window.addEventListener(event, () => document.querySelectorAll('.record-menu[open]').forEach(position), true);
arrange(); observe();
