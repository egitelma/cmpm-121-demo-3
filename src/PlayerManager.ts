import leaflet from "leaflet";
import { Board, Cell } from "./board.ts";
import { Coin } from "./CacheManager.ts";
import { MapUI } from "./MapUI.ts";
import { CacheManager } from "./CacheManager.ts";

export class PlayerManager {
  private default_location: leaflet.LatLng;
  movement_history: leaflet.LatLng[] = [];
  position: leaflet.LatLng;
  cell: Cell;
  coins: Coin[] = [];

  constructor(initial_position: leaflet.LatLng, initial_cell: Cell) {
    this.default_location = this.position = initial_position;
    this.cell = initial_cell;
  }

  movePlayer(
    map: leaflet.Map,
    new_location: leaflet.LatLng,
    map_ui: MapUI,
    cache_manager: CacheManager,
    board: Board,
  ) {
    this.movement_history.push(new_location);
    map.panTo(new_location);
    this.position = new_location;

    //Map manager
    map_ui.clearRect(map);
    map_ui.clearPolyline(map);
    map_ui.moveMarker(new_location);
    map_ui.drawPolyline(map, this.movement_history);

    //Cache manager
    cache_manager.clearCaches();
    cache_manager.generateCaches(map, board);
  }

  reset() {
    this.coins = [];
    this.movement_history = [];
    this.position = this.default_location;
  }

  addCoin(new_coin: Coin) {
    this.coins.push(new_coin);
  }

  removeCoin() {
    return this.coins.pop();
  }
}
