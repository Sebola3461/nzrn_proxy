import express from "express";
const app = express();

app.use(express.json());

app.all("*", (req, res) => {
  try {
    let requestedURL = req.path.slice(1);
    if (
      !requestedURL.startsWith("http://") ||
      !requestedURL.startsWith("https://")
    ) {
      requestedURL = req.protocol + "://" + requestedURL;
    }

    const targetURL = new URL(requestedURL);

    req.headers.origin = targetURL.origin;
    req.headers.host = targetURL.host;
    req.headers["user-agent"] = "nzrn_proxy";
    req.headers.referer = targetURL.href;
    req.headers["content-length"] = String(JSON.stringify(req.body).length);

    fetch(targetURL.href, {
      headers: req.headers as any,
      method: req.method,
      body: JSON.stringify(req.body),
    })
      .then(async (axios_res) => {
        try {
          // Set headers received from the axios response
          if (axios_res.headers) {
            Object.entries(axios_res.headers).forEach(([key, value]) => {
              if (value) {
                res.set(key, value as string); // Set headers one by one
              }
            });
          }

          // Forward the status and data

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
