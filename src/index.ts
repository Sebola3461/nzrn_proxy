import express from "express";
import cors from "cors";
import { createProxyMiddleware, fixRequestBody } from "http-proxy-middleware";
import bodyParser from "body-parser";
import { config } from "dotenv";
import cookieParser from "cookie-parser"; // Adicionado cookie-parser

const app = express();
config();

app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser());

app.use((req, res, next) => {
  try {
    let targetUrl = req.path.slice(1);

    req.headers.origin = req.path.slice(1);

    if (!targetUrl.startsWith("http://") && !targetUrl.startsWith("https://")) {
      const origin = req.headers.origin;

      if (
        !origin ||
        (!origin.startsWith("http://") && !origin.startsWith("https://"))
      ) {
        res
          .status(400)
          .send(
            "URL inválida. Deve começar com http:// ou https:// ou incluir um Origin válido."
          );

        return;
      }

      targetUrl = `${origin}/${targetUrl}`;
    }

    // if (req.method != "OPTIONS") {
    //   const authCookie = req.cookies["proxy-authentication"];

    //   if (!req.headers["proxy-authorization"] && !authCookie) {
    //     res.status(403).send("Forbbiden");

    //     return;
    //   }

    //   if (req.headers["proxy-authorization"] && !authCookie) {
    //     if (req.headers["proxy-authorization"] != process.env.SECRET) {
    //       res.status(403).send("Forbbiden");

    //       return;
    //     }
    //   }

    //   if (!req.headers["proxy-authorization"] && authCookie) {
    //     if (authCookie != process.env.SECRET) {
    //       res.status(403).send("Forbbiden");

    //       return;
    //     }
    //   }

    //   if (req.headers["proxy-authorization"] && authCookie) {
    //     if (req.headers["proxy-authorization"] != process.env.SECRET) {
    //       res.status(403).send("Forbbiden");

    //       return;
    //     }

    //     if (!req.headers["proxy-authorization"] && authCookie) {
    //       if (authCookie != process.env.SECRET) {
    //         res.status(403).send("Forbbiden");

    //         return;
    //       }
    //     }
    //   }
    // }

    const proxyMiddleware = createProxyMiddleware({
      target: targetUrl,
      changeOrigin: true,
      followRedirects: true,
      pathRewrite: (path) => {
        return "";
      },
      on: {
        proxyReq: fixRequestBody,
        proxyRes: (proxyRes, req, res) => {
          res.setHeader("Access-Control-Allow-Origin", "*");
          Object.keys(proxyRes.headers).forEach((key) => {
            res.setHeader(key, proxyRes.headers[key] as string);
          });
        },
      },
    });

    proxyMiddleware(req, res, next);
  } catch (error) {
    console.error("Erro no proxy:", error);
    res.status(500).send("Erro interno no servidor");
  }
});

app.get("/", (req, res) => {
  res.send("Servidor proxy genérico rodando!");
});

const PORT = process.env.PORT || 31069;
app.listen(PORT, () => {
  console.log(`Servidor proxy rodando na porta ${PORT}`);
});
