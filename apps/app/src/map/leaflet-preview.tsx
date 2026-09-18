"use client";

import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { HydraulicModel } from "src/hydraulic-model";
import type { FeatureCollection } from "geojson";

type LeafletPreviewProps = {
  hydraulicModel: HydraulicModel;
};

type Basemap = "dark" | "light" | "osm";

const BASEMAPS: Record<
  Basemap,
  { label: string; url: string; attribution: string; maxZoom: number }
> = {
  dark: {
    label: "Dark",
    url: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
    attribution: "&copy; OpenStreetMap contributors &copy; CARTO",
    maxZoom: 20,
  },
  light: {
    label: "Light",
    url: "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
    attribution: "&copy; OpenStreetMap contributors &copy; CARTO",
    maxZoom: 20,
  },
  osm: {
    label: "OpenStreetMap",
    url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    attribution: "&copy; OpenStreetMap contributors",
    maxZoom: 19,
  },
};

const colors: Record<string, string> = {
  pipe: "#2563eb",
  pump: "#7c3aed",
  valve: "#d97706",
  junction: "#16a34a",
  tank: "#0891b2",
  reservoir: "#dc2626",
};

export function LeafletPreview({ hydraulicModel }: LeafletPreviewProps) {
  const elementRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layerRef = useRef<L.GeoJSON | null>(null);
  const basemapRef = useRef<L.TileLayer | null>(null);
  const [basemap, setBasemap] = useState<Basemap>("dark");

  useEffect(() => {
    if (!elementRef.current || mapRef.current) return;

    const map = L.map(elementRef.current, {
      zoomControl: true,
      attributionControl: true,
      preferCanvas: true,
    }).setView([DEFAULT_CENTER[1], DEFAULT_CENTER[0]], 15.5);

    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    basemapRef.current?.removeFrom(map);
    const definition = BASEMAPS[basemap];
    basemapRef.current = L.tileLayer(definition.url, {
      attribution: definition.attribution,
      maxZoom: definition.maxZoom,
    }).addTo(map);
  }, [basemap]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    layerRef.current?.removeFrom(map);
    const features = Array.from(hydraulicModel.assets.values())
      .filter((asset) => asset.feature.properties?.visibility !== false)
      .map((asset) => ({
        type: "Feature" as const,
        id: asset.id,
        properties: { type: asset.type, label: asset.id },
        geometry: asset.feature.geometry,
      }));

    const collection: FeatureCollection = {
      type: "FeatureCollection",
      features,
    };
    const layer = L.geoJSON(collection, {
      style: (feature) => ({
        color: colors[feature?.properties?.type] ?? "#475569",
        weight: feature?.geometry.type === "LineString" ? 4 : 2,
        fillColor: colors[feature?.properties?.type] ?? "#475569",
        fillOpacity: 0.8,
        radius: 6,
      }),
      pointToLayer: (_feature, latlng) =>
        L.circleMarker(latlng, {
          radius: 6,
          weight: 2,
          color: "#ffffff",
          fillColor: colors[_feature.properties?.type] ?? "#475569",
          fillOpacity: 0.9,
        }),
      onEachFeature: (feature, featureLayer) => {
        featureLayer.bindTooltip(feature.properties?.label ?? "");
      },
    }).addTo(map);

    layerRef.current = layer;
    if (layer.getBounds().isValid())
      map.fitBounds(layer.getBounds(), { padding: [24, 24] });
  }, [hydraulicModel]);

  return (
    <div className="relative w-full h-full">
      <div
        ref={elementRef}
        className="w-full h-full"
        data-testid="leaflet-map"
      />
      <label className="absolute top-2 left-2 z-[1000] rounded bg-gray-900/95 px-2 py-1 text-xs text-gray-100 shadow">
        <span className="mr-1">Background</span>
        <select
          className="rounded border border-gray-600 bg-gray-800 px-1 py-0.5 text-gray-100"
          value={basemap}
          onChange={(event) => setBasemap(event.target.value as Basemap)}
        >
          {Object.entries(BASEMAPS).map(([value, definition]) => (
            <option key={value} value={value}>
              {definition.label}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}

const DEFAULT_CENTER: [number, number] = [-4.3800042, 55.914314];
