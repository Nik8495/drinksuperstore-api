import app from './app.js';

const PORT = process.env['PORT'] || 3000;
const env = process.env['NODE_ENV'] || 'development';

app.listen(PORT, () => {
  console.log(`[${env}] Server is running on http://localhost:${PORT}`);
});
