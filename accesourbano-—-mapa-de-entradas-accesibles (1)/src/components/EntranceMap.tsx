import { useEffect, useRef } from 'react';
import L from 'leaflet';
import {
  Crosshair,
  ExternalLink,
  Maximize2,
  Navigation,
  Pencil,
  Trash2,
} from 'lucide-react';
import {
  EntranceRecord,
  getGoogleMapsDirectionsUrl,
  getGoogleMapsSearchUrl,
} from '../types/entrance';

interface EntranceMapProps {
  entrances: EntranceRecord[];
  selectedEntrance: EntranceRecord | null;
  onSelectEntrance: (entrance: EntranceRecord) => void;
  onEditEntrance: (entrance: EntranceRecord) => void;
  onDeleteEntrance: (entrance: EntranceRecord) => void;
  isPickingLocation: boolean;
  pickedCoords: { latitud: number; longitud: number } | null;
  onPickCoords: (coords: { latitud: number; longitud: number }) => void;
  onCancelPicking: () => void;
}

function createPinIcon(tipo: EntranceRecord['tipo_entrada'], isSelected: boolean): L.DivIcon {
  const isRamp = tipo === 'con rampa';
  const fill = isRamp ? '#16A34A' : '#D97706';
  const ring = isSelected ? '#1D4ED8' : '#FFFFFF';
  const ringWidth = isSelected ? 3 : 2;
  const size = isSelected ? 38 : 32;

  const glyph = isRamp
    ? `<path d="M10 18.5h8.5l2.5-4.5" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/><circle cx="11.5" cy="10.5" r="1.5" fill="white"/><path d="M11.5 13v3.5h5" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/>`
    : `<path d="M9 19h4v-3.5h4V12h4" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/>`;

  const svg = `
    <svg width="${size}" height="${size}" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <circle cx="16" cy="15" r="12" fill="${fill}" stroke="${ring}" stroke-width="${ringWidth}" />
      ${glyph}
    </svg>
  `;

  return L.divIcon({
    className: 'custom-entrance-marker',
    html: svg,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -(size / 2)],
  });
}

function createPickerIcon(): L.DivIcon {
  const svg = `
    <svg width="34" height="34" viewBox="0 0 34 34" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <circle cx="17" cy="17" r="11" fill="#1D4ED8" stroke="#FFFFFF" stroke-width="2.5" />
      <circle cx="17" cy="17" r="3.5" fill="#FFFFFF" />
    </svg>
  `;
  return L.divIcon({
    className: 'custom-entrance-marker',
    html: svg,
    iconSize: [34, 34],
    iconAnchor: [17, 17],
  });
}

function buildPopupElement(item: EntranceRecord): HTMLElement {
  const wrapper = document.createElement('div');
  wrapper.className = 'min-w-[220px] max-w-[260px] text-slate-900';

  const typeLabel = document.createElement('div');
  typeLabel.className =
    item.tipo_entrada === 'con rampa'
      ? 'text-[11px] font-semibold text-emerald-700 mb-1'
      : 'text-[11px] font-semibold text-amber-700 mb-1';
  typeLabel.textContent = item.tipo_entrada === 'con rampa' ? 'Acceso con rampa' : 'Acceso con escalones';

  const title = document.createElement('div');
  title.className = 'text-sm font-semibold text-slate-900 leading-snug';
  title.textContent = item.nombre_punto;

  const meta = document.createElement('div');
  meta.className = 'text-xs text-slate-600 mt-1';
  meta.textContent = `${item.edificio} · ${item.calle_acceso}`;

  const coords = document.createElement('div');
  coords.className = 'text-[11px] font-mono text-slate-500 mt-1.5';
  coords.textContent = `${item.latitud.toFixed(6)}, ${item.longitud.toFixed(6)}`;

  const link = document.createElement('a');
  link.href = getGoogleMapsSearchUrl(item.latitud, item.longitud);
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
  link.className =
    'inline-flex items-center gap-1 mt-2 text-xs font-medium text-blue-700 hover:text-blue-800 underline';
  link.textContent = 'Ver en Google Maps';

  wrapper.appendChild(typeLabel);
  wrapper.appendChild(title);
  wrapper.appendChild(meta);
  wrapper.appendChild(coords);
  wrapper.appendChild(link);
  return wrapper;
}

export function EntranceMap({
  entrances,
  selectedEntrance,
  onSelectEntrance,
  onEditEntrance,
  onDeleteEntrance,
  isPickingLocation,
  pickedCoords,
  onPickCoords,
  onCancelPicking,
}: EntranceMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const pickerLayerRef = useRef<L.LayerGroup | null>(null);
  const markersByIdRef = useRef<Map<string, L.Marker>>(new Map());
  const isPickingRef = useRef(isPickingLocation);
  const onPickCoordsRef = useRef(onPickCoords);
  const onSelectRef = useRef(onSelectEntrance);

  isPickingRef.current = isPickingLocation;
  onPickCoordsRef.current = onPickCoords;
  onSelectRef.current = onSelectEntrance;

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center: [-34.6037, -58.3816],
      zoom: 13,
      zoomControl: true,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(map);

    const markersLayer = L.layerGroup().addTo(map);
    const pickerLayer = L.layerGroup().addTo(map);

    map.on('click', (event: L.LeafletMouseEvent) => {
      if (!isPickingRef.current) return;
      const lat = Number(event.latlng.lat.toFixed(6));
      const lng = Number(event.latlng.lng.toFixed(6));
      onPickCoordsRef.current({ latitud: lat, longitud: lng });
    });

    mapRef.current = map;
    markersLayerRef.current = markersLayer;
    pickerLayerRef.current = pickerLayer;

    const resizeObserver = new ResizeObserver(() => {
      map.invalidateSize();
    });
    resizeObserver.observe(containerRef.current);

    return () => {
      resizeObserver.disconnect();
      map.remove();
      mapRef.current = null;
      markersLayerRef.current = null;
      pickerLayerRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const layer = markersLayerRef.current;
    if (!map || !layer) return;

    layer.clearLayers();
    markersByIdRef.current.clear();

    entrances.forEach((item) => {
      const isSelected = selectedEntrance?.id === item.id;
      const marker = L.marker([item.latitud, item.longitud], {
        icon: createPinIcon(item.tipo_entrada, isSelected),
        zIndexOffset: isSelected ? 1000 : 0,
      });

      marker.bindPopup(buildPopupElement(item));
      marker.on('click', () => {
        if (!isPickingRef.current) {
          onSelectRef.current(item);
        }
      });

      marker.addTo(layer);
      markersByIdRef.current.set(item.id, marker);
    });
  }, [entrances, selectedEntrance]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !selectedEntrance || isPickingLocation) return;

    map.flyTo([selectedEntrance.latitud, selectedEntrance.longitud], Math.max(map.getZoom(), 16), {
      duration: 0.45,
    });

    const marker = markersByIdRef.current.get(selectedEntrance.id);
    if (marker) {
      marker.openPopup();
    }
  }, [selectedEntrance, isPickingLocation]);

  useEffect(() => {
    const layer = pickerLayerRef.current;
    if (!layer) return;
    layer.clearLayers();

    if (isPickingLocation && pickedCoords) {
      L.marker([pickedCoords.latitud, pickedCoords.longitud], {
        icon: createPickerIcon(),
        zIndexOffset: 1200,
      }).addTo(layer);
    }
  }, [isPickingLocation, pickedCoords]);

  const handleFitAll = () => {
    const map = mapRef.current;
    if (!map || entrances.length === 0) return;

    const bounds = L.latLngBounds(
      entrances.map((item) => [item.latitud, item.longitud] as [number, number])
    );
    map.fitBounds(bounds, { padding: [48, 48], maxZoom: 16 });
  };

  return (
    <div className="relative flex-1 min-h-[420px] lg:min-h-0 bg-slate-100 overflow-hidden">
      <div
        ref={containerRef}
        className={`w-full h-full ${isPickingLocation ? 'cursor-crosshair' : ''}`}
        aria-label="Mapa interactivo de entradas en OpenStreetMap"
      />

      {isPickingLocation && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[500] flex items-center gap-3 bg-slate-900 text-white px-4 py-2.5 rounded-lg shadow-lg border border-slate-700 max-w-[92%]">
          <Crosshair className="w-4 h-4 text-blue-400 shrink-0" />
          <span className="text-xs sm:text-sm font-medium truncate">
            Hacé clic en el mapa para marcar las coordenadas exactas de la entrada
          </span>
          <button
            type="button"
            onClick={onCancelPicking}
            className="px-2.5 py-1 text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-100 rounded border border-slate-600 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            Volver al formulario
          </button>
        </div>
      )}

      <div className="absolute top-4 right-4 z-[450] flex items-center gap-2">
        {entrances.length > 0 && (
          <button
            type="button"
            onClick={handleFitAll}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium bg-white text-slate-800 border border-slate-200 rounded-lg shadow-sm hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Maximize2 className="w-3.5 h-3.5 text-slate-600" />
            Ver todos los puntos
          </button>
        )}
      </div>

      <div className="hidden sm:flex items-center gap-4 absolute top-4 left-14 z-[450] bg-white/95 backdrop-blur-sm border border-slate-200 rounded-lg px-3 py-1.5 shadow-sm text-xs text-slate-700">
        <div className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 rounded-full bg-emerald-600 border border-white shadow-xs" />
          <span className="font-medium">Con rampa</span>
        </div>
        <span className="text-slate-300" aria-hidden="true">
          ·
        </span>
        <div className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 rounded-full bg-amber-600 border border-white shadow-xs" />
          <span className="font-medium">Con escalones</span>
        </div>
      </div>

      {selectedEntrance && !isPickingLocation && (
        <div className="absolute bottom-4 left-4 right-4 lg:left-6 lg:right-6 z-[450] bg-white border border-slate-200 rounded-xl shadow-lg p-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600">
                <span
                  className={
                    selectedEntrance.tipo_entrada === 'con rampa'
                      ? 'font-semibold text-emerald-700'
                      : 'font-semibold text-amber-700'
                  }
                >
                  {selectedEntrance.tipo_entrada === 'con rampa' ? 'Con rampa' : 'Con escalones'}
                </span>
                <span aria-hidden="true">·</span>
                <span className="font-medium text-slate-800 truncate">
                  {selectedEntrance.edificio}
                </span>
                <span aria-hidden="true">·</span>
                <span className="truncate">{selectedEntrance.calle_acceso}</span>
              </div>
              <h3 className="text-base font-semibold text-slate-900 mt-0.5 truncate">
                {selectedEntrance.nombre_punto}
              </h3>
              <p className="text-xs font-mono text-slate-500 mt-0.5">
                Lat: {selectedEntrance.latitud.toFixed(6)} · Lng:{' '}
                {selectedEntrance.longitud.toFixed(6)}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <a
                href={getGoogleMapsSearchUrl(selectedEntrance.latitud, selectedEntrance.longitud)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium bg-blue-700 hover:bg-blue-800 text-white rounded-lg transition-colors whitespace-nowrap shrink-0"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                Ver en Google Maps
              </a>
              <a
                href={getGoogleMapsDirectionsUrl(
                  selectedEntrance.latitud,
                  selectedEntrance.longitud
                )}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-lg transition-colors whitespace-nowrap shrink-0"
              >
                <Navigation className="w-3.5 h-3.5 text-slate-600" />
                Cómo llegar
              </a>
              <button
                type="button"
                onClick={() => onEditEntrance(selectedEntrance)}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                title="Editar entrada"
              >
                <Pencil className="w-3.5 h-3.5 text-slate-600" />
                Editar
              </button>
              <button
                type="button"
                onClick={() => onDeleteEntrance(selectedEntrance)}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium bg-white hover:bg-red-50 text-red-700 border border-slate-200 hover:border-red-200 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                title="Eliminar entrada"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
