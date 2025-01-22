import express, { request } from "express";
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
  res.setHeader("origin", req.originalUrl);

  if (
    String(
      req.headers["x-secret-key"] ||
        req.headers.cookie?.split(";")[0].split("=")[1]
    ) !== process.env.SECRET
  ) {
    res.sendStatus(401);
  } else {
    if (req.method === "OPTIONS") {
      res.sendStatus(204);
    } else {
      next();
    }
  }
});

app.all("*", async (req, res) => {
  try {
    let sanitizatedURL = req.path.slice(1);

    if (
      !sanitizatedURL.startsWith("https://") &&
      !sanitizatedURL.startsWith("http://")
    ) {
      const referer = req.headers.referer || "";

      sanitizatedURL = new URL(req.path, referer || "").href;
    }

    const targetURL = new URL(sanitizatedURL);

    // Transform headers into HeadersInit
    const requestHeaders = Object.entries(req.headers)
      .filter(([key]) => key !== "x-secret-key") // Exclude sensitive headers
      .reduce((acc, [key, value]) => {
        if (value) acc[key] = value.toString();
        return acc;
      }, {} as Record<string, string>);

    delete requestHeaders["content-length"];

    const fetchOptions: RequestInit = {
      method: req.method,
      headers: requestHeaders,
      ...(req.method !== "GET" &&
        req.method !== "HEAD" && { body: JSON.stringify(req.body) }),
    };

    fetch(targetURL.href, fetchOptions)
      .then(async (response) => {
        try {
          response.headers.forEach((value, key) => {
            res.setHeader(key, value);
          });

          res.removeHeader("content-length");
          res.removeHeader("content-encoding");
          res.removeHeader("transfer-encoding");
          res.setHeader("origin", req.originalUrl);

          const plain = await response.text();
          res.status(response.status).send(plain);
        } catch (e) {
          console.error(e);

          res.status(500).send(e);
        }
      })
      .catch((e) => {
        console.error(e);

        res.status(500).send(e);
      });
  } catch (error: any) {
    console.error("Error handling request:", error);
    res.status(400).send({ error: error.message || "Invalid URL" });
  }
});

const PORT = process.env.PORT || 31069;
app.listen(PORT, () => {
  console.log(`Proxy server listening on port ${PORT}`);
});
