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

  if (req.headers["x-secret-key"] != process.env.SECRET) {
    res.send(401);
  } else {
    if (req.method === "OPTIONS") {
      res.sendStatus(204);
    } else {
      next();
    }
  }
});
app.all("*", (req, res) => {
  try {
    const targetURL = new URL(req.path.slice(1));

    req.headers.origin = targetURL.origin;
    req.headers.host = targetURL.host;
    req.headers["user-agent"] = "nzrn_proxy";
    req.headers.referer = targetURL.href;
    req.headers["content-length"] = String(JSON.stringify(req.body).length);

    let reqContent: RequestInit;

    if (req.method == "GET" || req.method == "HEAD") {
      reqContent = {
        headers: req.headers as any,
        method: req.method,
      };
    } else {
      reqContent = {
        headers: req.headers as any,
        method: req.method,
        body: JSON.stringify(req.body),
      };
    }

    fetch(targetURL.href, reqContent)
      .then(async (axios_res) => {
        try {
          if (axios_res.headers) {
            Object.entries(axios_res.headers).forEach(([key, value]) => {
              if (value) {
                res.set(key, value as string);
              }
            });
          }

          res.status(axios_res.status || 200).send(await axios_res.text());
        } catch (e) {
          res.status(500).send("");
        }
      })
      .catch((e) => {
        console.log(e);
        res.status(e?.response?.status || 500).send(e?.response?.data);
      });
  } catch (e) {
    console.log(e);
    res.status(400).send("Invalid URL");
  }
});

app.listen(31069, () => {
  console.log("Proxy server listening on port 31069");
});
