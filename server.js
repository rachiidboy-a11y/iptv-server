const express = require("express");
const axios = require("axios");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

// 🔥 HIER DEINE M3U URL EINTRAGEN
const M3U_URL = "http://ezynw.teckndc.com/get.php?username=XCL76GT&password=1SUR12B&output=hls&type=m3u";

// 📡 EPG Speicher
let epgData = {};

// ========================
// 🔧 M3U PARSER
// ========================
function parseM3U(text) {
  const lines = text.split("\n");
  let channels = [];
  let current = {};

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    if (line.startsWith("#EXTINF")) {
      const name = line.split(",").pop()?.trim() || "Unknown";

      const tvgId = line.match(/tvg-id="(.*?)"/)?.[1] || null;
      const logo = line.match(/tvg-logo="(.*?)"/)?.[1] || null;
      const group = line.match(/group-title="(.*?)"/)?.[1] || "Andere";

      current = { name, tvgId, logo, group };
    }

    else if (line && !line.startsWith("#")) {
      if (current.name) {
        channels.push({
          ...current,
          url: line
        });
      }
      current = {};
    }
  }

  console.log("📺 Channels geladen:", channels.length);
  return channels;
}

// ========================
// 📺 CHANNELS (AUTO LOAD)
// ========================
app.get("/channels", async (req, res) => {
  try {
    if (!M3U_URL) {
      return res.json([]);
    }

    const response = await axios.get(M3U_URL, {
      timeout: 20000
    });

    const channels = parseM3U(response.data);

    res.json(channels);

  } catch (e) {
    console.log("❌ Channels Fehler:", e.message);
    res.json([]);
  }
});

// ========================
// 📡 EPG LOAD
// ========================
app.post("/load-epg", async (req, res) => {
  const { url } = req.body;

  try {
    const response = await axios.get(url, {
      timeout: 20000
    });

    const xml = response.data;
    const programs = {};

    const items = xml.split("<programme");

    items.forEach(item => {
      const channel = item.match(/channel="(.*?)"/)?.[1];
      const title = item.match(/<title.*?>(.*?)<\/title>/)?.[1];

      if (channel && title) {
        if (!programs[channel]) programs[channel] = [];
        programs[channel].push({ title });
      }
    });

    epgData = programs;

    console.log("📡 EPG geladen");
    res.json({ success: true });

  } catch (e) {
    console.log("❌ EPG Fehler:", e.message);
    res.status(500).json({ error: "EPG Fehler" });
  }
});

// ========================
// 📡 EPG GET
// ========================
app.get("/epg/:id", (req, res) => {
  res.json(epgData[req.params.id] || []);
});

// ========================
// 🧪 TEST ROUTE
// ========================
app.get("/", (req, res) => {
  res.send("Server läuft sauber");
});

// ========================
// 🚀 START
// ========================
app.listen(3000, () => {
  console.log("🚀 Server läuft auf http://localhost:3000");
});
