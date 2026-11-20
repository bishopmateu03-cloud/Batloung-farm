/**
 * Frontend configuration.
 * Same origin when served by the Express backend (localhost:3000 locally, or any
 * deployed host like Render). Falls back to BACKEND_URL only when the page is
 * opened via Live Server or file://.
 */
window.App = window.App || {};

(function () {
  const BACKEND_URL = 'http://localhost:3000';

  const isLiveServerOrFile =
    location.protocol === 'file:' ||
    (['localhost', '127.0.0.1'].includes(location.hostname) && location.port !== '3000');
  const sameOrigin = !isLiveServerOrFile;

  App.config = {
    API_BASE: sameOrigin ? '/api' : `${BACKEND_URL}/api`,
    HEALTH_URL: sameOrigin ? '/health' : `${BACKEND_URL}/health`,
    CURRENCY: 'M',
    PACKAGING_SIZES: ['SMALL', 'MEDIUM', 'LARGE'],
    PROVINCES: [
      'Gauteng', 'Free State', 'KwaZulu-Natal', 'Western Cape',
      'Eastern Cape', 'Limpopo', 'Mpumalanga', 'North West', 'Northern Cape',
    ],
  };
})();