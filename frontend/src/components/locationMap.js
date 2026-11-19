/** Approximate offline location matching for supplier and vendor maps. */
(function () {
  const maps = new WeakMap();
  const supplierPlaces = [
    { match: /ceres/i, label: 'Ceres', lat: -33.37, lng: 19.31 },
    { match: /tzaneen|letsitele/i, label: 'Tzaneen', lat: -23.83, lng: 30.16 },
    { match: /kirkwood|sundays river/i, label: 'Kirkwood', lat: -33.40, lng: 25.44 },
    { match: /mbombela|nelspruit/i, label: 'Mbombela', lat: -25.47, lng: 30.97 },
    { match: /johannesburg|joburg|city deep/i, label: 'Johannesburg', lat: -26.20, lng: 28.04 },
    { match: /ficksburg/i, label: 'Ficksburg', lat: -28.87, lng: 27.87 },
    { match: /hluhluwe/i, label: 'Hluhluwe', lat: -28.02, lng: 32.27 },
    { match: /\bbrits\b/i, label: 'Brits', lat: -25.63, lng: 27.78 },
  ];
  const supplierProvinces = {
    Gauteng: { lat: -26.27, lng: 28.12 },
    'Free State': { lat: -28.45, lng: 26.80 },
    'KwaZulu-Natal': { lat: -29.00, lng: 30.80 },
    'Western Cape': { lat: -33.50, lng: 20.00 },
    'Eastern Cape': { lat: -32.30, lng: 26.50 },
    Limpopo: { lat: -23.90, lng: 29.40 },
    Mpumalanga: { lat: -25.60, lng: 30.60 },
    'North West': { lat: -26.60, lng: 25.30 },
    'Northern Cape': { lat: -29.00, lng: 22.00 },
  };
  const vendorPlaces = [
    { match: /pioneer mall/i, label: 'Pioneer Mall, Maseru', lat: -29.32, lng: 27.48 },
    { match: /ha thetsane/i, label: 'Ha Thetsane, Maseru', lat: -29.35, lng: 27.48 },
    { match: /lithabaneng/i, label: 'Lithabaneng, Maseru', lat: -29.33, lng: 27.53 },
    { match: /mafeteng\s*(road|rd)|kingsway/i, label: 'Maseru', lat: -29.32, lng: 27.49 },
    { match: /\broma\b/i, label: 'Roma', lat: -29.45, lng: 27.72 },
    { match: /maseru bus stop/i, label: 'Maseru Bus Stop', lat: -29.31, lng: 27.48 },
    { match: /\bmaseru\b/i, label: 'Maseru', lat: -29.31, lng: 27.48 },
  ];

  function resolve(entry, type) {
    if (type === 'suppliers') {
      const address = entry.address || '';
      const place = supplierPlaces.find((item) => item.match.test(address));
      if (place) return place;

      const province = supplierProvinces[entry.province];
      return province ? { ...province, label: `${entry.province} (approx.)` } : null;
    }

    const location = entry.location || '';
    return vendorPlaces.find((item) => item.match.test(location)) || null;
  }

  function makePopup(entry, type, place) {
    const content = document.createElement('div');
    const title = document.createElement('strong');
    title.textContent = type === 'suppliers' ? entry.business_name : entry.vendor_name;
    content.appendChild(title);

    const location = document.createElement('div');
    location.textContent = `${place.label} · ${type === 'suppliers' ? entry.address : entry.location}`;
    content.appendChild(location);

    const phone = type === 'suppliers' ? entry.phone : entry.phone_number;
    if (phone) {
      const phoneLink = document.createElement('a');
      phoneLink.href = `tel:${phone}`;
      phoneLink.textContent = phone;
      content.appendChild(phoneLink);
    }
    return content;
  }

  function render(container, status, entries, type) {
    if (!window.L) {
      status.textContent = 'The interactive map could not load. Check your internet connection and reload.';
      return;
    }

    let map = maps.get(container);
    if (!map) {
      map = L.map(container).setView(type === 'suppliers' ? [-29, 24] : [-29.6, 28.25], type === 'suppliers' ? 5 : 8);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      }).addTo(map);
      maps.set(container, map);
    }

    const markers = L.featureGroup();
    let locatedCount = 0;
    entries.forEach((entry) => {
      const place = resolve(entry, type);
      if (!place) return;
      L.marker([place.lat, place.lng])
        .bindPopup(makePopup(entry, type, place))
        .addTo(markers);
      locatedCount += 1;
    });

    map.eachLayer((layer) => {
      if (layer instanceof L.FeatureGroup) map.removeLayer(layer);
    });
    markers.addTo(map);

    const unlocatedCount = entries.length - locatedCount;
    status.textContent = `${locatedCount} of ${entries.length} shown approximately${unlocatedCount ? ` · ${unlocatedCount} location(s) not recognized` : ''}.`;

    if (locatedCount) {
      map.fitBounds(markers.getBounds().pad(0.2), { maxZoom: type === 'suppliers' ? 8 : 13 });
    } else {
      map.setView(type === 'suppliers' ? [-29, 24] : [-29.6, 28.25], type === 'suppliers' ? 5 : 8);
    }
    window.setTimeout(() => map.invalidateSize(), 0);
  }

  App.locationMap = { render };
})();
