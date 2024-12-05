import leaflet from "leaflet";
import { Cache } from "./CacheManager.ts";
import { GameManager } from "./main.ts";

export class UIManager {
  map_ui: MapUI;
  status_panel: HTMLElement;
  coin_counter: HTMLElement = document.createElement("p");

  constructor(
    game_manager: GameManager,
    initial_position: leaflet.LatLng,
    initial_zoom: number,
  ) {
    this.map_ui = new MapUI(game_manager.map, initial_position);
    this.status_panel = document.getElementById("statusPanel")!;

    this.createCoinCounter();
    this.createButtons(initial_zoom, game_manager);
    this.createArrows(game_manager);
  }

  addBtn(btn: HTMLButtonElement) {
    this.status_panel.append(btn);
  }

  createButtons(initial_zoom: number, game_manager: GameManager) {
    //Geolocation button
    const geolocate_btn = document.createElement("button");
    geolocate_btn.innerHTML = "🌐";
    geolocate_btn.id = "geolocator";
    geolocate_btn.addEventListener("click", () => {
      game_manager.map.locate({ setView: true, maxZoom: initial_zoom });
    });
    this.addBtn(geolocate_btn);

    //Save button
    const save_btn = document.createElement("button");
    save_btn.innerHTML = "Save";
    save_btn.addEventListener("click", () => {
      game_manager.save_manager.saveGame(game_manager);
    });
    this.addBtn(save_btn);

    //Reset button
    const reset_btn = document.createElement("button");
    reset_btn.innerHTML = "🚮";
    reset_btn.addEventListener("click", () => {
      const response = confirm("Are you sure?");
      if (response) {
        game_manager.resetGame();
      }
    });
    this.addBtn(reset_btn);
  }

  createCoinCounter() {
    this.coin_counter.innerHTML = "0 coins collected";
    this.coin_counter.id = "coin_counter";
    this.status_panel.append(this.coin_counter);
  }

  updateCoinCounter(cache: Cache | null = null, game_manager: GameManager) {
    //Update cache momento
    if (cache) {
      game_manager.cache_manager.saveCache(cache);
    }
    //Update visual counter
    const new_coins = game_manager.player_manager.coins;
    this.coin_counter.innerHTML = `${new_coins.length} coins collected.`;
    if (new_coins.length > 0) {
      const top_coin = new_coins[new_coins.length - 1];
      this.coin_counter.innerHTML +=
        ` Most recent coin: ${top_coin.toString()}`;
    }
  }

  createArrows(game_manager: GameManager) { //i know this is very ugly so i put it in its own function
    //Left arrow
    const left_arrow = document.createElement("button");
    left_arrow.innerHTML = "⬅️";
    left_arrow.addEventListener("click", () => {
      game_manager.player_manager.changePosition(
        game_manager,
        -game_manager.TILE_DEGREES,
        "x",
      );
    });
    this.addBtn(left_arrow);

    //Right arrow
    const right_arrow = document.createElement("button");
    right_arrow.innerHTML = "➡️";
    right_arrow.addEventListener("click", () => {
      game_manager.player_manager.changePosition(
        game_manager,
        game_manager.TILE_DEGREES,
        "x",
      );
    });
    this.addBtn(right_arrow);

    const up_arrow = document.createElement("button");
    up_arrow.innerHTML = "⬆️";
    up_arrow.addEventListener("click", () => {
      game_manager.player_manager.changePosition(
        game_manager,
        game_manager.TILE_DEGREES + 0.0000009,
        "y",
      );
    });
    this.addBtn(up_arrow);

    const down_arrow = document.createElement("button");
    down_arrow.innerHTML = "⬇️";
    down_arrow.addEventListener("click", () => {
      game_manager.player_manager.changePosition(
        game_manager,
        -game_manager.TILE_DEGREES - 0.0000009,
        "y",
      );
    });
    this.addBtn(down_arrow);
  }
}

export class MapUI {
  default_location: leaflet.LatLng;
  player_marker: leaflet.Marker;
  polyline: leaflet.LayerGroup;

  constructor(map: leaflet.Map, initial_position: leaflet.LatLng) {
    this.default_location = initial_position;
    this.player_marker = leaflet.marker(initial_position);
    this.polyline = leaflet.layerGroup();

    this.player_marker.bindPopup("Player location").openPopup();
    this.player_marker.addTo(map);
  }

  clearRect(map: leaflet.Map) {
    map.eachLayer((layer: leaflet.Layer) => {
      if (layer instanceof leaflet.Rectangle) {
        map.removeLayer(layer);
      }
    });
  }

  clearPolyline(map: leaflet.Map) {
    this.polyline.removeFrom(map);
  }

  drawPolyline(map: leaflet.Map, points: leaflet.LatLng[]) {
    const new_line = leaflet.polyline(points, { color: "red" });
    this.polyline.addLayer(new_line);
    this.polyline.addTo(map);
  }

  moveMarker(new_location: leaflet.LatLng) {
    this.player_marker.setLatLng(new_location);
  }

  reset(map: leaflet.Map) {
    this.clearPolyline(map);
    this.polyline = leaflet.layerGroup();
  }
}
