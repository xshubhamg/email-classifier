import app from "./app.js";
import { JEV_MODEL } from "./classify.js";
import { hasApiKey } from "./jev-client.js";

const port = Number(process.env.PORT ?? 3000);
app.listen(port, () => {
  console.log(`email-classifier listening on :${port} (model=${JEV_MODEL}, mock=${!hasApiKey()})`);
});

export default app;
