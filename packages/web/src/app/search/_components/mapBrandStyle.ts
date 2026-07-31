import type { Map as MapLibreMap } from 'maplibre-gl';

// Recolors the stock OpenFreeMap `liberty` style to read as part of the
// site's brand rather than a generic embedded map — see ADR-0004 for why
// the tiles/style are fetched as-is (no self-hosted style JSON) and
// restyled here at runtime instead. Chosen over a hosted custom style JSON
// via /prototype comparison of three color treatments; this is the
// "Brand Balanced" direction, with roads lightened afterward from
// azulejo-light (too heavy against the warm land fill) to a lighter tint
// of the same hue.

const WATER_FILL = ['water'];
const WATER_LINE = ['waterway_river', 'waterway_other', 'waterway_tunnel'];
const WATER_LABEL = ['water_name_point_label', 'water_name_line_label', 'waterway_line_label'];
const LANDCOVER = [
  'landcover_wood',
  'landcover_grass',
  'landcover_ice',
  'landcover_wetland',
  'landcover_sand',
  'landuse_residential',
  'landuse_pitch',
  'landuse_track',
  'landuse_cemetery',
  'landuse_hospital',
  'landuse_school',
];
const PARK_FILL = ['park'];
const PARK_LINE = ['park_outline'];
const BUILDING_FILL = ['building'];
const BUILDING_EXTRUSION = ['building-3d'];
const ROAD_MAJOR = [
  'road_motorway',
  'road_motorway_casing',
  'road_motorway_link',
  'road_motorway_link_casing',
  'road_trunk_primary',
  'road_trunk_primary_casing',
];
const ROAD_MINOR = [
  'road_secondary_tertiary',
  'road_secondary_tertiary_casing',
  'road_minor',
  'road_minor_casing',
  'road_link',
  'road_link_casing',
  'road_path_pedestrian',
  'road_service_track',
  'road_service_track_casing',
];
const BOUNDARY = ['boundary_2', 'boundary_3'];
const LABEL_PLACE = [
  'label_city',
  'label_city_capital',
  'label_town',
  'label_village',
  'label_other',
  'label_state',
  'label_country_1',
  'label_country_2',
  'label_country_3',
];
const LABEL_ROAD = ['highway-name-major', 'highway-name-minor', 'highway-name-path'];
const BACKGROUND = ['background'];

function setPaint(map: MapLibreMap, layerIds: string[], prop: string, value: unknown) {
  for (const id of layerIds) {
    if (map.getLayer(id)) map.setPaintProperty(id, prop, value);
  }
}

export function applyBrandMapStyle(map: MapLibreMap) {
  setPaint(map, BACKGROUND, 'background-color', '#fdfbf8'); // limestone
  setPaint(map, WATER_FILL, 'fill-color', '#1e3a5c'); // azulejo
  setPaint(map, WATER_LINE, 'line-color', '#1e3a5c');
  setPaint(map, WATER_LABEL, 'text-color', '#1e3a5c');
  setPaint(map, WATER_LABEL, 'text-halo-color', '#fdfbf8');
  setPaint(map, LANDCOVER, 'fill-color', '#ece3d3');
  setPaint(map, PARK_FILL, 'fill-color', '#e2ddc4');
  setPaint(map, PARK_LINE, 'line-color', '#cdbf9c');
  setPaint(map, BUILDING_FILL, 'fill-color', '#efe6d8');
  setPaint(map, BUILDING_EXTRUSION, 'fill-extrusion-color', '#efe6d8');
  setPaint(map, ROAD_MAJOR, 'line-color', '#a3bfdc'); // light tint of azulejo's hue
  setPaint(map, ROAD_MINOR, 'line-color', '#d8cdb8');
  setPaint(map, BOUNDARY, 'line-color', '#d6a144'); // gold
  setPaint(map, BOUNDARY, 'line-opacity', 0.5);
  setPaint(map, LABEL_PLACE, 'text-color', '#1e3a5c');
  setPaint(map, LABEL_PLACE, 'text-halo-color', '#fdfbf8');
  setPaint(map, LABEL_ROAD, 'text-color', 'rgba(30,58,92,0.7)');
}
