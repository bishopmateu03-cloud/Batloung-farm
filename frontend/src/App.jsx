import React, { useEffect, useState } from 'react';
import logo from './assets/images/logo.svg';
import './css/main.css';
import './css/components.css';
import './css/dashboard.css';
import './css/app.css';

const features = [
  '🍎 Fruits & stock by box size',
  '🚚 Supplier purchases',
  '🧾 Vendor sales',
  '💳 Cash, mobile money & credit',
  '📈 Reports'
];

export default function App() {
  const [health, setHealth] = useState({
    state: 'checking',
    message: 'Checking application status…'
  });

  useEffect(() => {
    let active = true;

    fetch('/health')
      .then(async (response) => {
        const result = await response.json();
        if (!active) return;

        if (result.database === 'connected') {
          setHealth({ state: 'ok', message: 'Application and database are ready' });
        } else {
          setHealth({
            state: 'warning',
            message: result.message || 'Application is running; database is unavailable'
          });
        }
      })
      .catch(() => {
        if (active) {
          setHealth({
            state: 'error',
            message: 'Could not reach the application server. Restart it with npm run dev.'
          });
        }
      });

    return () => {
      active = false;
    };
  }, []);

  return (
    <main className="landing">
      <section className="landing-card" aria-labelledby="app-title">
        <img src={logo} alt="Batloung Farm logo" />
        <h1 id="app-title">Batloung Farm</h1>
        <p>
          Fresh produce distribution management for Maseru. Buy from South African
          suppliers, sell to Lesotho street vendors, and always know what is in stock.
        </p>
        <div className="landing-features" aria-label="Application features">
          {features.map((feature) => <span key={feature}>{feature}</span>)}
        </div>
        <p className={`app-health app-health--${health.state}`} role="status" aria-live="polite">
          {health.message}
        </p>
        <a className="btn btn-accent" href="/src/dashboards/admin-dashboard.html">
          Open admin dashboard →
        </a>
      </section>
    </main>
  );
}
