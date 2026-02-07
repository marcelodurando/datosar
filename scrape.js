import axios from "axios";
import * as cheerio from "cheerio";
import { parseStringPromise } from "xml2js";
import fs from "fs";


const SITEMAP_URL = "https://lottoedge.com/florida-lottery-sitemap.xml";
const UAS = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 13_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36",
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.0.0 Safari/537.36"
];

function headers() {
  return {
    ...HEADERS,
    "User-Agent": UAS[Math.floor(Math.random() * UAS.length)]
  };
}

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function getScratchUrls() {
  const xml = await axios.get(SITEMAP_URL).then(r => r.data);
  const parsed = await parseStringPromise(xml);

  return parsed.urlset.url
    .map(u => u.loc[0])
    .filter(u => u.includes("/scratch/"));
}

function text($el) {
  return $el.text().trim() || null;
}

async function parseGame(url) {
  const html = await axios.get(url, {
  headers: {
    ...headers(),
    Referer: new URL(url).origin
  }
}).then(r => r.data);
  const $ = cheerio.load(html);

  const game = {
    url,
    game_name: text($("h1.title")),
    last_update: text($("small").first()).replace("Last update:", "").trim(),
    ticket_price: text($(".grid-column:has(.reference:contains('Ticket Price')) .value")),
    state: text($(".grid-column:has(.reference:contains('State')) .value")),
    game_number: text($(".grid-column:has(.reference:contains('Game Number')) .value")),
    date_released: text($(".grid-column:has(.reference:contains('Date Release')) .value")),
    date_end: text($(".grid-column:has(.reference:contains('Date End')) .value")),
    img_url: $("img[alt*='Scratcher']").first().attr("src") || null,
    odds: []
  };

  $(".smg-table tbody tr").each((_, tr) => {
    const tds = $(tr).find("td");
    if (tds.length === 5) {
      game.odds.push({
        prize: text($(tds[0])),
        total: text($(tds[1])),
        claimed: text($(tds[2])),
        remaining: text($(tds[3])),
        percent_remaining: text($(tds[4]))
      });
    }
  });

  const totals = $(".smg-table tfoot tr td");
  if (totals.length === 5) {
    game.odds_totals = {
      total: text($(totals[1])),
      claimed: text($(totals[2])),
      remaining: text($(totals[3])),
      percent_remaining: text($(totals[4]))
    };
  }

  return game;
}

(async () => {
  const urls = await getScratchUrls();
  const results = [];

  for (const url of urls) {
    console.log("Scraping:", url);
    try {
      results.push(await parseGame(url));
      await sleep(5000 + Math.random() * 5000);
    } catch (e) {
      console.error("Failed:", url, e.message);
    }
  }

  fs.writeFileSync("scratch-games.json", JSON.stringify(results, null, 2));
})();
