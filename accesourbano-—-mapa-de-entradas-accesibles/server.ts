import 'dotenv/config';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import express, { Request, Response } from 'express';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import {
  EntranceRecord,
  EntranceType,
  validateEntranceInput,
} from './src/types/entrance';

const PORT = Number(process.env.PORT) || 3000;
const TABLE_NAME = 'entradas_accesibilidad';
const LOCAL_DATA_DIR = path.resolve(process.cwd(), 'data');
const LOCAL_DATA_FILE = path.join(LOCAL_DATA_DIR, 'entrances.json');

const SEED_EXAMPLES: Array<Omit<EntranceRecord, 'id' | 'created_at' | 'updated_at'>> = [
  {
    nombre_punto: 'Acceso Lateral — Rampa Pasaje',
    edificio: 'Teatro Colón',
    calle_acceso: 'Tucumán 1171 (Calle lateral)',
    tipo_entrada: 'con rampa',
    latitud: -34.60092,
    longitud: -58.38315,
  },
  {
    nombre_punto: 'Entrada Principal — Escalinata',
    edificio: 'Palacio Barolo',
    calle_acceso: 'Av. de Mayo 1370',
    tipo_entrada: 'con escalones',
    latitud: -34.60958,
    longitud: -58.38582,
  },
  {
    nombre_punto: 'Ingreso Accesible — Rampa Oeste',
    edificio: 'Biblioteca Nacional Mariano Moreno',
    calle_acceso: 'Agüero 2502 (Acceso lateral)',
    tipo_entrada: 'con rampa',
    latitud: -34.58442,
    longitud: -58.39821,
  },
];

function createSupabaseServerClient(): SupabaseClient | null {
  const url = process.env.SUPABASE_URL?.trim();
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ||
    process.env.SUPABASE_ANON_KEY?.trim();

  if (!url || !key) {
    return null;
  }

  return createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

const supabase = createSupabaseServerClient();

function ensureLocalStore(): EntranceRecord[] {
  if (!fs.existsSync(LOCAL_DATA_DIR)) {
    fs.mkdirSync(LOCAL_DATA_DIR, { recursive: true });
  }

  if (!fs.existsSync(LOCAL_DATA_FILE)) {
    const now = new Date().toISOString();
    const initial: EntranceRecord[] = SEED_EXAMPLES.map((item) => ({
      id: crypto.randomUUID(),
      ...item,
      created_at: now,
      updated_at: now,
    }));
    fs.writeFileSync(LOCAL_DATA_FILE, JSON.stringify(initial, null, 2), 'utf-8');
    return initial;
  }

  try {
    const raw = fs.readFileSync(LOCAL_DATA_FILE, 'utf-8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeLocalStore(records: EntranceRecord[]): void {
  if (!fs.existsSync(LOCAL_DATA_DIR)) {
    fs.mkdirSync(LOCAL_DATA_DIR, { recursive: true });
  }
  fs.writeFileSync(LOCAL_DATA_FILE, JSON.stringify(records, null, 2), 'utf-8');
}

function filterRecords(
  records: EntranceRecord[],
  tipo?: string,
  q?: string
): EntranceRecord[] {
  let result = [...records];

  if (tipo === 'con rampa' || tipo === 'con escalones') {
    result = result.filter((item) => item.tipo_entrada === (tipo as EntranceType));
  }

  if (q && q.trim()) {
    const needle = q.trim().toLowerCase();
    result = result.filter(
      (item) =>
        item.nombre_punto.toLowerCase().includes(needle) ||
        item.edificio.toLowerCase().includes(needle) ||
        item.calle_acceso.toLowerCase().includes(needle)
    );
  }

  return result.sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
}

async function listEntrances(tipo?: string, q?: string): Promise<EntranceRecord[]> {
  if (supabase) {
    let query = supabase
      .from(TABLE_NAME)
      .select('*')
      .order('created_at', { ascending: false });

    if (tipo === 'con rampa' || tipo === 'con escalones') {
      query = query.eq('tipo_entrada', tipo);
    }

    const { data, error } = await query;
    if (error) {
      throw new Error(`Error al leer Supabase: ${error.message}`);
    }

    const rows = (data ?? []) as EntranceRecord[];
    return filterRecords(rows, tipo, q);
  }

  const localRows = ensureLocalStore();
  return filterRecords(localRows, tipo, q);
}

async function createEntrance(payload: ReturnType<typeof validateEntranceInput>['data']): Promise<EntranceRecord> {
  if (!payload) {
    throw new Error('Datos inválidos');
  }

  if (supabase) {
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .insert([payload])
      .select()
      .single();

    if (error) {
      throw new Error(`Error al guardar en Supabase: ${error.message}`);
    }
    return data as EntranceRecord;
  }

  const records = ensureLocalStore();
  const now = new Date().toISOString();
  const created: EntranceRecord = {
    id: crypto.randomUUID(),
    ...payload,
    created_at: now,
    updated_at: now,
  };
  records.unshift(created);
  writeLocalStore(records);
  return created;
}

async function updateEntrance(
  id: string,
  payload: ReturnType<typeof validateEntranceInput>['data']
): Promise<EntranceRecord | null> {
  if (!payload) {
    throw new Error('Datos inválidos');
  }

  if (supabase) {
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .update({
        ...payload,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .maybeSingle();

    if (error) {
      throw new Error(`Error al actualizar en Supabase: ${error.message}`);
    }
    return (data as EntranceRecord) ?? null;
  }

  const records = ensureLocalStore();
  const idx = records.findIndex((item) => item.id === id);
  if (idx === -1) {
    return null;
  }

  const updated: EntranceRecord = {
    ...records[idx],
    ...payload,
    updated_at: new Date().toISOString(),
  };
  records[idx] = updated;
  writeLocalStore(records);
  return updated;
}

async function deleteEntrance(id: string): Promise<boolean> {
  if (supabase) {
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .delete()
      .eq('id', id)
      .select('id');

    if (error) {
      throw new Error(`Error al eliminar en Supabase: ${error.message}`);
    }
    return Array.isArray(data) && data.length > 0;
  }

  const records = ensureLocalStore();
  const next = records.filter((item) => item.id !== id);
  if (next.length === records.length) {
    return false;
  }
  writeLocalStore(next);
  return true;
}

async function seedEntrances(): Promise<EntranceRecord[]> {
  if (supabase) {
    const { data: existing, error: readErr } = await supabase
      .from(TABLE_NAME)
      .select('nombre_punto');

    if (readErr) {
      throw new Error(`Error al consultar Supabase: ${readErr.message}`);
    }

    const existingNames = new Set((existing ?? []).map((r) => String(r.nombre_punto)));
    const toInsert = SEED_EXAMPLES.filter((s) => !existingNames.has(s.nombre_punto));

    if (toInsert.length > 0) {
      const { error: insertErr } = await supabase.from(TABLE_NAME).insert(toInsert);
      if (insertErr) {
        throw new Error(`Error al cargar ejemplos en Supabase: ${insertErr.message}`);
      }
    }

    return listEntrances();
  }

  const records = ensureLocalStore();
  const existingNames = new Set(records.map((r) => r.nombre_punto));
  const now = new Date().toISOString();

  for (const example of SEED_EXAMPLES) {
    if (!existingNames.has(example.nombre_punto)) {
      records.push({
        id: crypto.randomUUID(),
        ...example,
        created_at: now,
        updated_at: now,
      });
    }
  }
  writeLocalStore(records);
  return filterRecords(records);
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '1mb' }));

  app.get('/api/config/status', (_req: Request, res: Response) => {
    res.json({
      mode: supabase ? 'supabase' : 'local',
      table: TABLE_NAME,
      configured: Boolean(supabase),
    });
  });

  app.get('/api/entrances', async (req: Request, res: Response) => {
    try {
      const tipo = typeof req.query.tipo === 'string' ? req.query.tipo : undefined;
      const q = typeof req.query.q === 'string' ? req.query.q : undefined;
      const rows = await listEntrances(tipo, q);
      res.json({ data: rows });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error interno del servidor';
      res.status(500).json({ error: message });
    }
  });

  app.post('/api/entrances', async (req: Request, res: Response) => {
    try {
      const validation = validateEntranceInput(req.body ?? {});
      if (!validation.valid || !validation.data) {
        res.status(400).json({
          error: 'Revisá los datos ingresados.',
          fieldErrors: validation.errors,
        });
        return;
      }

      const created = await createEntrance(validation.data);
      res.status(201).json({ data: created });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al crear el punto';
      res.status(500).json({ error: message });
    }
  });

  app.put('/api/entrances/:id', async (req: Request, res: Response) => {
    try {
      const id = String(req.params.id ?? '').trim();
      if (!id || id.length > 100) {
        res.status(400).json({ error: 'ID de registro inválido.' });
        return;
      }

      const validation = validateEntranceInput(req.body ?? {});
      if (!validation.valid || !validation.data) {
        res.status(400).json({
          error: 'Revisá los datos ingresados.',
          fieldErrors: validation.errors,
        });
        return;
      }

      const updated = await updateEntrance(id, validation.data);
      if (!updated) {
        res.status(404).json({ error: 'No se encontró el punto solicitado.' });
        return;
      }

      res.json({ data: updated });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al actualizar el punto';
      res.status(500).json({ error: message });
    }
  });

  app.delete('/api/entrances/:id', async (req: Request, res: Response) => {
    try {
      const id = String(req.params.id ?? '').trim();
      if (!id || id.length > 100) {
        res.status(400).json({ error: 'ID de registro inválido.' });
        return;
      }

      const deleted = await deleteEntrance(id);
      if (!deleted) {
        res.status(404).json({ error: 'No se encontró el punto solicitado.' });
        return;
      }

      res.json({ ok: true });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al eliminar el punto';
      res.status(500).json({ error: message });
    }
  });

  app.post('/api/entrances/seed', async (_req: Request, res: Response) => {
    try {
      const rows = await seedEntrances();
      res.json({ data: rows });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al cargar ejemplos';
      res.status(500).json({ error: message });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`AccesoUrbano server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
