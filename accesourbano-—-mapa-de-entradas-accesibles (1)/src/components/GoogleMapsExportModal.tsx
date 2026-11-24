import { useState } from 'react';
import { Check, Copy, Download, ExternalLink, FileSpreadsheet, MapPin, X } from 'lucide-react';
import {
  buildCsvExport,
  buildKmlExport,
  EntranceRecord,
  getGoogleMapsDirectionsUrl,
  getGoogleMapsSearchUrl,
} from '../types/entrance';

interface GoogleMapsExportModalProps {
  isOpen: boolean;
  entrances: EntranceRecord[];
  onClose: () => void;
}

function triggerFileDownload(filename: string, content: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

export function GoogleMapsExportModal({
  isOpen,
  entrances,
  onClose,
}: GoogleMapsExportModalProps) {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleDownloadKml = () => {
    const kml = buildKmlExport(entrances);
    triggerFileDownload('entradas_accesibles.kml', kml, 'application/vnd.google-earth.kml+xml');
  };

  const handleDownloadCsv = () => {
    const csv = buildCsvExport(entrances);
    triggerFileDownload('entradas_accesibles.csv', csv, 'text/csv;charset=utf-8;');
  };

  const handleCopyAllLinks = async () => {
    const text = entrances
      .map(
        (item) =>
          `${item.nombre_punto} (${item.tipo_entrada}) — ${item.edificio}, ${item.calle_acceso}\n${getGoogleMapsSearchUrl(
            item.latitud,
            item.longitud
          )}`
      )
      .join('\n\n');

    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard blocked in some embedded contexts
    }
  };

  return (
    <div
      className="fixed inset-0 z-[700] flex items-center justify-center bg-slate-900/50 backdrop-blur-[2px] p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="gmaps-export-title"
    >
      <div className="w-full max-w-2xl bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <div>
            <h2 id="gmaps-export-title" className="text-lg font-semibold text-slate-900">
              Pasar o ver ubicaciones en Google Maps
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Abrí cada punto directamente en Google Maps o exportá los {entrances.length} registros para Google My Maps.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
            aria-label="Cerrar ventana"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-5 overflow-y-auto">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <button
              type="button"
              onClick={handleDownloadKml}
              disabled={entrances.length === 0}
              className="flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 disabled:opacity-50 rounded-lg transition-colors cursor-pointer"
            >
              <Download className="w-4 h-4" />
              Descargar KML
            </button>
            <button
              type="button"
              onClick={handleDownloadCsv}
              disabled={entrances.length === 0}
              className="flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-semibold text-slate-800 bg-white hover:bg-slate-50 border border-slate-300 disabled:opacity-50 rounded-lg transition-colors cursor-pointer"
            >
              <FileSpreadsheet className="w-4 h-4 text-slate-600" />
              Descargar CSV
            </button>
            <button
              type="button"
              onClick={handleCopyAllLinks}
              disabled={entrances.length === 0}
              className="flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-semibold text-slate-800 bg-white hover:bg-slate-50 border border-slate-300 disabled:opacity-50 rounded-lg transition-colors cursor-pointer"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4 text-slate-600" />}
              {copied ? 'Enlaces copiados' : 'Copiar enlaces'}
            </button>
          </div>

          <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 space-y-1.5">
            <p className="font-semibold text-slate-900">
              Cómo pasar todas las ubicaciones juntas a Google Maps:
            </p>
            <ol className="list-decimal list-inside space-y-1 text-slate-600">
              <li>Descargá el archivo <span className="font-mono text-slate-800">entradas_accesibles.kml</span> o <span className="font-mono text-slate-800">.csv</span> arriba.</li>
              <li>
                Entrá a{' '}
                <a
                  href="https://www.google.com/maps/d/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-700 underline font-medium"
                >
                  Google My Maps
                </a>{' '}
                y elegí <strong>Crear un mapa nuevo</strong>.
              </li>
              <li>Tocá <strong>Importar</strong> en la capa y subí el archivo descargado para ver todas las entradas con rampa y escalones en Google Maps.</li>
            </ol>
          </div>

          <div>
            <h3 className="text-xs font-semibold text-slate-700 mb-2">
              Abrir ubicación individual en Google Maps ({entrances.length})
            </h3>
            {entrances.length === 0 ? (
              <p className="text-sm text-slate-500 py-4 text-center border border-dashed border-slate-200 rounded-lg">
                No hay ubicaciones visibles con el filtro actual.
              </p>
            ) : (
              <div className="divide-y divide-slate-200 border border-slate-200 rounded-lg">
                {entrances.map((item) => (
                  <div
                    key={item.id}
                    className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 px-4 py-3"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 text-xs">
                        <MapPin
                          className={`w-3.5 h-3.5 shrink-0 ${
                            item.tipo_entrada === 'con rampa' ? 'text-emerald-600' : 'text-amber-600'
                          }`}
                        />
                        <span className="font-semibold text-slate-900 truncate">
                          {item.nombre_punto}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5 truncate">
                        {item.edificio} · {item.calle_acceso} ·{' '}
                        <span className="font-mono">
                          {item.latitud.toFixed(6)}, {item.longitud.toFixed(6)}
                        </span>
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <a
                        href={getGoogleMapsSearchUrl(item.latitud, item.longitud)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-md transition-colors whitespace-nowrap"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        Ver mapa
                      </a>
                      <a
                        href={getGoogleMapsDirectionsUrl(item.latitud, item.longitud)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors whitespace-nowrap"
                      >
                        Ruta
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
