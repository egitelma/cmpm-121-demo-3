import { Coin } from "./CacheManager.ts";
import { GameManager } from "./main.ts";

export class SaveManager {
  private SAVE_KEY = "map_save";
  constructor() {
  }

  saveGame(
    game_manager: GameManager,
  ) {
    //to save: player coins, momentos, and location
    const save_data = {
      player_info: {
        location: game_manager.map.getCenter(),
        coins: this.simplifyCoins(game_manager.player_manager.coins),
      },
      momentos: this.mapToArray(game_manager.cache_manager.momento_map),
    };
    localStorage.setItem(this.SAVE_KEY, JSON.stringify(save_data));
  }

  loadGame(
    game_manager: GameManager,
  ) {
    const load_data = localStorage.getItem(this.SAVE_KEY);
    if (load_data) {
      const parsed = JSON.parse(load_data);
      game_manager.cache_manager.setMomentoMap(
        this.arrayToMap(parsed.momentos),
      );
      game_manager.player_manager.movePlayer(
        game_manager,
        parsed.player_info.location,
      );
      game_manager.player_manager.coins = this.coinToObject(
        parsed.player_info.coins,
      );
      game_manager.ui_manager.updateCoinCounter(null, game_manager);
    } else {
      game_manager.cache_manager.generateCaches(game_manager);
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
