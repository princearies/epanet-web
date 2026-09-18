"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { HydraulicModel } from "src/hydraulic-model";
import type { FeatureCollection } from "geojson";

type LeafletPreviewProps = {
  hydraulicModel: HydraulicModel;
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

  useEffect(() => {
    if (!elementRef.current || mapRef.current) return;

    const map = L.map(elementRef.current, {
      zoomControl: true,
      attributionControl: true,
      preferCanvas: true,
    }).setView([DEFAULT_CENTER[1], DEFAULT_CENTER[0]], 15.5);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OpenStreetMap contributors",
      maxZoom: 19,
    }).addTo(map);

    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

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
    <div ref={elementRef} className="w-full h-full" data-testid="leaflet-map" />
  );
}

const DEFAULT_CENTER: [number, number] = [-4.3800042, 55.914314];
