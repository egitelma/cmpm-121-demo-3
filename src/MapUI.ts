import leaflet from "leaflet";

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
