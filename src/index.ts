import "dotenv/config";
import { createApp } from "./app";

const app = createApp();
// Render дээр process.env.PORT-ыг системээс автоматаар өгдөг
const PORT = Number(process.env.PORT) || 4000;

// Серверийг 0.0.0.0 дээр асаах нь Render-т илүү найдвартай
app.listen(PORT, "0.0.0.0", () => {
  console.log(`API running on port ${PORT}`);

  // Энэ хэсэг зөвхөн мэдээлэл харуулах зориулалттай
  const allowedOrigins = (process.env.CORS_ORIGIN || "http://localhost:3000")
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean);
  console.log(`CORS allowed origins: ${allowedOrigins.join(", ")}`);
});
