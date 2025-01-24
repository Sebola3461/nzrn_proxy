import express from "express";
import cors from "cors";
import { createProxyMiddleware, fixRequestBody } from "http-proxy-middleware";
import bodyParser from "body-parser";
import { config } from "dotenv";
import cookieParser from "cookie-parser";

const app = express();
config();

// Configuração do CORS para permitir qualquer origem e todos os cabeçalhos
app.use(
  cors({
    origin: "*", // Permite qualquer origem
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"], // Métodos permitidos
    allowedHeaders: "*", // Permite todos os cabeçalhos
    credentials: true, // Permite credenciais (cookies, headers de autenticação)
  })
);

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser());

// Middleware para lidar com preflight requests (OPTIONS)
app.options("*", (req, res) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.header("Access-Control-Allow-Headers", "*"); // Permite todos os cabeçalhos
  res.sendStatus(204); // Resposta sem conteúdo para preflight requests
});

app.use((req, res, next) => {
  try {
    let targetUrl = req.path.slice(1);

    // Verifica se a URL começa com http:// ou https://
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

    // Configuração do proxy
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
