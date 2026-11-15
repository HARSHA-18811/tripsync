import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import {
  Compass,
  Eye,
  Fuel,
  Hotel,
  Layers,
  MapPin,
  Maximize2,
  Navigation,
  Pause,
  Play,
  RotateCcw,
  Sparkles,
  Utensils,
  X,
} from 'lucide-react';
import type { RoadStop, RouteOption } from '../lib/routeGenerator';
import { fmt } from '../lib/money';

interface RoadMap3DProps {
  route: RouteOption;
  currency?: string;
  onSelectStop?: (stop: RoadStop) => void;
}

const mapboxToken = (import.meta.env.VITE_MAPBOX_TOKEN as string | undefined) || '';

const TILE_LAYERS = {
  mapboxOutdoors: {
    url: mapboxToken
      ? `https://api.mapbox.com/styles/v1/mapbox/outdoors-v12/tiles/256/{z}/{x}/{y}@2x?access_token=${mapboxToken}`
      : 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}',
    maxZoom: 19,
    label: '🌲 Mapbox 3D Outdoors',
  },
  mapboxSatellite: {
    url: mapboxToken
      ? `https://api.mapbox.com/styles/v1/mapbox/satellite-streets-v12/tiles/256/{z}/{x}/{y}@2x?access_token=${mapboxToken}`
      : 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    maxZoom: 19,
    label: '🛰️ Mapbox Satellite',
  },
  mapboxNav: {
    url: mapboxToken
      ? `https://api.mapbox.com/styles/v1/mapbox/navigation-day-v1/tiles/256/{z}/{x}/{y}@2x?access_token=${mapboxToken}`
      : 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
    maxZoom: 19,
    label: '🛣️ Mapbox Highway',
  },
  topo: {
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}',
    maxZoom: 19,
    label: '🏔️ Topo Terrain',
  },
  osm: {
    url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
    maxZoom: 19,
    label: '🗺️ OpenStreet',
  },
  satellite: {
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    maxZoom: 18,
    label: '🛰️ Satellite',
  },
};

type TileThemeKey = keyof typeof TILE_LAYERS;

export function RoadMap3D({ route, currency = 'INR', onSelectStop }: RoadMap3DProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const routePolylineRef = useRef<L.Polyline | null>(null);
  const markersRef = useRef<L.Marker[]>([]);
  const carMarkerRef = useRef<L.Marker | null>(null);

  const [mapTheme, setMapTheme] = useState<TileThemeKey>(mapboxToken ? 'mapboxOutdoors' : 'topo');
  const [is3DMode, setIs3DMode] = useState<boolean>(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [activeStop, setActiveStop] = useState<RoadStop | null>(null);

  // Drive simulation states
  const [isSimulating, setIsSimulating] = useState(false);
  const [simProgress, setSimProgress] = useState(0); // 0 to 100%
  const simIntervalRef = useRef<any>(null);

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }

    const defaultCenter = route.coordinates[0] || [14.4426, 79.9865];
    const map = L.map(mapContainerRef.current, {
      center: defaultCenter,
      zoom: 7,
      zoomControl: true,
      attributionControl: false,
    });

    const conf = TILE_LAYERS[mapTheme];
    tileLayerRef.current = L.tileLayer(conf.url, {
      maxZoom: conf.maxZoom,
    }).addTo(map);

    mapInstanceRef.current = map;

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Switch Tile Layer when theme changes
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (tileLayerRef.current) {
      tileLayerRef.current.remove();
    }

    const conf = TILE_LAYERS[mapTheme];
    tileLayerRef.current = L.tileLayer(conf.url, {
      maxZoom: conf.maxZoom,
    }).addTo(map);
  }, [mapTheme]);

  // Update Polyline, Markers & Bounds when route or category changes
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !route.coordinates.length) return;

    // Clear previous polyline
    if (routePolylineRef.current) {
      routePolylineRef.current.remove();
    }

    // Clear previous markers
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    // Outer glow polyline
    L.polyline(route.coordinates, {
      color: '#6d4aff',
      weight: 8,
      opacity: 0.35,
      lineCap: 'round',
      lineJoin: 'round',
    }).addTo(map);

    // Main road polyline
    const polyline = L.polyline(route.coordinates, {
      color: '#0ea5a4',
      weight: 4.5,
      opacity: 0.95,
      dashArray: '8, 6',
      lineCap: 'round',
      lineJoin: 'round',
    }).addTo(map);

    routePolylineRef.current = polyline;

    // Filter stops
    const stopsToShow = selectedCategory === 'all'
      ? route.stops
      : route.stops.filter((s) => s.category === selectedCategory);

    // Add Stop Markers
    stopsToShow.forEach((stop) => {
      const getBg = () => {
        switch (stop.category) {
          case 'food': return 'bg-amber-500 text-white';
          case 'fuel': return 'bg-blue-600 text-white';
          case 'toll': return 'bg-slate-700 text-white';
          case 'stay': return 'bg-violet-600 text-white';
          case 'viewpoint': return 'bg-emerald-600 text-white';
          default: return 'bg-teal text-white';
        }
      };

      const getIconEmoji = () => {
        switch (stop.category) {
          case 'food': return '🍽️';
          case 'fuel': return '⛽';
          case 'toll': return '🛣️';
          case 'stay': return '🏨';
          case 'viewpoint': return '🏞️';
          default: return '📍';
        }
      };

      const customIcon = L.divIcon({
        className: 'custom-leaflet-pin',
        html: `
          <div class="custom-stop-marker ${getBg()} flex items-center justify-center w-8 h-8 rounded-full border-2 border-white shadow-lg cursor-pointer transform hover:scale-125 transition">
            <span class="text-xs leading-none">${getIconEmoji()}</span>
          </div>
        `,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      });

      const marker = L.marker(stop.coords, { icon: customIcon }).addTo(map);

      marker.on('click', () => {
        setActiveStop(stop);
        if (onSelectStop) onSelectStop(stop);
        map.flyTo(stop.coords, Math.max(map.getZoom(), 9), { duration: 0.8 });
      });

      markersRef.current.push(marker);
    });

    // Fit bounds to polyline
    const bounds = L.latLngBounds(route.coordinates);
    map.fitBounds(bounds, { padding: [50, 50] });
  }, [route, selectedCategory]);

  // Handle Simulation
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !route.coordinates.length) return;

    if (isSimulating) {
      simIntervalRef.current = setInterval(() => {
        setSimProgress((prev) => {
          if (prev >= 100) {
            setIsSimulating(false);
            return 100;
          }
          return prev + 1;
        });
      }, 150);
    } else {
      if (simIntervalRef.current) clearInterval(simIntervalRef.current);
    }

    return () => {
      if (simIntervalRef.current) clearInterval(simIntervalRef.current);
    };
  }, [isSimulating, route.coordinates]);

  // Handle 2D vs 3D mode switch: smooth Leaflet resize after CSS transition finishes
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    const timer = setTimeout(() => {
      map.invalidateSize({ pan: false });
    }, 420);

    return () => clearTimeout(timer);
  }, [is3DMode]);

  // Update Car Marker position along the route
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !route.coordinates.length) return;

    const coords = route.coordinates;
    const totalPoints = coords.length;
    const currentIdx = Math.min(
      totalPoints - 1,
      Math.floor((simProgress / 100) * (totalPoints - 1))
    );
    const pos = coords[currentIdx];

    if (!carMarkerRef.current) {
      const carIcon = L.divIcon({
        className: 'car-marker',
        html: `
          <div class="flex items-center justify-center w-10 h-10 rounded-full bg-navy text-white border-2 border-teal shadow-2xl animate-pulse">
            <span class="text-lg">🚗</span>
          </div>
        `,
        iconSize: [40, 40],
        iconAnchor: [20, 20],
      });
      carMarkerRef.current = L.marker(pos, { icon: carIcon, zIndexOffset: 1000 }).addTo(map);
    } else {
      carMarkerRef.current.setLatLng(pos);
    }

    // Auto-detect nearby stop during simulation
    const currentKm = Math.round((simProgress / 100) * route.totalDistanceKm);
    const nearby = route.stops.find((s) => Math.abs(s.distanceFromStartKm - currentKm) < 25);
    if (nearby && activeStop?.id !== nearby.id) {
      setActiveStop(nearby);
    }
  }, [simProgress, route]);

  const categories = [
    { id: 'all', label: 'All Stops', count: route.stops.length },
    { id: 'food', label: '🍽️ Restaurants', count: route.stops.filter((s) => s.category === 'food').length },
    { id: 'fuel', label: '⛽ Fuel', count: route.stops.filter((s) => s.category === 'fuel').length },
    { id: 'toll', label: '🛣️ Tolls', count: route.stops.filter((s) => s.category === 'toll').length },
    { id: 'viewpoint', label: '🏞️ Scenic', count: route.stops.filter((s) => s.category === 'viewpoint').length },
    { id: 'stay', label: '🏨 Stays', count: route.stops.filter((s) => s.category === 'stay').length },
  ];

  return (
    <div className="relative flex flex-col rounded-3xl border border-black/10 bg-white shadow-xl overflow-hidden">
      {/* Map Header Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-black/10 bg-sand/30 p-4">
        <div className="flex items-center gap-2">
          <div className="rounded-xl bg-brand/10 p-2 text-brand">
            <Navigation className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-navy flex items-center gap-1.5">
              <span>{route.title}</span>
              <span className="badge !bg-brand/10 !text-brand text-[11px]">{route.totalDistanceKm} km</span>
              {mapboxToken && (
                <span className="badge !bg-teal/15 !text-teal text-[10px] font-bold">
                  ✨ Mapbox HD Active
                </span>
              )}
            </h3>
            <p className="text-xs text-navy/60">{route.viaSummary}</p>
          </div>
        </div>

        {/* View Mode & Drive Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Map Layer Switcher */}
          <div className="flex rounded-xl bg-white border border-black/10 p-0.5 text-xs font-semibold shadow-sm">
            {(
              mapboxToken
                ? (['mapboxOutdoors', 'mapboxSatellite', 'mapboxNav', 'osm'] as const)
                : (['topo', 'osm', 'satellite'] as const)
            ).map((theme) => (
              <button
                key={theme}
                type="button"
                onClick={() => setMapTheme(theme as TileThemeKey)}
                className={`rounded-lg px-2.5 py-1 text-[11px] transition ${
                  mapTheme === theme
                    ? 'bg-navy text-white shadow-sm'
                    : 'text-navy/70 hover:text-navy hover:bg-black/5'
                }`}
                title={TILE_LAYERS[theme].label}
              >
                {TILE_LAYERS[theme].label}
              </button>
            ))}
          </div>

          {/* 2D / 3D Mode Switcher */}
          <div className="flex rounded-xl bg-white border border-black/10 p-0.5 text-xs font-semibold shadow-sm">
            <button
              type="button"
              onClick={() => setIs3DMode(false)}
              className={`rounded-lg px-2.5 py-1 text-[11px] transition flex items-center gap-1.5 ${!is3DMode
                  ? 'bg-navy text-white shadow-sm'
                  : 'text-navy/70 hover:text-navy hover:bg-black/5'
                }`}
              title="Standard flat 2D top-down map"
            >
              <span>🗺️ 2D Map</span>
            </button>
            <button
              type="button"
              onClick={() => setIs3DMode(true)}
              className={`rounded-lg px-2.5 py-1 text-[11px] transition flex items-center gap-1.5 ${is3DMode
                  ? 'bg-navy text-white shadow-sm'
                  : 'text-navy/70 hover:text-navy hover:bg-black/5'
                }`}
              title="Isometric 3D perspective terrain tilt"
            >
              <Compass className={`h-3 w-3 ${is3DMode ? 'animate-spin' : ''}`} style={{ animationDuration: '6s' }} />
              <span>3D Tilt View</span>
            </button>
          </div>

          <button
            type="button"
            onClick={() => setIsSimulating(!isSimulating)}
            className={`btn !py-1.5 !px-3 text-xs font-semibold rounded-xl transition ${isSimulating
              ? 'bg-amber-500 text-white'
              : 'bg-teal text-white hover:bg-teal/90'
              }`}
          >
            {isSimulating ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
            {isSimulating ? 'Pause Drive' : 'Drive Route'}
          </button>

          <button
            type="button"
            onClick={() => {
              setIsSimulating(false);
              setSimProgress(0);
            }}
            className="btn-ghost !p-2 text-navy/60"
            title="Reset drive simulation"
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Category Filter Bar */}
      <div className="flex items-center gap-1.5 overflow-x-auto border-b border-black/5 bg-white px-4 py-2 text-xs scrollbar-none">
        <span className="text-navy/50 font-medium mr-1 flex items-center gap-1">
          <Layers className="h-3.5 w-3.5" /> Filter:
        </span>
        {categories.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => setSelectedCategory(c.id)}
            className={`rounded-full px-2.5 py-1 text-xs font-medium transition shrink-0 ${selectedCategory === c.id
              ? 'bg-brand text-white shadow-sm'
              : 'bg-black/5 text-navy/70 hover:bg-black/10'
              }`}
          >
            {c.label} ({c.count})
          </button>
        ))}
      </div>

      {/* Map Stage */}
      <div
        className={`relative bg-sand/40 ${is3DMode ? 'map-perspective-stage-3d' : 'map-perspective-stage-2d'}`}
        style={{ height: '520px' }}
      >
        <div
          ref={mapContainerRef}
          className={`h-full w-full ${is3DMode ? 'map-3d-active' : 'map-2d-active'}`}
          style={{ minHeight: '520px' }}
        />

        {/* View Mode Floating Pill */}
        {!is3DMode ? (
          <div className="pointer-events-none absolute bottom-4 left-4 z-[400] flex items-center gap-1.5 rounded-full bg-navy/85 px-3 py-1 text-[11px] font-semibold text-white backdrop-blur shadow-lg">
            <span>🗺️ Standard 2D Highway View Active</span>
          </div>
        ) : (
          <div className="pointer-events-none absolute bottom-4 left-4 z-[400] flex items-center gap-1.5 rounded-full bg-navy/85 px-3 py-1 text-[11px] font-semibold text-white backdrop-blur shadow-lg">
            <Sparkles className="h-3 w-3 text-teal" /> 3D Road Highway View Active
          </div>
        )}

        {/* Selected Road Stop Card (Floating Overlay) */}
        {activeStop && (
          <div className="absolute right-4 top-4 z-[400] w-80 rounded-2xl border border-black/10 bg-white/95 p-4 shadow-2xl backdrop-blur animate-fade-in">
            <div className="flex items-start justify-between gap-2 border-b border-black/5 pb-2">
              <div>
                <span className="badge !bg-brand/10 !text-brand text-[10px] uppercase font-bold tracking-wide">
                  KM {activeStop.distanceFromStartKm} · Day {activeStop.day} ({activeStop.time})
                </span>
                <h4 className="mt-1 text-sm font-bold text-navy leading-snug">{activeStop.title}</h4>
                <p className="text-xs text-navy/60">{activeStop.locationName}</p>
              </div>
              <button
                type="button"
                onClick={() => setActiveStop(null)}
                className="rounded-lg p-1 text-navy/40 hover:bg-black/5 hover:text-navy"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-3 space-y-2 text-xs">
              <p className="text-navy/80">{activeStop.description}</p>

              {activeStop.recommendedMenu && (
                <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-2.5 text-amber-900">
                  <p className="font-semibold text-[11px] flex items-center gap-1 text-amber-950 mb-0.5">
                    <Utensils className="h-3 w-3 text-amber-600" /> Recommended Food:
                  </p>
                  <p className="text-xs leading-relaxed">{activeStop.recommendedMenu}</p>
                </div>
              )}

              <div className="flex items-center justify-between rounded-xl bg-sand/50 p-2.5 border border-black/5">
                <div>
                  <span className="text-[10px] text-navy/50 block">Est. Expense</span>
                  <span className="text-sm font-bold text-navy">{fmt(activeStop.estimatedCost, currency)}</span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-navy/50 block">Assigned Payer</span>
                  <span className="inline-flex items-center gap-1 font-semibold text-brand text-xs">
                    👤 {activeStop.suggestedPayerName}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Drive Simulation Progress Slider */}
      <div className="flex items-center gap-3 border-t border-black/10 bg-white px-5 py-3 text-xs">
        <span className="font-medium text-navy/70 whitespace-nowrap">
          Drive: {Math.round((simProgress / 100) * route.totalDistanceKm)} / {route.totalDistanceKm} km
        </span>
        <input
          type="range"
          min={0}
          max={100}
          value={simProgress}
          onChange={(e) => {
            setIsSimulating(false);
            setSimProgress(Number(e.target.value));
          }}
          className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-black/10 accent-teal"
        />
        <span className="font-bold text-teal whitespace-nowrap">{simProgress}%</span>
      </div>
    </div>
  );
}
