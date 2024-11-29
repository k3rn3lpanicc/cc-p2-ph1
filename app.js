const { default: axios } = require("axios");
const { configDotenv } = require("dotenv");
const { default: Redis } = require("ioredis");
const express = require("express");
const promClient = require("prom-client");
const http = require("http");
http.globalAgent.maxSockets = Infinity;

const register = new promClient.Registry();
promClient.collectDefaultMetrics({ register });

const httpRequestCount = new promClient.Counter({
  name: "http_requests_total",
  help: "Total number of requests by route",
  labelNames: ["route", "method"],
});
const redisHitCount = new promClient.Counter({
  name: "redis_responses_total",
  help: "Total number of responses served from Redis",
});
const httpRequestStatus = new promClient.Counter({
  name: "http_request_status_total",
  help: "Total number of requests by status",
  labelNames: ["route", "status"],
});
const httpRequestDuration = new promClient.Histogram({
  name: "http_request_duration_seconds",
  help: "Duration of HTTP requests in seconds",
  labelNames: ["route"],
});

register.registerMetric(httpRequestCount);
register.registerMetric(redisHitCount);
register.registerMetric(httpRequestStatus);
register.registerMetric(httpRequestDuration);

const app = express();
configDotenv();
const PORT = process.env.PORT || 3000;
const API_KEY = process.env.API_KEY;
const STORE_TIME = process.env.STORE_TIME || 60 * 5;
const redis = new Redis({
  host: "redis-container",
  port: 6379,
});

app.use(express.json());

app.get("/metrics", async (req, res) => {
  res.set("Content-Type", register.contentType);
  res.end(await register.metrics());
});

app.get("/word", async (req, res) => {
  const end = httpRequestDuration.startTimer({ route: "/word" });
  httpRequestCount.inc({ route: "/word", method: "GET" });

  try {
    const result = await axios.get("https://api.api-ninjas.com/v1/randomword", {
      headers: {
        "X-Api-Key": API_KEY,
      },
    });
    httpRequestStatus.inc({ route: "/word", status: 200 });
    res.json(result.data.word[0]);
  } catch (err) {
    httpRequestStatus.inc({ route: "/word", status: 500 });
    res.status(500).json({ error: "Failed to fetch random word" });
  } finally {
    end();
  }
});

app.get("/definition", async (req, res) => {
  const end = httpRequestDuration.startTimer({ route: "/definition" });
  httpRequestCount.inc({ route: "/definition", method: "GET" });

  const word = req.query.word;

  try {
    const redisRes = await redis.get(word);
    if (redisRes) {
      redisHitCount.inc();
      httpRequestStatus.inc({ route: "/definition", status: 200 });
      res.json({ definition: JSON.parse(redisRes), from: "redis" });
    } else {
      const response = await axios.get(
        `https://api.api-ninjas.com/v1/dictionary?word=${word}`,
        {
          headers: {
            "X-Api-Key": API_KEY,
          },
        }
      );
      await redis.setex(
        word,
        STORE_TIME,
        JSON.stringify(response.data.definition)
      );
      httpRequestStatus.inc({ route: "/definition", status: 200 });
      res.json({ definition: response.data.definition, from: "api" });
    }
  } catch (err) {
    httpRequestStatus.inc({ route: "/definition", status: 500 });
    res.status(500).json({ error: "Failed to fetch word definition" });
  } finally {
    end();
  }
});

redis.on("error", (err) => {
  console.error("Redis connection error:", err);
});

app.listen(PORT, () => console.log(`Listening on port ${PORT}`));
