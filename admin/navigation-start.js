export function resetAdminNavigation({page,closeMenu}) {
  document.querySelectorAll('dialog[open]').forEach(dialog=>dialog.close());
  page('overview');
  document.querySelectorAll('.nav-group').forEach(group=>{group.open=false;group.removeAttribute('open')});
  closeMenu();
}
