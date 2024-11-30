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
const NEIGHBORHOOD_SIZE = 8;
const SAVE_KEY = "map_save";

const map = leaflet.map(document.getElementById("map")!, {
  center: OAKES_CLASSROOM,
  zoom: GAMEPLAY_ZOOM_LEVEL,
  minZoom: 1,
  maxZoom: MAX_ZOOM_LEVEL,
  zoomControl: false,
  scrollWheelZoom: false,
});
map.on("locationfound", () => {
  const new_location = map.getCenter();
  movePlayer(new_location);
});
map.on("locationerror", () => {
  console.log("Unable to geolocate...");
});

const player_marker = leaflet.marker(OAKES_CLASSROOM);
let cache_array: Cache[] = []; //current caches
let momento_map = new Map<string, string>(); //Momentos - map x,y pairs to momentos (${x}_${y} as a key format)
const board = new Board(TILE_DEGREES, NEIGHBORHOOD_SIZE);
const player = {
  position: OAKES_CLASSROOM,
  cell: board.getCellForPoint(OAKES_CLASSROOM),
};

//~~INTERFACES & CLASSES~~

interface Momento<T> {
  toMomento(): T;
  fromMomento(momento: T): void;
}

class Coin implements Momento<string> {
  lat: number;
  lng: number;
  serial: number;

  constructor(x: number, y: number, serial: number) {
    this.lat = x;
    this.lng = y;
    this.serial = serial;
  }

  toMomento(): string {
    return `${this.lat},${this.lng},${this.serial}`;
  }

  fromMomento(momento: string): void {
    const info = momento.split(",");
    this.lat = parseInt(info[0]);
    this.lng = parseInt(info[1]);
    this.serial = parseInt(info[2]);
  }

  toString(): string {
    return `${this.lat}:${this.lng}#${this.serial}`;
  }
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
    return `${this.coins}`;
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

let player_coins: Coin[] = [];
const status_panel = document.querySelector<HTMLDivElement>("#statusPanel")!;
const coin_counter = document.createElement("p");
coin_counter.innerHTML = "0 coins collected";
coin_counter.id = "coin_counter";
status_panel.append(coin_counter);

const geolocate_btn = document.createElement("button");
geolocate_btn.innerHTML = "🌐";
geolocate_btn.id = "geolocator";
status_panel.append(geolocate_btn);
geolocate_btn.addEventListener("click", () => {
  map.locate({ setView: true, maxZoom: GAMEPLAY_ZOOM_LEVEL });
});

const save_btn = document.createElement("button");
save_btn.innerHTML = "Save";
status_panel.append(save_btn);
save_btn.addEventListener("click", () => {
  saveGame();
});

const reset_btn = document.createElement("button");
reset_btn.innerHTML = "🚮";
status_panel.append(reset_btn);
reset_btn.addEventListener("click", () => {
  resetGame();
});

//Load the game from a save file, or set up the default settings if not
loadGame();
createArrows();

//~~FUNCTIONS BELOW~~
//Cache spawner
function spawnCache(cell: Cell) {
  const coins_length = Math.floor(
    luck([cell.x, cell.y, "initialValue"].toString()) * 100,
  );
  const new_cache = new Cache(cell.x, cell.y, coins_length);
  if (momento_map.has(`${cell.x}_${cell.y}`)) {
    new_cache.fromMomento(momento_map.get(`${cell.x}_${cell.y}`)!);
  } else {
    momento_map.set(`${cell.x}_${cell.y}`, new_cache.toMomento());
  }

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
      collectCoin(new_cache);
      popup_div.querySelector<HTMLSpanElement>("#value")!.innerHTML = new_cache
        .coins.toString();
    });
    deposit_button.addEventListener("click", () => {
      depositCoin(new_cache);
      popup_div.querySelector<HTMLSpanElement>("#value")!.innerHTML = new_cache
        .coins.toString();
    });

    return popup_div;
  });
  cache_array.push(new_cache);
}

function collectCoin(cache: Cache) {
  if (cache.coins > 0) {
    cache.coins--;
    player_coins.push(
      new Coin(
        cache.lat,
        cache.lng,
        cache.coins,
      ),
    );
    updateCoinCounter(cache);
  } else {
    return false;
  }
}

function depositCoin(cache: Cache) {
  const popped_coin = player_coins.pop();
  if (popped_coin) {
    cache.coins++;
    updateCoinCounter(cache);
  } else {
    return false;
  }
}

function updateCoinCounter(cache: Cache | null = null) {
  //Update cache momento
  if (cache) {
    momento_map.set(`${cache.lat}_${cache.lng}`, cache.toMomento());
  }
  //Update visual counter
  coin_counter.innerHTML = `${player_coins.length} coins collected.`;
  if (player_coins.length > 0) {
    const top_coin = player_coins[player_coins.length - 1];
    coin_counter.innerHTML += ` Most recent coin: ${top_coin.toString()}`;
  }
}

//Actually spawn caches
function generateCaches() {
  //instead of looping through x and y, we loop through the visible cells
  const nearby_cells = board.getCellsNearPoint(map.getCenter());
  nearby_cells.forEach((cell) => {
    if (cell.has_cache) {
      spawnCache(cell);
    }
  });
}

function createArrows(): HTMLButtonElement[] { //i know this is very ugly so i put it in its own function
  const arrows: HTMLButtonElement[] = [];
  const left_arrow = document.createElement("button");
  left_arrow.innerHTML = "⬅️";
  left_arrow.addEventListener("click", () => {
    const new_location = arrowPress(-TILE_DEGREES, "x");
    movePlayer(new_location);
  });
  status_panel.append(left_arrow);
  arrows.push(left_arrow);

  const right_arrow = document.createElement("button");
  right_arrow.innerHTML = "➡️";
  right_arrow.addEventListener("click", () => {
    const new_location = arrowPress(TILE_DEGREES, "x");
    movePlayer(new_location);
  });
  status_panel.append(right_arrow);
  arrows.push(right_arrow);

  const up_arrow = document.createElement("button");
  up_arrow.innerHTML = "⬆️";
  up_arrow.addEventListener("click", () => {
    const new_location = arrowPress(TILE_DEGREES + 0.0000009, "y");
    movePlayer(new_location);
  });
  status_panel.append(up_arrow);
  arrows.push(up_arrow);

  const down_arrow = document.createElement("button");
  down_arrow.innerHTML = "⬇️";
  down_arrow.addEventListener("click", () => {
    const new_location = arrowPress(-TILE_DEGREES - 0.0000009, "y");
    movePlayer(new_location);
  });
  status_panel.append(down_arrow);
  arrows.push(down_arrow);

  return arrows;
}

function arrowPress(direction: number, axis: string) {
  const new_location = player.position;
  if (axis == "x") {
    new_location.lng += direction;
  } else if (axis == "y") {
    new_location.lat += direction;
  }
  return new_location;
}

function movePlayer(new_location: leaflet.LatLng) {
  map.panTo(new_location);
  player.position = new_location;
  player_marker.setLatLng(new_location);
  resetCells();
}

function resetCells() {
  //clear all caches, and restore based on our new location
  for (const cache of cache_array) {
    momento_map.set(`${cache.lat}_${cache.lng}`, cache.toMomento());
  }
  cache_array = [];

  //thx to Jackie Sanchez for helping me out with this!
  //[clearing the Leaflet rectangles from the map]
  map.eachLayer((layer) => {
    if (layer instanceof leaflet.Rectangle) {
      map.removeLayer(layer);
    }
  });

  generateCaches();
}

function saveGame() {
  //to save: player coins, momentos, and location
  const save_data = {
    player_info: {
      location: map.getCenter(),
      coins: simplifyCoins(player_coins),
    },
    momentos: mapToArray(momento_map),
  };
  localStorage.setItem(SAVE_KEY, JSON.stringify(save_data));
}

function loadGame() {
  const load_data = localStorage.getItem(SAVE_KEY);
  if (load_data) {
    const parsed = JSON.parse(load_data);
    arrayToMap(parsed.momentos);
    movePlayer(parsed.player_info.location);
    player_coins = coinToObject(parsed.player_info.coins);
    updateCoinCounter();
  } else {
    generateCaches();
  }
}

function mapToArray(given_map: Map<string, string>) { //JSON takes issue with parsing a Map.
  const return_array: string[] = [];
  given_map.forEach((value, key) => {
    return_array.push(`${key}:${value}`);
  });
  return return_array;
}

function arrayToMap(given_array: string[]) {
  momento_map = new Map<string, string>();
  for (const str of given_array) {
    const info: string[] = str.split(":");
    momento_map.set(info[0], info[1]);
  }
}

function simplifyCoins(player_coins: Coin[]) { //Makes the player_coins array JSON-friendly.
  const coin_array: string[] = [];
  for (const coin of player_coins) {
    coin_array.push(coin.toMomento());
  }
  return coin_array;
}

function coinToObject(load_coins: string[]) {
  const coin_array: Coin[] = [];
  let new_coin;
  for (const coin_momento of load_coins) {
    new_coin = new Coin(0, 0, 0);
    new_coin.fromMomento(coin_momento);
    coin_array.push(new_coin);
  }
  return coin_array;
}

function resetGame() {
  //Clear the momento map, coins, and move the player to Oakes Classroom (the default location)
  cache_array = [];
  momento_map = new Map<string, string>();
  player_coins = [];
  movePlayer(OAKES_CLASSROOM);
  updateCoinCounter();
}
