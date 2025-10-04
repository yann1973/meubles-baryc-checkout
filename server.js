// server.js (ESM)
import express from 'express';
import compression from 'compression';
import Stripe from 'stripe';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import 'dotenv/config';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const port = process.env.PORT || 4242;

// ---------- Helpers ----------
function getOrigin(req) {
  // SITE_URL (Render) ex: https://meubles-bary.onrender.com
  // sinon reconstruit à partir de la requête
  return process.env.SITE_URL || `${req.protocol}://${req.get('host')}`;
}

// ---------- Stripe ----------
const stripe = new Stripe(
  process.env.STRIPE_SECRET_KEY ||
    'sk_test_51R2u8ZCRfrDPrrWe0AXG8fuegkYvZxZQAQ87HblLKIAS5EAWoFGp9bPRtqezKsvdRYcP4ch30vIrpBpm30RiZJiX00WX9I6Nrc',
  { apiVersion: '2024-06-20' }
);

// ---------- Middlewares globaux ----------
app.use(compression());
app.use(express.json());

// CORS (si front sur autre origine). Si front même origine, ça ne gêne pas.
const FRONT_ORIGIN = process.env.FRONT_ORIGIN || getOrigin({ protocol: 'https', get: () => '' }) || '*';
app.use(cors({
  origin: FRONT_ORIGIN === '*' ? true : FRONT_ORIGIN,
  methods: ['GET', 'POST', 'HEAD', 'OPTIONS'],
  allowedHeaders: ['Content-Type']
}));

// ---------- Expose les variables PUBLIQUES au front ----------
app.get('/env.js', (_req, res) => {
  res.type('application/javascript').send(
    `window.ENV=${JSON.stringify({
      STRIPE_PUBLISHABLE_KEY: process.env.PUBLIC_STRIPE_PUBLISHABLE_KEY || '',
      GOOGLE_MAPS_API_KEY: process.env.PUBLIC_GOOGLE_MAPS_API_KEY || ''
    })};`
  );
});

// ---------- Fichiers statiques (AVANT tout catch-all) ----------
app.use(
  express.static(path.join(__dirname, 'public'), {
    etag: true,
    lastModified: true,
    setHeaders: (res, filePath) => {
      if (/\.(html)$/i.test(filePath)) {
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
        return;
      }
      if (/\.(js|css|woff2?|ttf|png|jpe?g|svg|webp|ico)$/i.test(filePath)) {
        res.setHeader('Cache-Control', 'public, max-age=604800, immutable'); // 7 jours
      }
    }
  })
);

// ---------- Partials HTML sécurisés ----------
app.get('/partials/:file', (req, res) => {
  const file = req.params.file || '';
  // n'autorise que des noms de fichiers simples .html (pas de sous-dossiers)
  if (!/^[a-z0-9._-]+\.html$/i.test(file)) return res.sendStatus(400);

  const full = path.join(__dirname, 'public', 'partials', file);
  if (!fs.existsSync(full)) return res.sendStatus(404);

  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.sendFile(full);
});

// ---------- Stripe Checkout ----------
app.post('/create-checkout-session', async (req, res) => {
  try {
    const { currency = 'EUR', items = [], metadata = {} } = req.body || {};
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Missing items' });
    }

    const line_items = items.map((it) => {
      const amount = Math.max(50, Math.round(Number(it.amount) || 0)); // min 0,50 €
      const quantity = Math.max(1, Number(it.quantity) || 1);
      return {
        price_data: {
          currency: String(currency || 'EUR').toLowerCase(),
          unit_amount: amount,
          product_data: {
            name: String(it.name || 'Article'),
            description: String(it.description || '')
          }
        },
        quantity
      };
    });

    const origin = getOrigin(req);

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items,
      success_url: `${origin}/success.html`,
      cancel_url: `${origin}/cancel.html`,
      allow_promotion_codes: true,
      billing_address_collection: 'required',
      metadata
    });

    res.json({ checkoutUrl: session.url });
  } catch (err) {
    console.error('Stripe error:', err);
    res.status(500).json({ error: err?.message || 'Stripe error' });
  }
});

// ---------- Index (route directe) ----------
app.get('/', (_req, res) => {
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ---------- Catch-all SPA (APRÈS le static) ----------
// Sert index.html uniquement pour les requêtes HTML inconnues.
// Laisse 404 pour les assets inexistants (ex: /js/devis/ui.js) !
app.get('*', (req, res, next) => {
  const accept = req.headers.accept || '';
  if (req.method === 'GET' && accept.includes('text/html')) {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    return res.sendFile(path.join(__dirname, 'public', 'index.html'));
  }
  return next();
});

// (optionnel) Healthcheck
app.get('/health', (_req, res) => res.json({ ok: true }));

// ---------- Start ----------
app.listen(port, () => {
  console.log(`Server listening on http://localhost:${port}`);
});
