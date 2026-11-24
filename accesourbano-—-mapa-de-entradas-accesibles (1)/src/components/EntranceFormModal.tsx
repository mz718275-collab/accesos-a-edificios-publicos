import { FormEvent, useEffect, useState } from 'react';
import { Accessibility, AlertCircle, Crosshair, Footprints, X } from 'lucide-react';
import {
  EntranceInput,
  EntranceRecord,
  EntranceType,
  parseCoordinatesFromText,
  validateEntranceInput,
} from '../types/entrance';

interface EntranceFormModalProps {
  isOpen: boolean;
  editingRecord: EntranceRecord | null;
  pickedCoords: { latitud: number; longitud: number } | null;
  isPickingLocation: boolean;
  onStartPicking: () => void;
  onClose: () => void;
  onSubmit: (input: EntranceInput, id?: string) => Promise<void>;
}

export function EntranceFormModal({
  isOpen,
  editingRecord,
  pickedCoords,
  isPickingLocation,
  onStartPicking,
  onClose,
  onSubmit,
}: EntranceFormModalProps) {
  const [nombrePunto, setNombrePunto] = useState('');
  const [edificio, setEdificio] = useState('');
  const [calleAcceso, setCalleAcceso] = useState('');
  const [tipoEntrada, setTipoEntrada] = useState<EntranceType>('con rampa');
  const [latitud, setLatitud] = useState('');
  const [longitud, setLongitud] = useState('');
  const [pasteInput, setPasteInput] = useState('');
  const [pasteFeedback, setPasteFeedback] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    if (editingRecord) {
      setNombrePunto(editingRecord.nombre_punto);
      setEdificio(editingRecord.edificio);
      setCalleAcceso(editingRecord.calle_acceso);
      setTipoEntrada(editingRecord.tipo_entrada);
      setLatitud(String(editingRecord.latitud));
      setLongitud(String(editingRecord.longitud));
    } else {
      setNombrePunto('');
      setEdificio('');
      setCalleAcceso('');
      setTipoEntrada('con rampa');
      setLatitud('');
      setLongitud('');
    }
    setPasteInput('');
    setPasteFeedback(null);
    setFieldErrors({});
    setSubmitError(null);
  }, [isOpen, editingRecord]);

  useEffect(() => {
    if (pickedCoords) {
      setLatitud(String(pickedCoords.latitud));
      setLongitud(String(pickedCoords.longitud));
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next.latitud;
        delete next.longitud;
        return next;
      });
    }
  }, [pickedCoords]);

  if (!isOpen || isPickingLocation) return null;

  const handleParsePaste = () => {
    const parsed = parseCoordinatesFromText(pasteInput);
    if (!parsed) {
      setPasteFeedback('No se encontraron coordenadas válidas (ej. -34.60092, -58.38315 o enlace de Google Maps).');
      return;
    }
    setLatitud(String(parsed.latitud));
    setLongitud(String(parsed.longitud));
    setPasteFeedback(`Coordenadas detectadas: ${parsed.latitud}, ${parsed.longitud}`);
    setFieldErrors((prev) => {
      const next = { ...prev };
      delete next.latitud;
      delete next.longitud;
      return next;
    });
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    const validation = validateEntranceInput({
      nombre_punto: nombrePunto,
      edificio,
      calle_acceso: calleAcceso,
      tipo_entrada: tipoEntrada,
      latitud,
      longitud,
    });

    if (!validation.valid || !validation.data) {
      setFieldErrors(validation.errors as Record<string, string>);
      return;
    }

    setFieldErrors({});
    setIsSaving(true);
    try {
      await onSubmit(validation.data, editingRecord?.id);
      onClose();
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'No se pudo guardar el registro.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[700] flex items-center justify-center bg-slate-900/50 backdrop-blur-[2px] p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="entrance-form-title"
    >
      <div className="w-full max-w-lg bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden max-h-[92vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <h2 id="entrance-form-title" className="text-lg font-semibold text-slate-900">
            {editingRecord ? 'Editar punto de acceso' : 'Registrar nueva entrada'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
            aria-label="Cerrar formulario"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
          {submitError && (
            <div className="flex items-start gap-2.5 p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-800">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <span>{submitError}</span>
            </div>
          )}

          <div>
            <label htmlFor="nombre_punto" className="block text-xs font-semibold text-slate-700 mb-1.5">
              Nombre del punto
            </label>
            <input
              id="nombre_punto"
              type="text"
              value={nombrePunto}
              onChange={(e) => setNombrePunto(e.target.value)}
              placeholder="Ej. Acceso Lateral — Rampa Pasaje"
              className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
            />
            {fieldErrors.nombre_punto && (
              <p className="mt-1 text-xs text-red-600">{fieldErrors.nombre_punto}</p>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="edificio" className="block text-xs font-semibold text-slate-700 mb-1.5">
                Edificio
              </label>
              <input
                id="edificio"
                type="text"
                value={edificio}
                onChange={(e) => setEdificio(e.target.value)}
                placeholder="Ej. Teatro Colón"
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
              />
              {fieldErrors.edificio && (
                <p className="mt-1 text-xs text-red-600">{fieldErrors.edificio}</p>
              )}
            </div>

            <div>
              <label htmlFor="calle_acceso" className="block text-xs font-semibold text-slate-700 mb-1.5">
                Calle de acceso
              </label>
              <input
                id="calle_acceso"
                type="text"
                value={calleAcceso}
                onChange={(e) => setCalleAcceso(e.target.value)}
                placeholder="Ej. Tucumán 1171 (Lateral)"
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
              />
              {fieldErrors.calle_acceso && (
                <p className="mt-1 text-xs text-red-600">{fieldErrors.calle_acceso}</p>
              )}
            </div>
          </div>

          <div>
            <span className="block text-xs font-semibold text-slate-700 mb-1.5">
              Tipo de entrada
            </span>
            <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-lg border border-slate-200">
              <button
                type="button"
                onClick={() => setTipoEntrada('con rampa')}
                className={`flex items-center justify-center gap-2 py-2 px-3 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                  tipoEntrada === 'con rampa'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-700 hover:text-slate-900'
                }`}
              >
                <Accessibility className="w-4 h-4" />
                Con rampa
              </button>
              <button
                type="button"
                onClick={() => setTipoEntrada('con escalones')}
                className={`flex items-center justify-center gap-2 py-2 px-3 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                  tipoEntrada === 'con escalones'
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'text-slate-700 hover:text-slate-900'
                }`}
              >
                <Footprints className="w-4 h-4" />
                Con escalones
              </button>
            </div>
            {fieldErrors.tipo_entrada && (
              <p className="mt-1 text-xs text-red-600">{fieldErrors.tipo_entrada}</p>
            )}
          </div>

          <div className="pt-2 border-t border-slate-200 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-semibold text-slate-700">
                Coordenadas GPS (grados decimales)
              </span>
              <button
                type="button"
                onClick={onStartPicking}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Crosshair className="w-3.5 h-3.5" />
                Marcar en OpenStreetMap
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="latitud" className="block text-xs font-medium text-slate-600 mb-1">
                  Latitud (−90 a 90)
                </label>
                <input
                  id="latitud"
                  type="number"
                  step="any"
                  value={latitud}
                  onChange={(e) => setLatitud(e.target.value)}
                  placeholder="-34.600920"
                  className="w-full px-3 py-2 text-sm font-mono bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
                />
                {fieldErrors.latitud && (
                  <p className="mt-1 text-xs text-red-600">{fieldErrors.latitud}</p>
                )}
              </div>

              <div>
                <label htmlFor="longitud" className="block text-xs font-medium text-slate-600 mb-1">
                  Longitud (−180 a 180)
                </label>
                <input
                  id="longitud"
                  type="number"
                  step="any"
                  value={longitud}
                  onChange={(e) => setLongitud(e.target.value)}
                  placeholder="-58.383150"
                  className="w-full px-3 py-2 text-sm font-mono bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
                />
                {fieldErrors.longitud && (
                  <p className="mt-1 text-xs text-red-600">{fieldErrors.longitud}</p>
                )}
              </div>
            </div>

            <div>
              <label htmlFor="paste_coords" className="block text-xs font-medium text-slate-600 mb-1">
                O pegá un enlace de Google Maps / par de coordenadas
              </label>
              <div className="flex items-center gap-2">
                <input
                  id="paste_coords"
                  type="text"
                  value={pasteInput}
                  onChange={(e) => setPasteInput(e.target.value)}
                  placeholder="-34.60092, -58.38315 o URL de Google Maps"
                  className="flex-1 px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
                <button
                  type="button"
                  onClick={handleParsePaste}
                  className="px-3 py-1.5 text-xs font-medium bg-slate-800 hover:bg-slate-900 text-white rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  Extraer
                </button>
              </div>
              {pasteFeedback && (
                <p className="mt-1 text-xs text-slate-600">{pasteFeedback}</p>
              )}
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-4 py-2 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 disabled:opacity-60 rounded-lg transition-colors cursor-pointer"
            >
              {isSaving ? 'Guardando...' : editingRecord ? 'Guardar cambios' : 'Agregar entrada'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
