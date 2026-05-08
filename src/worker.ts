/**
 * Cloudflare Workers entry — Express.js via `nodejs_compat` + `httpServerHandler`.
 * @see https://developers.cloudflare.com/workers/tutorials/deploy-an-express-app/
 */
import { httpServerHandler } from "cloudflare:node";
import { createApp } from "./app";

/** Workers Node HTTP shim дээрх портын дагуу process.env.PORT зарим тохиолдолд илгээгдэнэ. */
const PORT = Number(process.env.PORT) || 8080;

const app = createApp();
app.listen(PORT);

export default httpServerHandler({ port: PORT });
