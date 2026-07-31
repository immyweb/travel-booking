'use client';

import type { ListingSummary } from '@travel-booking/core';
import 'maplibre-gl/dist/maplibre-gl.css';
import type { Dispatch, SetStateAction } from 'react';
import { useEffect, useRef, useState } from 'react';
import { Map, Marker } from 'react-map-gl/maplibre';
import type { MapRef } from 'react-map-gl/maplibre';

// No API key/account needed — see ADR-0004.
const MAP_STYLE = 'https://tiles.openfreemap.org/styles/liberty';
const SINGLE_RESULT_ZOOM = 13;
const DEFAULT_ZOOM = 11;
const BOUNDS_PADDING_PX = 48;

type SearchResultsMapProps = {
  results: ListingSummary[];
  activeId: string | null;
  onHoverChange: Dispatch<SetStateAction<string | null>>;
  getHref: (id: string) => string;
};

export function SearchResultsMap({
  results,
  activeId,
  onHoverChange,
  getHref,
}: SearchResultsMapProps) {
  const mapRef = useRef<MapRef>(null);
  const [loaded, setLoaded] = useState(false);

  // Fits the map to the current results whenever they change (a new filter,
  // page, or city) — the map never drives its own search, so this is the
  // only thing that moves the camera. Waits for `loaded` because calling
  // fitBounds/easeTo before the style has finished loading is a no-op.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !loaded || results.length === 0) return;

    if (results.length === 1) {
      const { coordinates } = results[0]!;
      map.easeTo({
        center: [coordinates.longitude, coordinates.latitude],
        zoom: SINGLE_RESULT_ZOOM,
        duration: 0,
      });
      return;
    }

    const latitudes = results.map((result) => result.coordinates.latitude);
    const longitudes = results.map((result) => result.coordinates.longitude);
    map.fitBounds(
      [
        [Math.min(...longitudes), Math.min(...latitudes)],
        [Math.max(...longitudes), Math.max(...latitudes)],
      ],
      { padding: BOUNDS_PADDING_PX, duration: 0 },
    );
  }, [results, loaded]);

  const first = results[0]?.coordinates;

  return (
    <Map
      ref={mapRef}
      onLoad={() => setLoaded(true)}
      mapStyle={MAP_STYLE}
      initialViewState={{
        longitude: first?.longitude ?? 0,
        latitude: first?.latitude ?? 0,
        zoom: results.length === 1 ? SINGLE_RESULT_ZOOM : DEFAULT_ZOOM,
      }}
      style={{ width: '100%', height: '100%' }}
    >
      {results.map((listing) => (
        <Marker
          key={listing.id}
          longitude={listing.coordinates.longitude}
          latitude={listing.coordinates.latitude}
          anchor="center"
          // Curated-sized result sets render one pin per listing with no
          // clustering, so nearby pins can overlap — lift the hovered one
          // above its neighbors so the highlight is actually visible.
          style={{ zIndex: activeId === listing.id ? 1 : 0 }}
          onClick={() => window.open(getHref(listing.id), '_blank', 'noopener,noreferrer')}
        >
          <div
            onMouseEnter={() => onHoverChange(listing.id)}
            onMouseLeave={() => onHoverChange((id) => (id === listing.id ? null : id))}
            data-active={activeId === listing.id}
            className="cursor-pointer rounded-full bg-terracotta px-2.5 py-1 text-xs font-semibold text-white shadow-md ring-2 ring-white/70 transition data-[active=true]:scale-110"
          >
            {listing.price} {listing.currency}
          </div>
        </Marker>
      ))}
    </Map>
  );
}
