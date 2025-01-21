import axios from "axios";
import express from "express";
const app = express();

app.all("*", (req, res) => {
  try {
    const targetURL = new URL(
      "https://" +
        req.path
          .slice(7)
          .split("/")
          .filter((el, i) => i != 0)
          .join("/")
    );

    req.headers.origin = targetURL.origin;
    req.headers.host = targetURL.host;
    req.headers["user-agent"] = "nzrn_proxy";
    req.headers.referer = targetURL.href;

    axios(targetURL.href, {
      headers: req.headers,
      method: req.method,
      data: req.body,
    })
      .then((axios_res) => {
        // Set headers received from the axios response
        if (axios_res.headers) {
          Object.entries(axios_res.headers).forEach(([key, value]) => {
            if (value) {
              res.set(key, value as string); // Set headers one by one
            }
          });
        }

        // Forward the status and data
        res.status(axios_res.status || 200).send(axios_res.data);
      })
      .catch((e) => {
        res
          .status(e?.status || 500)
          .send(e?.response?.data || "Error occurred");
      });
  } catch (e) {
    console.log(e);

    res.status(400).send("Invalid URL");
  }
});

app.listen(31069, () => {
  console.log("Proxy server listening on port 31069");
});
