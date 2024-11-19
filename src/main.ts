//@deno-types="npm:@types/leaflet@^1.9.14"
import leaflet from "leaflet";
import "leaflet/dist/leaflet.css";
import "./style.css";
import "./leafletWorkaround.ts";
import luck from "./luck.ts";
import { Board, Cell } from "./board.ts";

//Constants
const OAKES_CLASSROOM = leaflet.latLng(36.9894981, -122.0627251);
// const NULL_ISLAND = leaflet.latLng(0, 0)
const GAMEPLAY_ZOOM_LEVEL = 18;
const MAX_ZOOM_LEVEL = 19; //Leaflet bugs out at 20
const TILE_DEGREES = 1e-4;
const CACHE_SPAWN_PROBABILITY = 0.1;
const NEIGHBORHOOD_SIZE = 8;

const map = leaflet.map(document.getElementById("map")!, {
  center: OAKES_CLASSROOM,
  zoom: GAMEPLAY_ZOOM_LEVEL,
  minZoom: 1,
  maxZoom: MAX_ZOOM_LEVEL,
  zoomControl: true,
  scrollWheelZoom: true,
});

const player_marker = leaflet.marker(OAKES_CLASSROOM);
const cache_array: Cache[] = [];
const board = new Board(TILE_DEGREES, NEIGHBORHOOD_SIZE);

interface Cache {
  lat: number;
  lng: number;
  coins: Coin[];
}

interface Coin {
  lat: number;
  lng: number;
  serial: number;
}

//I wasn't sure if any of these were unnecessary, so I transferred them all over from example.ts.
leaflet.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
  maxZoom: GAMEPLAY_ZOOM_LEVEL,
  attribution:
    '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
}).addTo(map);

player_marker.bindPopup("Player location").openPopup(); //The example.ts used tooltip, so I wanted to try popups
player_marker.addTo(map);

const player_coins: Coin[] = [];
const status_panel = document.querySelector<HTMLDivElement>("#statusPanel")!;
status_panel.innerHTML = "0 coins collected";

//Cache spawner
//It just passes some bounds for the cache's location, places it, and binds a popup.
//I prefer to use x and y when referring to values on a 2D plane, for clarity.
function spawnCache(cell: Cell) {
  const coins_length = Math.floor(
    luck([cell.x, cell.y, "initialValue"].toString()) * 100,
  );
  const new_cache: Cache = {
    lat: cell.x,
    lng: cell.y,
    coins: [],
  };
  for (let i = 0; i < coins_length; i++) {
    new_cache.coins.push({
      lat: cell.x,
      lng: cell.y,
      serial: i,
    });
  }
  const bounds = board.getCellBounds(cell);

  //Cache marker
  const cache_rect = leaflet.rectangle(bounds);
  cache_rect.addTo(map);

  //Create popup for the cache
  cache_rect.bindPopup(() => {
    const popup_div = document.createElement("div");
    popup_div.innerHTML =
      `This is a cache at (${cell.x},${cell.y}), currently containing <span id="value">${new_cache.coins.length}</span> coins.`;
    let top_coin = new_cache.coins[new_cache.coins.length - 1];
    popup_div.innerHTML +=
      `\nTop coin: <span id="top_coin">${top_coin.lat}:${top_coin.lng}#${top_coin.serial}</span>`;
    const collect_button = document.createElement("button");
    const deposit_button = document.createElement("button");
    collect_button.innerHTML = `Take a coin`;
    deposit_button.innerHTML = `Deposit a coin`;
    popup_div.append(collect_button);
    popup_div.append(deposit_button);

    //Bind click events
    collect_button.addEventListener("click", () => {
      collectCoin(new_cache, status_panel);
      popup_div.querySelector<HTMLSpanElement>("#value")!.innerHTML = new_cache
        .coins.length.toString();
      if (new_cache.coins.length > 0) {
        top_coin = new_cache.coins[new_cache.coins.length - 1];
        popup_div.querySelector<HTMLSpanElement>("#top_coin")!.innerHTML =
          `${top_coin.lat}:${top_coin.lng}#${top_coin.serial}`;
      } else {
        popup_div.querySelector<HTMLSpanElement>("#top_coin")!.innerHTML =
          `N/A`;
      }
    });
    deposit_button.addEventListener("click", () => {
      depositCoin(new_cache, status_panel);
      popup_div.querySelector<HTMLSpanElement>("#value")!.innerHTML = new_cache
        .coins.length.toString();
      top_coin = new_cache.coins[new_cache.coins.length - 1];
      popup_div.querySelector<HTMLSpanElement>("#top_coin")!.innerHTML =
        `${top_coin.lat}:${top_coin.lng}#${top_coin.serial}`;
    });

    return popup_div;
  });
  cache_array.push(new_cache);
}

function collectCoin(cache: Cache, status_panel: HTMLDivElement) {
  const popped_coin = cache.coins.pop();
  if (popped_coin) {
    player_coins.push(popped_coin);
    status_panel.innerHTML =
      `${player_coins.length} coins collected. Most recent coin: ${popped_coin.lat}:${popped_coin.lng}#${popped_coin.serial}`;
  } else {
    return false;
  }
}

function depositCoin(cache: Cache, status_panel: HTMLDivElement) {
  const popped_coin = player_coins.pop();
  if (popped_coin) {
    cache.coins.push(popped_coin);
    status_panel.innerHTML = `${player_coins.length} coins collected.`;
    if (player_coins.length > 0) {
      const new_top_coin = player_coins[player_coins.length - 1];
      status_panel.innerHTML +=
        ` Most recent coin: ${new_top_coin.lat}:${new_top_coin.lng}#${new_top_coin.serial}`;
    }
  } else {
    return false;
  }
}

//Actually spawn caches
function generateCaches() {
  //instead of looping through x and y, we loop through the visible cells
  const nearby_cells = board.getCellsNearPoint(OAKES_CLASSROOM);
  nearby_cells.forEach((cell) => { //Same usage of luck as before
    if (luck([cell.x, cell.y].toString()) < CACHE_SPAWN_PROBABILITY) {
      spawnCache(cell);
    }
  });
}

generateCaches();
