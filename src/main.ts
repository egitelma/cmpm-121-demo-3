//@deno-types="npm:@types/leaflet@^1.9.14"
import leaflet from "leaflet";
import "leaflet/dist/leaflet.css";
import "./style.css";
import "./leafletWorkaround.ts";
import { Board } from "./board.ts";
import { Cache, CacheManager, Coin } from "./CacheManager.ts";
import { SaveManager } from "./SaveManager.ts";
import { PlayerManager } from "./PlayerManager.ts";
import { MapUI } from "./MapUI.ts";

//Constants
const OAKES_CLASSROOM = leaflet.latLng(36.9894981, -122.0627251);
const GAMEPLAY_ZOOM_LEVEL = 18;
const MAX_ZOOM_LEVEL = 19; //Leaflet bugs out at 20
const TILE_DEGREES = 1e-4;
const NEIGHBORHOOD_SIZE = 8;

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
  player_manager.movePlayer(map, new_location, map_ui, cache_manager, board);
});
map.on("locationerror", () => {
  console.log("Unable to geolocate...");
});

const board = new Board(TILE_DEGREES, NEIGHBORHOOD_SIZE);

function collectCoin(cache: Cache) {
  if (cache.coins > 0) {
    cache.coins--;
    player_manager.addCoin(
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
  const popped_coin = player_manager.removeCoin();
  if (popped_coin) {
    cache.coins++;
    updateCoinCounter(cache);
  } else {
    return false;
  }
}

//Setup external managers
const save_manager = new SaveManager();
const player_manager = new PlayerManager(
  OAKES_CLASSROOM,
  board.getCellForPoint(OAKES_CLASSROOM),
);
const cache_manager = new CacheManager(collectCoin, depositCoin);
const map_ui = new MapUI(map, OAKES_CLASSROOM);

//I wasn't sure if any of these were unnecessary, so I transferred them all over from example.ts.
leaflet.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
  maxZoom: GAMEPLAY_ZOOM_LEVEL,
  attribution:
    '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
}).addTo(map);

//UI Setup - should I also move this to another file, maybe??
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
  save_manager.saveGame(map, player_manager.coins, cache_manager.momento_map);
});

const reset_btn = document.createElement("button");
reset_btn.innerHTML = "🚮";
status_panel.append(reset_btn);
reset_btn.addEventListener("click", () => {
  const response = confirm("Are you sure?");
  if (response) {
    resetGame();
  }
});

//Load the game from a save file, or set up the default settings if not
createArrows();
save_manager.loadGame(map, player_manager, cache_manager, map_ui, board);
updateCoinCounter();

//~~General Functions~~
function updateCoinCounter(cache: Cache | null = null) {
  //Update cache momento
  if (cache) {
    cache_manager.saveCache(cache);
  }
  //Update visual counter
  coin_counter.innerHTML = `${player_manager.coins.length} coins collected.`;
  if (player_manager.coins.length > 0) {
    const top_coin = player_manager.coins[player_manager.coins.length - 1];
    coin_counter.innerHTML += ` Most recent coin: ${top_coin.toString()}`;
  }
}

function createArrows(): HTMLButtonElement[] { //i know this is very ugly so i put it in its own function
  const arrows: HTMLButtonElement[] = [];
  const left_arrow = document.createElement("button");
  left_arrow.innerHTML = "⬅️";
  left_arrow.addEventListener("click", () => {
    const new_location = arrowPress(-TILE_DEGREES, "x");
    player_manager.movePlayer(map, new_location, map_ui, cache_manager, board);
  });
  status_panel.append(left_arrow);
  arrows.push(left_arrow);

  const right_arrow = document.createElement("button");
  right_arrow.innerHTML = "➡️";
  right_arrow.addEventListener("click", () => {
    const new_location = arrowPress(TILE_DEGREES, "x");
    player_manager.movePlayer(map, new_location, map_ui, cache_manager, board);
  });
  status_panel.append(right_arrow);
  arrows.push(right_arrow);

  const up_arrow = document.createElement("button");
  up_arrow.innerHTML = "⬆️";
  up_arrow.addEventListener("click", () => {
    const new_location = arrowPress(TILE_DEGREES + 0.0000009, "y");
    player_manager.movePlayer(map, new_location, map_ui, cache_manager, board);
  });
  status_panel.append(up_arrow);
  arrows.push(up_arrow);

  const down_arrow = document.createElement("button");
  down_arrow.innerHTML = "⬇️";
  down_arrow.addEventListener("click", () => {
    const new_location = arrowPress(-TILE_DEGREES - 0.0000009, "y");
    player_manager.movePlayer(map, new_location, map_ui, cache_manager, board);
  });
  status_panel.append(down_arrow);
  arrows.push(down_arrow);

  return arrows;
}

function arrowPress(direction: number, axis: string) {
  const new_location = new leaflet.LatLng(
    player_manager.position.lat,
    player_manager.position.lng,
  );
  if (axis == "x") {
    new_location.lng += direction;
  } else if (axis == "y") {
    new_location.lat += direction;
  }
  return new_location;
}

function resetGame() {
  //Clear all info and move the player to Oakes Classroom (the default location)
  cache_manager.reset();
  player_manager.reset();
  player_manager.movePlayer(map, OAKES_CLASSROOM, map_ui, cache_manager, board); //okay this is a little ridiculous
  map_ui.reset(map);

  updateCoinCounter();
}
