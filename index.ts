import express from "express";
import { config } from "dotenv";
config();
const app = express();

app.use(express.json());

// Disable CORS
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET, POST, PUT, DELETE, OPTIONS"
  );
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (String(req.headers["x-secret-key"] || "") !== process.env.SECRET) {
    res.sendStatus(401);
  } else {
    if (req.method === "OPTIONS") {
      res.sendStatus(204);
    }
  }

  next();
});

app.all("*", async (req, res) => {
  try {
    let sanitizatedURL = req.path.slice(1);

    if (
      !sanitizatedURL.startsWith("https://") &&
      !sanitizatedURL.startsWith("http://")
    ) {
      const referer = req.headers.referer || "";
      if (!referer)
        throw new Error("Missing referer header for relative URL resolution");

      sanitizatedURL = new URL(req.path, referer).href;
    }

    const targetURL = new URL(sanitizatedURL);

    const requestHeaders = {
      ...req.headers,
      origin: targetURL.origin,
      host: targetURL.host,
      referer: targetURL.href,
      "user-agent": "nzrn_proxy",
    } as typeof req.headers & { "x-secret-key"?: string };

    delete requestHeaders["x-secret-key"];

    const fetchOptions = {
      method: req.method,
      headers: Object.entries({
        ...req.headers,
        origin: targetURL.origin,
        host: targetURL.host,
        referer: targetURL.href,
        "user-agent": "nzrn_proxy",
      }).reduce((acc, [key, value]) => {
        if (value !== undefined) acc[key] = String(value);
        return acc;
      }, {} as Record<string, string>),
      ...(req.method !== "GET" &&
        req.method !== "HEAD" && { body: JSON.stringify(req.body) }),
    };

    const response = await fetch(targetURL.href, fetchOptions);

    response.headers.forEach((value, key) => {
      res.setHeader(key, value);
    });

    const responseText = await response.text();
    res.status(response.status).send(responseText);
  } catch (error: any) {
    res.status(400).send({ error: error.message || "Invalid URL" });
  }
});

const PORT = process.env.PORT || 31069;
app.listen(PORT, () => {
  console.log(`Proxy server listening on port ${PORT}`);
});
