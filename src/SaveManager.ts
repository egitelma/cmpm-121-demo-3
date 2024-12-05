import leaflet from "leaflet";
import { Coin } from "./CacheManager.ts";
import { PlayerManager } from "./PlayerManager.ts";
import { CacheManager } from "./CacheManager.ts";
import { MapUI } from "./MapUI.ts";
import { Board } from "./board.ts";

export class SaveManager {
  private SAVE_KEY = "map_save";
  constructor() {
  }

  saveGame(
    map: leaflet.Map,
    player_coins: Coin[],
    momento_map: Map<string, string>,
  ) {
    //to save: player coins, momentos, and location
    const save_data = {
      player_info: {
        location: map.getCenter(),
        coins: this.simplifyCoins(player_coins),
      },
      momentos: this.mapToArray(momento_map),
    };
    localStorage.setItem(this.SAVE_KEY, JSON.stringify(save_data));
  }

  loadGame(
    map: leaflet.Map,
    player_manager: PlayerManager,
    cache_manager: CacheManager,
    map_ui: MapUI,
    board: Board,
  ) {
    const load_data = localStorage.getItem(this.SAVE_KEY);
    if (load_data) {
      const parsed = JSON.parse(load_data);
      cache_manager.setMomentoMap(this.arrayToMap(parsed.momentos));
      player_manager.movePlayer(
        map,
        parsed.player_info.location,
        map_ui,
        cache_manager,
        board,
      );
      player_manager.coins = this.coinToObject(parsed.player_info.coins);
    } else {
      cache_manager.generateCaches(map, board);
    }
  }

  mapToArray(given_map: Map<string, string>) { //JSON takes issue with parsing a Map.
    const return_array: string[] = [];
    given_map.forEach((value, key) => {
      return_array.push(`${key}:${value}`);
    });
    return return_array;
  }

  arrayToMap(given_array: string[]) {
    const momento_map = new Map<string, string>();
    for (const str of given_array) {
      const info: string[] = str.split(":");
      momento_map.set(info[0], info[1]);
    }
    return momento_map;
  }

  simplifyCoins(player_coins: Coin[]) { //Makes the player_coins array JSON-friendly.
    const coin_array: string[] = [];
    for (const coin of player_coins) {
      coin_array.push(coin.toMomento());
    }
    return coin_array;
  }

  coinToObject(load_coins: string[]) {
    const coin_array: Coin[] = [];
    let new_coin;
    for (const coin_momento of load_coins) {
      new_coin = new Coin(0, 0, 0);
      new_coin.fromMomento(coin_momento);
      coin_array.push(new_coin);
    }
    return coin_array;
  }
}
