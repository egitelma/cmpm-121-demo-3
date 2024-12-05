import leaflet from "leaflet";
import { Cell } from "./board.ts";
import { Coin } from "./CacheManager.ts";
import { GameManager } from "./main.ts";

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
    game_manager: GameManager,
    new_location: leaflet.LatLng,
  ) {
    this.movement_history.push(new_location);
    game_manager.map.panTo(new_location);
    this.position = new_location;

    //Map manager
    game_manager.ui_manager.map_ui.clearRect(game_manager.map);
    game_manager.ui_manager.map_ui.clearPolyline(game_manager.map);
    game_manager.ui_manager.map_ui.moveMarker(new_location);
    game_manager.ui_manager.map_ui.drawPolyline(
      game_manager.map,
      this.movement_history,
    );

    //Cache manager
    game_manager.cache_manager.clearCaches();
    game_manager.cache_manager.generateCaches(game_manager);
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

  changePosition(game_manager: GameManager, direction: number, axis: string) {
    const new_location = new leaflet.LatLng(
      this.position.lat,
      this.position.lng,
    );
    if (axis == "x") {
      new_location.lng += direction;
    } else if (axis == "y") {
      new_location.lat += direction;
    }
    this.movePlayer(game_manager, new_location);
  }
}
