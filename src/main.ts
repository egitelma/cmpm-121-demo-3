//@deno-types="npm:@types/leaflet@^1.9.14"
import leaflet from "leaflet";
import "leaflet/dist/leaflet.css";
import "./style.css";
import "./leafletWorkaround.ts";
import luck from "./luck.ts";
import "./board.ts";

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
function spawnCache(x: number, y: number) {
  const coins_length = Math.floor(
    luck([x, y, "initialValue"].toString()) * 100,
  );
  const new_cache: Cache = {
    lat: x,
    lng: y,
    coins: [],
  };
  for (let i = 0; i < coins_length; i++) {
    new_cache.coins.push({
      lat: x,
      lng: y,
      serial: i,
    });
  }
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
      `This is a cache at (${x},${y}), currently containing <span id="value">${new_cache.coins.length}</span> coins.`;
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
  const popped_coin = cache.coins.pop();
  if (popped_coin) {
    player_coins.push(popped_coin);
    status_panel.innerHTML = `${player_coins} coins collected`;
  } else {
    return false;
  }
}

function depositCoin(cache: Cache, status_panel: HTMLDivElement) {
  const popped_coin = player_coins.pop();
  if (popped_coin) {
    cache.coins.push(popped_coin);
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

/**
 * Notes from Jackie
 * make cells in the neighborhood size
 * when calling a new board, you take the tile width, fed in from the main file
 * visibility radius, which is the neighborhood size, and then figure out which cells you know
 * check that it's not an already known cell, as in, you haven't already generated a cell on it
 * canonical cell just checks for that, makes sure it's not in knownCells
 *
 * getCellForPoint makes the tile for x and y/column and row
 * getCellBounds draws the rectangle in main
 * getCellsNearPoint just gets a list of cells near the point that are within the radius
 * tile degrees is just tile size
 */
