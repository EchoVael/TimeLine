import { buildApp } from "./app.js";
import { readProcessOptions } from "./config.js";

const options = readProcessOptions();
const app = await buildApp(options);

const address = await app.listen({
  host: "127.0.0.1",
  port: Number(process.env.PORT ?? 4317),
});

console.log(`${address}/#token=${options.startupToken}`);

async function shutdown(): Promise<void> {
  await app.close();
  process.exit(0);
}

process.once("SIGINT", shutdown);
process.once("SIGTERM", shutdown);
