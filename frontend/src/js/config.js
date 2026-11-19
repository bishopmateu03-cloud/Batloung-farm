/**
 * Frontend configuration.
 * When the page is served by the Express backend (http://localhost:3000) the API
 * is on the same origin. When opened another way (Live Server, file://) it falls
 * back to the backend URL below. Change BACKEND_URL if your backend uses another port.
 */
window.App = window.App || {};

(function () {
  const BACKEND_URL = 'http://localhost:3000';
  const sameOrigin = location.protocol.startsWith('http') && location.port === '3000';

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
