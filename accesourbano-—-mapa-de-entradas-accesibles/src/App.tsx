import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Accessibility,
  AlertCircle,
  ExternalLink,
  Footprints,
  Pencil,
  Plus,
  Search,
  Trash2,
} from 'lucide-react';
import { ConfirmDeleteModal } from './components/ConfirmDeleteModal';
import { DeployGuideModal } from './components/DeployGuideModal';
import { EntranceFormModal } from './components/EntranceFormModal';
import { EntranceMap } from './components/EntranceMap';
import { GoogleMapsExportModal } from './components/GoogleMapsExportModal';
import {
  EntranceInput,
  EntranceRecord,
  EntranceType,
  getGoogleMapsSearchUrl,
  StorageStatus,
} from './types/entrance';

type FilterType = 'todos' | EntranceType;

export default function App() {
  const [entrances, setEntrances] = useState<EntranceRecord[]>([]);
  const [storageStatus, setStorageStatus] = useState<StorageStatus | null>(null);
  const [filterType, setFilterType] = useState<FilterType>('todos');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<EntranceRecord | null>(null);
  const [isPickingLocation, setIsPickingLocation] = useState(false);
  const [pickedCoords, setPickedCoords] = useState<{ latitud: number; longitud: number } | null>(
    null
  );

  const [deleteTarget, setDeleteTarget] = useState<EntranceRecord | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isDeployGuideOpen, setIsDeployGuideOpen] = useState(false);
  const [isSeeding, setIsSeeding] = useState(false);

  const fetchAll = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const [entrancesRes, statusRes] = await Promise.all([
        fetch('/api/entrances'),
        fetch('/api/config/status'),
      ]);

      const entrancesBody = await entrancesRes.json();
      if (!entrancesRes.ok) {
        throw new Error(entrancesBody.error || 'No se pudieron cargar los puntos de acceso.');
      }

      const rows = (entrancesBody.data ?? []) as EntranceRecord[];
      setEntrances(rows);
      setSelectedId((prev) => {
        if (prev && rows.some((r) => r.id === prev)) return prev;
        return rows.length > 0 ? rows[0].id : null;
      });

      if (statusRes.ok) {
        const statusBody = (await statusRes.json()) as StorageStatus;
        setStorageStatus(statusBody);
      }
    } catch (err) {
      setLoadError(
        err instanceof Error ? err.message : 'Error de conexión al cargar los registros.'
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const counts = useMemo(() => {
    let ramp = 0;
    let steps = 0;
    for (const item of entrances) {
      if (item.tipo_entrada === 'con rampa') ramp += 1;
      else if (item.tipo_entrada === 'con escalones') steps += 1;
    }
    return { total: entrances.length, ramp, steps };
  }, [entrances]);

  const filteredEntrances = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return entrances.filter((item) => {
      if (filterType !== 'todos' && item.tipo_entrada !== filterType) {
        return false;
      }
      if (!q) return true;
      return (
        item.nombre_punto.toLowerCase().includes(q) ||
        item.edificio.toLowerCase().includes(q) ||
        item.calle_acceso.toLowerCase().includes(q)
      );
    });
  }, [entrances, filterType, searchQuery]);

  const selectedEntrance = useMemo(() => {
    if (!selectedId) return null;
    return filteredEntrances.find((item) => item.id === selectedId) ?? null;
  }, [filteredEntrances, selectedId]);

  const handleOpenCreate = () => {
    setEditingRecord(null);
    setPickedCoords(null);
    setIsPickingLocation(false);
    setIsFormOpen(true);
  };

  const handleOpenEdit = (record: EntranceRecord) => {
    setEditingRecord(record);
    setPickedCoords({ latitud: record.latitud, longitud: record.longitud });
    setIsPickingLocation(false);
    setIsFormOpen(true);
  };

  const handleSaveEntrance = async (input: EntranceInput, id?: string) => {
    const endpoint = id ? `/api/entrances/${encodeURIComponent(id)}` : '/api/entrances';
    const method = id ? 'PUT' : 'POST';

    const res = await fetch(endpoint, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });
    const body = await res.json();
    if (!res.ok) {
      throw new Error(body.error || 'No se pudo guardar la entrada.');
    }

    const saved = body.data as EntranceRecord;
    setEntrances((prev) => {
      if (id) {
        return prev.map((item) => (item.id === id ? saved : item));
      }
      return [saved, ...prev];
    });
    setSelectedId(saved.id);
    setFilterType('todos');
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/entrances/${encodeURIComponent(deleteTarget.id)}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error || 'No se pudo eliminar el registro.');
      }
      setEntrances((prev) => {
        const next = prev.filter((item) => item.id !== deleteTarget.id);
        if (selectedId === deleteTarget.id) {
          setSelectedId(next.length > 0 ? next[0].id : null);
        }
        return next;
      });
      setDeleteTarget(null);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Error al eliminar el registro.');
      setDeleteTarget(null);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSeedExamples = async () => {
    setIsSeeding(true);
    setLoadError(null);
    try {
      const res = await fetch('/api/entrances/seed', { method: 'POST' });
      const body = await res.json();
      if (!res.ok) {
        throw new Error(body.error || 'No se pudieron cargar los ejemplos.');
      }
      const rows = (body.data ?? []) as EntranceRecord[];
      setEntrances(rows);
      setFilterType('todos');
      if (rows.length > 0) {
        setSelectedId(rows[0].id);
      }
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Error al cargar los ejemplos.');
    } finally {
      setIsSeeding(false);
    }
  };

  const handlePickFromMap = (coords: { latitud: number; longitud: number }) => {
    setPickedCoords(coords);
    setIsPickingLocation(false);
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      <header className="h-16 px-4 sm:px-6 bg-white border-b border-slate-200 flex items-center justify-between gap-8 shrink-0">
        <a
          href="/"
          className="font-display text-lg font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0"
        >
          AccesoUrbano
        </a>

        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600">
          <button
            type="button"
            onClick={() => setIsExportOpen(true)}
            className="hover:text-slate-900 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            Pasar a Google Maps
          </button>
          <button
            type="button"
            onClick={handleSeedExamples}
            disabled={isSeeding}
            className="hover:text-slate-900 disabled:opacity-50 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            {isSeeding ? 'Cargando ejemplos...' : 'Cargar 3 ejemplos'}
          </button>
          <button
            type="button"
            onClick={() => setIsDeployGuideOpen(true)}
            className="hover:text-slate-900 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            Supabase y Render
          </button>
        </nav>

        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={handleOpenCreate}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Nuevo punto
          </button>
        </div>
      </header>

      <main className="flex-1 flex flex-col lg:flex-row lg:h-[calc(100vh-4rem)] lg:overflow-hidden">
        <aside className="w-full lg:w-[440px] shrink-0 bg-white border-b lg:border-b-0 lg:border-r border-slate-200 flex flex-col lg:h-full">
          <div className="p-4 border-b border-slate-200 space-y-3">
            <div>
              <h1 className="text-base font-semibold text-slate-900">
                Entradas registradas por edificio
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Seleccioná una entrada para ubicarla en OpenStreetMap o abrirla en Google Maps.
              </p>
            </div>

            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar edificio, punto o calle lateral..."
                className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:bg-white focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
              />
            </div>

            <div
              className="grid grid-cols-3 gap-1 p-1 bg-slate-100 rounded-lg"
              role="group"
              aria-label="Filtrar por tipo de entrada"
            >
              <button
                type="button"
                onClick={() => setFilterType('todos')}
                className={`py-1.5 px-2 text-xs font-medium rounded-md transition-colors whitespace-nowrap truncate cursor-pointer ${
                  filterType === 'todos'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Todos ({counts.total})
              </button>
              <button
                type="button"
                onClick={() => setFilterType('con rampa')}
                className={`py-1.5 px-2 text-xs font-medium rounded-md transition-colors whitespace-nowrap truncate cursor-pointer ${
                  filterType === 'con rampa'
                    ? 'bg-white text-emerald-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Con rampa ({counts.ramp})
              </button>
              <button
                type="button"
                onClick={() => setFilterType('con escalones')}
                className={`py-1.5 px-2 text-xs font-medium rounded-md transition-colors whitespace-nowrap truncate cursor-pointer ${
                  filterType === 'con escalones'
                    ? 'bg-white text-amber-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Con escalones ({counts.steps})
              </button>
            </div>

            <div className="flex md:hidden items-center gap-3 pt-1 text-xs font-medium text-blue-700">
              <button
                type="button"
                onClick={() => setIsExportOpen(true)}
                className="underline cursor-pointer"
              >
                Pasar a Google Maps
              </button>
              <span className="text-slate-300" aria-hidden="true">
                ·
              </span>
              <button
                type="button"
                onClick={() => setIsDeployGuideOpen(true)}
                className="underline cursor-pointer"
              >
                Supabase / Render
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {loadError && (
              <div className="m-4 p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-800 space-y-2">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                  <span>{loadError}</span>
                </div>
                <button
                  type="button"
                  onClick={fetchAll}
                  className="font-semibold underline text-red-900 cursor-pointer"
                >
                  Reintentar carga
                </button>
              </div>
            )}

            {isLoading ? (
              <div className="divide-y divide-slate-200">
                {[1, 2, 3].map((idx) => (
                  <div key={idx} className="p-4 space-y-2 animate-pulse">
                    <div className="h-3 w-28 bg-slate-200 rounded" />
                    <div className="h-4 w-56 bg-slate-200 rounded" />
                    <div className="h-3 w-44 bg-slate-100 rounded" />
                  </div>
                ))}
              </div>
            ) : filteredEntrances.length === 0 ? (
              <div className="p-8 text-center space-y-3">
                <p className="text-sm font-medium text-slate-800">
                  No hay entradas para mostrar
                </p>
                <p className="text-xs text-slate-500">
                  {entrances.length === 0
                    ? 'Podés agregar un punto manualmente o cargar los 3 ejemplos iniciales.'
                    : 'Probá limpiando la búsqueda o cambiando el filtro por tipo de entrada.'}
                </p>
                <div className="flex items-center justify-center gap-2 pt-1">
                  {entrances.length === 0 ? (
                    <button
                      type="button"
                      onClick={handleSeedExamples}
                      className="px-3 py-2 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-lg transition-colors cursor-pointer"
                    >
                      Cargar 3 ejemplos
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setFilterType('todos');
                        setSearchQuery('');
                      }}
                      className="px-3 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
                    >
                      Ver todas las entradas
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <ul className="divide-y divide-slate-200">
                {filteredEntrances.map((item) => {
                  const isSelected = selectedEntrance?.id === item.id;
                  const isRamp = item.tipo_entrada === 'con rampa';

                  return (
                    <li
                      key={item.id}
                      className={`transition-colors ${
                        isSelected ? 'bg-blue-50/70' : 'hover:bg-slate-50'
                      }`}
                    >
                      <div className="p-4 space-y-2">
                        <button
                          type="button"
                          onClick={() => setSelectedId(item.id)}
                          className="w-full text-left focus:outline-none cursor-pointer"
                        >
                          <div className="flex items-center gap-2 text-xs">
                            <span
                              className={`inline-flex items-center gap-1 font-semibold ${
                                isRamp ? 'text-emerald-700' : 'text-amber-700'
                              }`}
                            >
                              {isRamp ? (
                                <Accessibility className="w-3.5 h-3.5" />
                              ) : (
                                <Footprints className="w-3.5 h-3.5" />
                              )}
                              {isRamp ? 'Con rampa' : 'Con escalones'}
                            </span>
                            <span className="text-slate-300" aria-hidden="true">
                              ·
                            </span>
                            <span className="font-medium text-slate-600 truncate">
                              {item.edificio}
                            </span>
                          </div>

                          <h2 className="text-sm font-semibold text-slate-900 mt-1">
                            {item.nombre_punto}
                          </h2>

                          <p className="text-xs text-slate-600 mt-0.5">{item.calle_acceso}</p>

                          <p className="text-[11px] font-mono text-slate-500 mt-1">
                            {item.latitud.toFixed(6)}, {item.longitud.toFixed(6)}
                          </p>
                        </button>

                        <div className="flex items-center justify-between pt-1">
                          <a
                            href={getGoogleMapsSearchUrl(item.latitud, item.longitud)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs font-medium text-blue-700 hover:text-blue-800 hover:underline"
                          >
                            <ExternalLink className="w-3 h-3" />
                            Ver en Google Maps
                          </a>

                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleOpenEdit(item)}
                              className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-200/70 rounded-md transition-colors cursor-pointer"
                              aria-label={`Editar ${item.nombre_punto}`}
                              title="Editar"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeleteTarget(item)}
                              className="p-1.5 text-slate-500 hover:text-red-700 hover:bg-red-50 rounded-md transition-colors cursor-pointer"
                              aria-label={`Eliminar ${item.nombre_punto}`}
                              title="Eliminar"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </aside>

        <section className="flex-1 flex flex-col min-h-[460px] lg:min-h-0">
          <EntranceMap
            entrances={filteredEntrances}
            selectedEntrance={selectedEntrance}
            onSelectEntrance={(item) => setSelectedId(item.id)}
            onEditEntrance={handleOpenEdit}
            onDeleteEntrance={(item) => setDeleteTarget(item)}
            isPickingLocation={isPickingLocation}
            pickedCoords={pickedCoords}
            onPickCoords={handlePickFromMap}
            onCancelPicking={() => setIsPickingLocation(false)}
          />
        </section>
      </main>

      <EntranceFormModal
        isOpen={isFormOpen}
        editingRecord={editingRecord}
        pickedCoords={pickedCoords}
        isPickingLocation={isPickingLocation}
        onStartPicking={() => setIsPickingLocation(true)}
        onClose={() => {
          setIsFormOpen(false);
          setIsPickingLocation(false);
        }}
        onSubmit={handleSaveEntrance}
      />

      <GoogleMapsExportModal
        isOpen={isExportOpen}
        entrances={filteredEntrances}
        onClose={() => setIsExportOpen(false)}
      />

      <DeployGuideModal
        isOpen={isDeployGuideOpen}
        storageStatus={storageStatus}
        onClose={() => setIsDeployGuideOpen(false)}
      />

      <ConfirmDeleteModal
        record={deleteTarget}
        isDeleting={isDeleting}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
}
