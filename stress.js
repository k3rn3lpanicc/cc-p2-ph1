const http = require("http");
const { URL } = require("url");

// Configuration
const BASE_URL = "http://localhost:3000"; // Replace with your actual URL
const NUM_WORDS = 50; // Number of words to fetch from /word
const NUM_DEFINITION_CALLS = 10000; // Total number of /definition requests
const CONCURRENT_WORKERS = 50; // Number of concurrent threads

// Logging function
const log = (message) => {
  console.log(`${new Date().toISOString()} - ${message}`);
};

// Function to make HTTP requests
function makeRequest(path, params = "") {
  return new Promise((resolve, reject) => {
    const url = new URL(BASE_URL + path);
    if (params) {
      url.searchParams.append("word", params);
    }

    const options = {
      method: "GET",
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      headers: {
        "Content-Type": "application/json",
      },
    };

    const req = http.request(options, (res) => {
      let data = "";

      res.on("data", (chunk) => {
        data += chunk;
      });

      res.on("end", () => {
        resolve({ status: res.statusCode, data: JSON.parse(data) });
      });
    });

    req.on("error", (e) => {
      reject(`Error with request: ${e.message}`);
    });

    req.end();
  });
}

// Function to fetch random words from /word
async function fetchWords(count) {
  const words = [];

  log(`Fetching ${count} random words from /word...`);

  for (let i = 0; i < count; i++) {
    try {
      const response = await makeRequest("/word");
      if (response.status === 200) {
        words.push(response.data);
        log(`Fetched word: ${response.data}`);
      } else {
        log(`Failed to fetch word: ${response.status}`);
      }
    } catch (error) {
      log(`Error fetching word: ${error}`);
    }
  }

  return words;
}

// Function to test /definition for multiple words
async function testDefinitions(words, numCalls) {
  const requests = [];
  const wordCount = words.length;

  log(`Making ${numCalls} requests to /definition using ${wordCount} words...`);

  for (let i = 0; i < numCalls; i++) {
    const word = words[Math.floor(Math.random() * wordCount)]; // Pick a random word
    requests.push(makeRequest("/definition", word));

    // Limit concurrent workers
    if (requests.length === CONCURRENT_WORKERS) {
      log(`Sending ${CONCURRENT_WORKERS} concurrent requests...`);
      await Promise.all(requests); // Wait for all current requests to finish
      requests.length = 0; // Reset the array
    }
  }

  // Wait for remaining requests
  const results = await Promise.all(requests);

  return results;
}

// Main function to orchestrate the test
(async () => {
  log("Starting stress test...");

  // Step 1: Fetch random words
  const words = await fetchWords(NUM_WORDS);
  if (words.length === 0) {
    log("No words fetched. Exiting...");
    return;
  }

  // Step 2: Test /definition for these words
  const results = await testDefinitions(words, NUM_DEFINITION_CALLS);

  log("Stress test completed. Summary:");

  // Log some of the results
  const redisResponses = results.filter(
    (result) => result.data.from === "redis"
  ).length;
  const apiResponses = results.filter(
    (result) => result.data.from === "api"
  ).length;

  log(`Total requests: ${NUM_DEFINITION_CALLS}`);
  log(`Redis responses: ${redisResponses}`);
  log(`API responses: ${apiResponses}`);
})();
