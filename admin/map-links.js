export function createMapLinks(client) {
  const address = [client.address, client.postcode, client.city].map(v => String(v || '').trim()).filter(Boolean).join(', ');
  if (!address) return null;
  const destination = encodeURIComponent(address + ', Portugal');
  return {
    waze: 'https://www.waze.com/ul?q=' + destination + '&navigate=yes',
    apple: 'https://maps.apple.com/?daddr=' + destination + '&dirflg=d',
    google: 'https://www.google.com/maps/dir/?api=1&destination=' + destination + '&travelmode=driving&dir_action=navigate'
  };
}
