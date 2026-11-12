import { createServer } from "vite";

const server = await createServer({
  server: { middlewareMode: true },
  appType: "custom",
  logLevel: "error",
});
try {
  await server.ssrLoadModule("/src/lib/kovcheg/check-run.ts");
} finally {
  await server.close();
}
