import leaflet from "leaflet";
import luck from "./luck.ts";
import { Board, Cell } from "./board.ts";
// import { PlayerManager } from "./PlayerManager.ts";

interface Momento<T> {
  toMomento(): T;
  fromMomento(momento: T): void;
}

export class Coin implements Momento<string> {
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

export class Cache implements Momento<string> {
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

export class CacheManager {
  current_caches: Cache[] = [];
  momento_map = new Map<string, string>();
  cache_functions: ((arg0: Cache) => void)[] = [];

  constructor(
    collectFunc: (arg0: Cache) => void,
    depositFunc: (arg0: Cache) => void,
  ) {
    this.cache_functions.push(collectFunc);
    this.cache_functions.push(depositFunc);
  }

  clearCaches() {
    for (const cache of this.current_caches) {
      this.saveCache(cache);
    }
    this.current_caches = [];
  }

  setMomentoMap(new_map: Map<string, string>) {
    this.momento_map = new_map;
  }

  saveCache(cache: Cache) {
    this.momento_map.set(`${cache.lat}_${cache.lng}`, cache.toMomento());
  }

  //Cache spawner
  spawnCache(map: leaflet.Map, board: Board, cell: Cell) {
    const coins_length = Math.floor(
      luck([cell.x, cell.y, "initialValue"].toString()) * 100,
    );
    const new_cache = new Cache(cell.x, cell.y, coins_length);
    if (this.momento_map.has(`${cell.x}_${cell.y}`)) {
      new_cache.fromMomento(this.momento_map.get(`${cell.x}_${cell.y}`)!);
    } else {
      this.saveCache(new_cache);
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
        this.cache_functions[0](new_cache);
        popup_div.querySelector<HTMLSpanElement>("#value")!.innerHTML =
          new_cache
            .coins.toString();
      });
      deposit_button.addEventListener("click", () => {
        this.cache_functions[1](new_cache);
        popup_div.querySelector<HTMLSpanElement>("#value")!.innerHTML =
          new_cache
            .coins.toString();
      });

      return popup_div;
    });
    this.current_caches.push(new_cache);
  }

  generateCaches(map: leaflet.Map, board: Board) {
    //instead of looping through x and y, we loop through the visible cells
    const nearby_cells = board.getCellsNearPoint(map.getCenter());
    nearby_cells.forEach((cell) => {
      if (cell.has_cache) {
        this.spawnCache(map, board, cell);
      }
    });
  }

  reset() {
    this.current_caches = [];
    this.momento_map = new Map<string, string>();
  }
}
