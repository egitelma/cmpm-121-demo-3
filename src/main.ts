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
// let player_position = OAKES_CLASSROOM;

interface Coin {
  lat: number;
  lng: number;
  serial: number;
}

interface Momento<T> {
  toMomento(): T;
  fromMomento(momento: T): void;
}

class Cache implements Momento<string> {
  lat: number;
  lng: number;
  coins: number;
  constructor(x: number, y: number, coins_num: number) {
    this.lat = x;
    this.lng = y;
    this.coins = coins_num;
  }
  toMomento(): string {
    return this.coins.toString();
  }
  fromMomento(momento: string): void {
    this.coins = parseInt(momento);
  }
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
  const new_cache = new Cache(cell.x, cell.y, coins_length);
  const bounds = board.getCellBounds(cell);

  //Cache marker
  const cache_rect = leaflet.rectangle(bounds);
  cache_rect.addTo(map);

  //Create popup for the cache
  cache_rect.bindPopup(() => {
    const popup_div = document.createElement("div");
    popup_div.innerHTML =
      `This is a cache at (${cell.x},${cell.y}), currently containing <span id="value">${new_cache.coins}</span> coins.`;
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
        .coins.toString();
    });
    deposit_button.addEventListener("click", () => {
      depositCoin(new_cache, status_panel);
      popup_div.querySelector<HTMLSpanElement>("#value")!.innerHTML = new_cache
        .coins.toString();
    });

    return popup_div;
  });
  cache_array.push(new_cache);
}

function collectCoin(cache: Cache, status_panel: HTMLDivElement) {
  // const popped_coin = cache.coins.pop();
  if (cache.coins > 0) {
    //still a way to display the serial, even if it isn't perfect. Not sure if we're meant to have the same serial setup in this step.
    const new_coin = {
      lat: cache.lat,
      lng: cache.lng,
      serial: cache.coins,
    };
    player_coins.push(new_coin);
    status_panel.innerHTML =
      `${player_coins.length} coins collected. Most recent coin: ${new_coin.lat}:${new_coin.lng}#${new_coin.serial}`;
  } else {
    return false;
  }
}

function depositCoin(cache: Cache, status_panel: HTMLDivElement) {
  const popped_coin = player_coins.pop();
  if (popped_coin) {
    cache.coins++;
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

// function createArrows(){

// }

// function move(direction : string){
generateCaches();
// }
// createArrows()
