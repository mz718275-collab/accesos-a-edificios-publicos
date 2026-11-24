export type EntranceType = 'con rampa' | 'con escalones';

export interface EntranceRecord {
  id: string;
  nombre_punto: string;
  edificio: string;
  calle_acceso: string;
  tipo_entrada: EntranceType;
  latitud: number;
  longitud: number;
  created_at: string;
  updated_at: string;
}

export interface EntranceInput {
  nombre_punto: string;
  edificio: string;
  calle_acceso: string;
  tipo_entrada: EntranceType;
  latitud: number;
  longitud: number;
}

export interface StorageStatus {
  mode: 'supabase' | 'local';
  table: string;
  configured: boolean;
}

export interface ValidationResult {
  valid: boolean;
  data?: EntranceInput;
  errors: Partial<Record<keyof EntranceInput | 'general', string>>;
}

export function validateEntranceInput(raw: {
  nombre_punto?: unknown;
  edificio?: unknown;
  calle_acceso?: unknown;
  tipo_entrada?: unknown;
  latitud?: unknown;
  longitud?: unknown;
}): ValidationResult {
  const errors: Partial<Record<keyof EntranceInput | 'general', string>> = {};

  const nombre_punto = typeof raw.nombre_punto === 'string' ? raw.nombre_punto.trim() : '';
  const edificio = typeof raw.edificio === 'string' ? raw.edificio.trim() : '';
  const calle_acceso = typeof raw.calle_acceso === 'string' ? raw.calle_acceso.trim() : '';
  const tipo_entrada = raw.tipo_entrada;

  const latNum =
    typeof raw.latitud === 'number'
      ? raw.latitud
      : typeof raw.latitud === 'string' && raw.latitud.trim() !== ''
        ? Number(raw.latitud.trim().replace(',', '.'))
        : NaN;

  const lngNum =
    typeof raw.longitud === 'number'
      ? raw.longitud
      : typeof raw.longitud === 'string' && raw.longitud.trim() !== ''
        ? Number(raw.longitud.trim().replace(',', '.'))
        : NaN;

  if (!nombre_punto) {
    errors.nombre_punto = 'Ingresá el nombre del punto de acceso.';
  } else if (nombre_punto.length > 160) {
    errors.nombre_punto = 'El nombre no puede superar los 160 caracteres.';
  }

  if (!edificio) {
    errors.edificio = 'Ingresá el nombre del edificio.';
  } else if (edificio.length > 160) {
    errors.edificio = 'El edificio no puede superar los 160 caracteres.';
  }

  if (!calle_acceso) {
    errors.calle_acceso = 'Ingresá la calle de acceso (o calle lateral).';
  } else if (calle_acceso.length > 200) {
    errors.calle_acceso = 'La calle de acceso no puede superar los 200 caracteres.';
  }

  if (tipo_entrada !== 'con rampa' && tipo_entrada !== 'con escalones') {
    errors.tipo_entrada = 'Seleccioná "con rampa" o "con escalones".';
  }

  if (!Number.isFinite(latNum)) {
    errors.latitud = 'Ingresá una latitud numérica válida en grados decimales.';
  } else if (latNum < -90 || latNum > 90) {
    errors.latitud = 'La latitud debe estar entre −90 y 90 grados decimales.';
  }

  if (!Number.isFinite(lngNum)) {
    errors.longitud = 'Ingresá una longitud numérica válida en grados decimales.';
  } else if (lngNum < -180 || lngNum > 180) {
    errors.longitud = 'La longitud debe estar entre −180 y 180 grados decimales.';
  }

  if (Object.keys(errors).length > 0) {
    return { valid: false, errors };
  }

  return {
    valid: true,
    errors: {},
    data: {
      nombre_punto,
      edificio,
      calle_acceso,
      tipo_entrada: tipo_entrada as EntranceType,
      latitud: Number(latNum.toFixed(6)),
      longitud: Number(lngNum.toFixed(6)),
    },
  };
}

export function getGoogleMapsSearchUrl(latitud: number, longitud: number): string {
  const lat = Number.isFinite(latitud) ? Math.max(-90, Math.min(90, latitud)) : 0;
  const lng = Number.isFinite(longitud) ? Math.max(-180, Math.min(180, longitud)) : 0;
  return `https://www.google.com/maps/search/?api=1&query=${lat.toFixed(6)},${lng.toFixed(6)}`;
}

export function getGoogleMapsDirectionsUrl(latitud: number, longitud: number): string {
  const lat = Number.isFinite(latitud) ? Math.max(-90, Math.min(90, latitud)) : 0;
  const lng = Number.isFinite(longitud) ? Math.max(-180, Math.min(180, longitud)) : 0;
  return `https://www.google.com/maps/dir/?api=1&destination=${lat.toFixed(6)},${lng.toFixed(6)}`;
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export function buildKmlExport(records: EntranceRecord[]): string {
  const placemarks = records
    .map((item) => {
      const styleUrl = item.tipo_entrada === 'con rampa' ? '#rampaStyle' : '#escalonesStyle';
      const description = [
        `Edificio: ${item.edificio}`,
        `Calle de acceso: ${item.calle_acceso}`,
        `Tipo de entrada: ${item.tipo_entrada}`,
        `Coordenadas: ${item.latitud.toFixed(6)}, ${item.longitud.toFixed(6)}`,
      ].join('\n');

      return `    <Placemark>
      <name>${escapeXml(item.nombre_punto)}</name>
      <description>${escapeXml(description)}</description>
      <styleUrl>${styleUrl}</styleUrl>
      <Point>
        <coordinates>${item.longitud.toFixed(6)},${item.latitud.toFixed(6)},0</coordinates>
      </Point>
    </Placemark>`;
    })
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <name>Entradas Accesibles (AccesoUrbano)</name>
    <description>Puntos de acceso para silla de ruedas exportados para Google Maps / Google My Maps</description>
    <Style id="rampaStyle">
      <IconStyle>
        <color>ff4aa316</color>
        <scale>1.1</scale>
      </IconStyle>
    </Style>
    <Style id="escalonesStyle">
      <IconStyle>
        <color>ff0677d9</color>
        <scale>1.0</scale>
      </IconStyle>
    </Style>
${placemarks}
  </Document>
</kml>`;
}

function escapeCsvCell(value: string | number): string {
  const str = String(value);
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function buildCsvExport(records: EntranceRecord[]): string {
  const header = [
    'ID',
    'Nombre del punto',
    'Edificio',
    'Calle de acceso',
    'Tipo de entrada',
    'Latitud',
    'Longitud',
    'Enlace Google Maps',
  ].join(',');

  const rows = records.map((r) =>
    [
      escapeCsvCell(r.id),
      escapeCsvCell(r.nombre_punto),
      escapeCsvCell(r.edificio),
      escapeCsvCell(r.calle_acceso),
      escapeCsvCell(r.tipo_entrada),
      escapeCsvCell(r.latitud.toFixed(6)),
      escapeCsvCell(r.longitud.toFixed(6)),
      escapeCsvCell(getGoogleMapsSearchUrl(r.latitud, r.longitud)),
    ].join(',')
  );

  return `\uFEFF${[header, ...rows].join('\n')}`;
}

export function parseCoordinatesFromText(input: string): { latitud: number; longitud: number } | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  // Match Google Maps @lat,lng or q=lat,lng or plain "lat, lng"
  const atMatch = trimmed.match(/@(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)/);
  if (atMatch) {
    const lat = Number(atMatch[1]);
    const lng = Number(atMatch[2]);
    if (Number.isFinite(lat) && Number.isFinite(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
      return { latitud: Number(lat.toFixed(6)), longitud: Number(lng.toFixed(6)) };
    }
  }

  const pairMatch = trimmed.match(/(-?\d+(?:[.,]\d+)?)[,\s;/]+(-?\d+(?:[.,]\d+)?)/);
  if (pairMatch) {
    const lat = Number(pairMatch[1].replace(',', '.'));
    const lng = Number(pairMatch[2].replace(',', '.'));
    if (Number.isFinite(lat) && Number.isFinite(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
      return { latitud: Number(lat.toFixed(6)), longitud: Number(lng.toFixed(6)) };
    }
  }

  return null;
}
