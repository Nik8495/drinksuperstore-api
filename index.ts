import app from './app.js';

const PORT = process.env['PORT'] || 3000;
const env = process.env['NODE_ENV'] || 'development';

app.listen(PORT, () => {
  console.log(`[${env}] Server is running on http://localhost:${PORT}`);

  // Keep-alive self-ping for Render free tier (sleeps after 15 min inactivity)
  const RENDER_URL = process.env['RENDER_EXTERNAL_URL'];
  if (RENDER_URL) {
    const PING_INTERVAL_MS = 13 * 60 * 1000; // 13 minutes
    setInterval(async () => {
      try {
        const res = await fetch(`${RENDER_URL}/api/health`);
        console.log(`[keep-alive] pinged ${RENDER_URL}/api/health — ${res.status}`);
      } catch (err: any) {
        console.error(`[keep-alive] ping failed:`, err.message);
      }
    }, PING_INTERVAL_MS);
    console.log(`[keep-alive] self-ping enabled every 13 minutes`);
  }
});
