import { useState } from 'react';
import { Check, Copy, Database, GitBranch, Server, X } from 'lucide-react';
import { StorageStatus } from '../types/entrance';

interface DeployGuideModalProps {
  isOpen: boolean;
  storageStatus: StorageStatus | null;
  onClose: () => void;
}

const SQL_SNIPPET = `CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.entradas_accesibilidad (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre_punto text NOT NULL,
  edificio text NOT NULL,
  calle_acceso text NOT NULL,
  tipo_entrada text NOT NULL CHECK (tipo_entrada IN ('con rampa', 'con escalones')),
  latitud double precision NOT NULL CHECK (latitud >= -90 AND latitud <= 90),
  longitud double precision NOT NULL CHECK (longitud >= -180 AND longitud <= 180),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);`;

export function DeployGuideModal({
  isOpen,
  storageStatus,
  onClose,
}: DeployGuideModalProps) {
  const [copiedSql, setCopiedSql] = useState(false);

  if (!isOpen) return null;

  const handleCopySql = async () => {
    try {
      await navigator.clipboard.writeText(SQL_SNIPPET);
      setCopiedSql(true);
      setTimeout(() => setCopiedSql(false), 2000);
    } catch {
      // Ignore if clipboard blocked
    }
  };

  return (
    <div
      className="fixed inset-0 z-[700] flex items-center justify-center bg-slate-900/50 backdrop-blur-[2px] p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="deploy-guide-title"
    >
      <div className="w-full max-w-2xl bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <div>
            <h2 id="deploy-guide-title" className="text-lg font-semibold text-slate-900">
              Conexión Supabase, GitHub y Render
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Origen actual:{' '}
              <span className="font-medium text-slate-800">
                {storageStatus?.mode === 'supabase'
                  ? `Supabase conectado (tabla ${storageStatus.table})`
                  : 'Almacenamiento local de vista previa (listo para conectar Supabase)'}
              </span>
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
            aria-label="Cerrar guía"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-5 overflow-y-auto text-xs text-slate-700">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-semibold text-slate-900 text-sm">
                <Database className="w-4 h-4 text-blue-700" />
                1. Crear la tabla en Supabase
              </div>
              <button
                type="button"
                onClick={handleCopySql}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-md transition-colors cursor-pointer"
              >
                {copiedSql ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                {copiedSql ? 'SQL copiado' : 'Copiar SQL'}
              </button>
            </div>
            <p className="text-slate-600">
              En tu proyecto de Supabase, abrí <strong>SQL Editor</strong> y ejecutá el script completo incluido en{' '}
              <code className="font-mono bg-slate-100 px-1 py-0.5 rounded">supabase/schema.sql</code> (también crea las políticas RLS y los 3 ejemplos iniciales):
            </p>
            <pre className="p-3 bg-slate-900 text-slate-100 rounded-lg overflow-x-auto font-mono text-[11px] leading-relaxed">
              {SQL_SNIPPET}
            </pre>
          </div>

          <div className="space-y-1.5 pt-3 border-t border-slate-200">
            <div className="flex items-center gap-2 font-semibold text-slate-900 text-sm">
              <GitBranch className="w-4 h-4 text-blue-700" />
              2. Subir el proyecto a tu repositorio de GitHub
            </div>
            <p className="text-slate-600">
              El repositorio ya incluye <code className="font-mono bg-slate-100 px-1 py-0.5 rounded">render.yaml</code>,{' '}
              <code className="font-mono bg-slate-100 px-1 py-0.5 rounded">supabase/schema.sql</code> y{' '}
              <code className="font-mono bg-slate-100 px-1 py-0.5 rounded">.env.example</code> con el <code className="font-mono bg-slate-100 px-1 py-0.5 rounded">.gitignore</code> configurado para proteger tus claves.
            </p>
          </div>

          <div className="space-y-2 pt-3 border-t border-slate-200">
            <div className="flex items-center gap-2 font-semibold text-slate-900 text-sm">
              <Server className="w-4 h-4 text-blue-700" />
              3. Publicar en Render conectado a GitHub y Supabase
            </div>
            <p className="text-slate-600">
              En Render elegí <strong>New Web Service</strong> (o Blueprint con <code className="font-mono bg-slate-100 px-1 py-0.5 rounded">render.yaml</code>), conectá tu repo de GitHub y cargá estas variables de entorno en <strong>Environment</strong>:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 font-mono text-[11px] bg-slate-50 border border-slate-200 rounded-lg p-3">
              <div>
                <span className="text-slate-500">Build Command:</span>
                <div className="text-slate-900 font-semibold">npm install && npm run build</div>
              </div>
              <div>
                <span className="text-slate-500">Start Command:</span>
                <div className="text-slate-900 font-semibold">npm start</div>
              </div>
              <div className="sm:col-span-2 pt-1 border-t border-slate-200">
                <span className="text-slate-500">Variables requeridas:</span>
                <div className="text-slate-900 mt-0.5">
                  SUPABASE_URL · SUPABASE_SERVICE_ROLE_KEY (o SUPABASE_ANON_KEY)
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
