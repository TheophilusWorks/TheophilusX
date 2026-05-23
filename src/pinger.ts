import express from "express";

const app = express();
const PORT = process.env.PORT || 3000;

app.set("trust proxy", true);

app.get(["/", "/ping", "/health"], (req, res) => {
  res.json({
    ok: true,
    ip: req.ip,
    uptime: process.uptime(),
    ts: Date.now(),
  });
});

app.listen(PORT, () => {
  console.log(`🚀 running on ${PORT}`);
});
