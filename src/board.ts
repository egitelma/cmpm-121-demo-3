import leaflet from "leaflet";
import luck from "./luck.ts";

const CACHE_SPAWN_PROBABILITY = 0.1;

//I took the template for this from the slides!

export interface Cell { //using x,y for consistency
  x: number;
  y: number;
  has_cache: boolean;
}

export class Board {
  readonly tile_width: number;
  readonly tile_visibility_radius: number;

  private readonly known_cells: Map<string, Cell>;

  constructor(tileWidth: number, tileVisibilityRadius: number) {
    this.tile_width = tileWidth;
    this.tile_visibility_radius = tileVisibilityRadius;
    this.known_cells = new Map();
  }

  //Create a cell, if it does not already exist; else return the cell at x,y
  private getCanonicalCell(x: number, y: number): Cell {
    const key = [x, y].toString();
    if (!this.known_cells.has(key)) {
      let has_cache = false;
      if (luck([x, y].toString()) < CACHE_SPAWN_PROBABILITY) {
        has_cache = true;
      }
      this.known_cells.set(key, { x, y, has_cache });
    } //Otherwise, do nothing, and get will return undefined
    return this.known_cells.get(key)!;
  }

  getCellForPoint(point: leaflet.LatLng): Cell {
    const x = Math.floor(point.lat / this.tile_width);
    const y = Math.floor(point.lng / this.tile_width);
    return this.getCanonicalCell(x, y);
  }

  getCellBounds(cell: Cell): leaflet.LatLngBounds {
    return leaflet.latLngBounds([
      [cell.x * this.tile_width, cell.y * this.tile_width],
      [(cell.x + 1) * this.tile_width, (cell.y + 1) * this.tile_width],
    ]);
  }

  getCellsNearPoint(point: leaflet.LatLng): Cell[] {
    const result_cells: Cell[] = [];
    const origin_cell = this.getCellForPoint(point);
    //Uses tileVisibilityRadius to get the cells we can see from the origin
    for (
      let tile_x = -this.tile_visibility_radius;
      tile_x < this.tile_visibility_radius;
      tile_x++
    ) {
      for (
        let tile_y = -this.tile_visibility_radius;
        tile_y < this.tile_visibility_radius;
        tile_y++
      ) {
        result_cells.push(this.getCanonicalCell(
          origin_cell.x + tile_x,
          origin_cell.y + tile_y,
        ));
      }
    }
    return result_cells;
  }
}
