// server.js
import express from 'express';
import compression from 'compression';
import Stripe from 'stripe';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const port = process.env.PORT || 4242;

// --- Stripe ---
const stripe = new Stripe(
  process.env.STRIPE_SECRET_KEY ||
    'sk_test_51R2u8ZCRfrDPrrWe0AXG8fuegkYvZxZQAQ87HblLKIAS5EAWoFGp9bPRtqezKsvdRYcP4ch30vIrpBpm30RiZJiX00WX9I6Nrc',
  { apiVersion: '2024-06-20' }
);

// --- Middlewares globaux ---
app.use(compression());      // gzip
app.use(express.json());     // JSON body

// --- Statique avec cache maîtrisé ---
app.use(
  express.static(path.join(__dirname, 'public'), {
    etag: true,
    lastModified: true,
    setHeaders: (res, filePath) => {
      // Pas de cache pour HTML
      if (/\.(html)$/i.test(filePath)) {
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
        return;
      }
      // Cache long pour assets
      if (/\.(js|css|woff2?|ttf|png|jpe?g|svg|webp|ico)$/i.test(filePath)) {
        res.setHeader('Cache-Control', 'public, max-age=604800, immutable'); // 7 jours
      }
    },
  })
);

// --- Helpers ---
function getOrigin(req) {
  return process.env.SITE_URL || `${req.protocol}://${req.get('host')}`;
}

// --- Stripe Checkout ---
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
            description: String(it.description || ''),
          },
        },
        quantity,
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
      metadata,
    });

    res.json({ checkoutUrl: session.url });
  } catch (err) {
    console.error('Stripe error:', err);
    res.status(500).json({ error: err?.message || 'Stripe error' });
  }
});

// --- Partials HTML sécurisés ---
app.get('/partials/:file', (req, res) => {
  const file = req.params.file || '';
  // n'autorise que des noms de fichiers simples .html (pas de sous-dossiers)
  if (!/^[a-z0-9._-]+\.html$/i.test(file)) return res.sendStatus(400);

  const full = path.join(__dirname, 'public', 'partials', file);
  if (!fs.existsSync(full)) return res.sendStatus(404);

  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.sendFile(full);
});

// --- Index ---
app.get('/', (_req, res) => {
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// (optionnel) Healthcheck
app.get('/health', (_req, res) => res.json({ ok: true }));

// --- Start ---
app.listen(port, () => {
  console.log(`Server listening on http://localhost:${port}`);
});
