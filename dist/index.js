"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const app_1 = require("./app");
const app = (0, app_1.createApp)();
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
