import leaflet from "leaflet";
import luck from "./luck.ts";
import { Cell } from "./board.ts";
import { GameManager } from "./main.ts";

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
  spawnCache(game_manager: GameManager, cell: Cell) {
    const coins_length = Math.floor(
      luck([cell.x, cell.y, "initialValue"].toString()) * 100,
    );
    const new_cache = new Cache(cell.x, cell.y, coins_length);
    if (this.momento_map.has(`${cell.x}_${cell.y}`)) {
      new_cache.fromMomento(this.momento_map.get(`${cell.x}_${cell.y}`)!);
    } else {
      this.saveCache(new_cache);
    }

    const bounds = game_manager.board.getCellBounds(cell);

    //Cache marker
    const cache_rect = leaflet.rectangle(bounds);
    cache_rect.addTo(game_manager.map);

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
        this.collectCoin(game_manager, new_cache);
        popup_div.querySelector<HTMLSpanElement>("#value")!.innerHTML =
          new_cache
            .coins.toString();
      });
      deposit_button.addEventListener("click", () => {
        this.depositCoin(game_manager, new_cache);
        popup_div.querySelector<HTMLSpanElement>("#value")!.innerHTML =
          new_cache
            .coins.toString();
      });

      return popup_div;
    });
    this.current_caches.push(new_cache);
  }

  generateCaches(game_manager: GameManager) {
    //instead of looping through x and y, we loop through the visible cells
    const nearby_cells = game_manager.board.getCellsNearPoint(
      game_manager.map.getCenter(),
    );
    nearby_cells.forEach((cell: Cell) => {
      if (cell.has_cache) {
        this.spawnCache(game_manager, cell);
      }
    });
  }

  reset() {
    this.current_caches = [];
    this.momento_map = new Map<string, string>();
  }

  collectCoin(game_manager: GameManager, cache: Cache) {
    if (cache.coins > 0) {
      cache.coins--;
      game_manager.player_manager.addCoin(
        new Coin(
          cache.lat,
          cache.lng,
          cache.coins,
        ),
      );
      game_manager.ui_manager.updateCoinCounter(cache, game_manager);
    } else {
      return false;
    }
  }

  depositCoin(game_manager: GameManager, cache: Cache) {
    const popped_coin = game_manager.player_manager.removeCoin();
    if (popped_coin) {
      cache.coins++;
      game_manager.ui_manager.updateCoinCounter(cache, game_manager);
    } else {
      return false;
    }
  }
}
