//@deno-types="npm:@types/leaflet@^1.9.14"
import leaflet from "leaflet";
import "leaflet/dist/leaflet.css";
import "./style.css";
import "./leafletWorkaround.ts";
import { Board } from "./board.ts";
import { CacheManager } from "./CacheManager.ts";
import { SaveManager } from "./SaveManager.ts";
import { PlayerManager } from "./PlayerManager.ts";
import { UIManager } from "./UI.ts";

export class GameManager {
  //Constants
  OAKES_CLASSROOM = leaflet.latLng(36.9894981, -122.0627251);
  GAMEPLAY_ZOOM_LEVEL = 18;
  MAX_ZOOM_LEVEL = 19; //Leaflet bugs out at 20
  TILE_DEGREES = 1e-4;
  NEIGHBORHOOD_SIZE = 8;

  map: leaflet.Map;
  board: Board;
  player_manager: PlayerManager;
  ui_manager: UIManager;
  cache_manager: CacheManager;
  save_manager: SaveManager;

  constructor() {
    //Map must be initialized here or Deno gets map
    this.map = leaflet.map(document.getElementById("map")!, {
      center: this.OAKES_CLASSROOM,
      zoom: this.GAMEPLAY_ZOOM_LEVEL,
      minZoom: 1,
      maxZoom: this.MAX_ZOOM_LEVEL,
      zoomControl: false,
      scrollWheelZoom: false,
    });
    this.setupMap();

    //Manager setup
    this.board = new Board(this.TILE_DEGREES, this.NEIGHBORHOOD_SIZE);
    this.player_manager = new PlayerManager(
      this.OAKES_CLASSROOM,
      this.board.getCellForPoint(this.OAKES_CLASSROOM),
    );
    this.cache_manager = new CacheManager();
    this.ui_manager = new UIManager(
      this,
      this.OAKES_CLASSROOM,
      this.GAMEPLAY_ZOOM_LEVEL,
    );

    //Load the game from a save file, or set up the default settings if not
    this.save_manager = new SaveManager();
    this.save_manager.loadGame(this);
  }

  setupMap() {
    //Leaflet map setup
    this.map.on("locationfound", () => {
      const new_location = this.map.getCenter();
      this.player_manager.movePlayer(this, new_location);
    });
    this.map.on("locationerror", () => {
      console.log("Unable to geolocate...");
    });
    leaflet.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: this.GAMEPLAY_ZOOM_LEVEL,
      attribution:
        '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(this.map);
  }

  setupUI() {
    this.ui_manager.createButtons(this.GAMEPLAY_ZOOM_LEVEL, this);
    this.ui_manager.updateCoinCounter(null, this);
    this.ui_manager.createArrows(this);
  }

  resetGame() {
    //Clear all info and move the player to Oakes Classroom (the default location)
    this.cache_manager.reset();
    this.player_manager.reset();
    this.player_manager.movePlayer(this, this.OAKES_CLASSROOM); //okay this is a little ridiculous
    this.ui_manager.map_ui.reset(this.map);
    this.ui_manager.updateCoinCounter(null, this);
  }
}

new GameManager();
