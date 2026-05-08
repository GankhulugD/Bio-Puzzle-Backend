import "dotenv/config";
import { createApp } from "./app";

const app = createApp();
const PORT = Number(process.env.PORT) || 4000;

app.listen(PORT, () => {
  console.log(`API running on http://localhost:${PORT}`);
  const allowedOrigins = (process.env.CORS_ORIGIN || "http://localhost:3000")
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean);
  console.log(`CORS allowed origins: ${allowedOrigins.join(", ")}`);
});
