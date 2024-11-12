//@deno-types="npm:@types/leaflet@^1.9.14"
import leaflet from "leaflet";
import "leaflet/dist/leaflet.css";
import "./style.css";
import "./leafletWorkaround.ts";
import luck from "./luck.ts";

//Constants
const OAKES_CLASSROOM = leaflet.latLng(36.9894981, -122.0627251);
const GAMEPLAY_ZOOM_LEVEL = 18;
const TILE_DEGREES = 1e-4; //"Use a latitude–longitude grid where cells are 0.0001 degrees wide."
const CACHE_SPAWN_PROBABILITY = 0.1; //"Place a cache at about 10% of the grid cells..."
const NEIGHBORHOOD_SIZE = 8; //"...that are within 8 cell-steps away from the player’s current location."
const map = leaflet.map(document.getElementById("map")!, {
  center: OAKES_CLASSROOM,
  zoom: GAMEPLAY_ZOOM_LEVEL,
  minZoom: GAMEPLAY_ZOOM_LEVEL,
  maxZoom: GAMEPLAY_ZOOM_LEVEL,
  zoomControl: false,
  scrollWheelZoom: false,
});
const player_marker = leaflet.marker(OAKES_CLASSROOM);
const cache_array: Cache[] = [];

interface Cache {
  lat: number;
  lng: number;
  coins: number;
}

//I wasn't sure if any of these were unnecessary, so I transferred them all over from example.ts.
leaflet.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
  maxZoom: GAMEPLAY_ZOOM_LEVEL,
  attribution:
    '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
}).addTo(map);

player_marker.bindPopup("Player location").openPopup(); //The example.ts used tooltip, so I wanted to try popups
player_marker.addTo(map);

let player_coins = 0;
const status_panel = document.querySelector<HTMLDivElement>("#statusPanel")!;
status_panel.innerHTML = "0 coins collected";

//Cache spawner
//It just passes some bounds for the cache's location, places it, and binds a popup.
//I prefer to use x and y when referring to values on a 2D plane, for clarity.
function spawnCache(x: number, y: number) {
  const new_cache: Cache = {
    lat: x,
    lng: y,
    coins: Math.floor(luck([x, y, "initialValue"].toString()) * 100),
  };
  const origin = OAKES_CLASSROOM;
  const bounds = leaflet.latLngBounds([
    [origin.lat + x * TILE_DEGREES, origin.lng + y * TILE_DEGREES],
    [origin.lat + (x + 1) * TILE_DEGREES, origin.lng + (y + 1) * TILE_DEGREES],
  ]);

  //Cache marker
  const cache_rect = leaflet.rectangle(bounds);
  cache_rect.addTo(map);

  //Create popup for the cache
  cache_rect.bindPopup(() => {
    const popup_div = document.createElement("div");
    popup_div.innerHTML =
      `This is a cache at (${x},${y}), currently containing <span id="value">${new_cache.coins}</span> coins.`;
    const collect_button = document.createElement("button");
    const deposit_button = document.createElement("button");
    collect_button.innerHTML = `Take a coin`;
    deposit_button.innerHTML = `Deposit a coin`;
    popup_div.append(collect_button);
    popup_div.append(deposit_button);

    //Bind click events
    collect_button.addEventListener("click", () => {
      popup_div.querySelector<HTMLSpanElement>("#value")!.innerHTML = new_cache
        .coins.toString();
      collectCoin(new_cache, status_panel);
    });
    deposit_button.addEventListener("click", () => {
      popup_div.querySelector<HTMLSpanElement>("#value")!.innerHTML = new_cache
        .coins.toString();
      depositCoin(new_cache, status_panel);
    });

    return popup_div;
  });
  cache_array.push(new_cache);
}

function collectCoin(cache: Cache, status_panel: HTMLDivElement) {
  if (cache.coins > 0) {
    cache.coins--;
    player_coins++;
    status_panel.innerHTML = `${player_coins} coins collected`;
  } else {
    return false;
  }
}

function depositCoin(cache: Cache, status_panel: HTMLDivElement) {
  if (player_coins > 0) {
    player_coins--;
    cache.coins++;
    status_panel.innerHTML = `${player_coins} coins collected`;
  } else {
    return false;
  }
}

//Actually spawn caches
function generateCaches() {
  for (let x = -NEIGHBORHOOD_SIZE; x < NEIGHBORHOOD_SIZE; x++) {
    for (let y = -NEIGHBORHOOD_SIZE; y < NEIGHBORHOOD_SIZE; y++) {
      if (luck([x, y].toString()) < CACHE_SPAWN_PROBABILITY) {
        spawnCache(x, y);
      }
    }
  }
}

generateCaches();
