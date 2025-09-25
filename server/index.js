import app from './app.js';
import { connectDB } from './db-postgres.js';

const PORT = process.env.PORT || 3001;
connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`Trivy backend is running on http://localhost:${PORT}`);
  });
});
