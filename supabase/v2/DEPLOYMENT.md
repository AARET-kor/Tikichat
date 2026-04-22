# Schema v2 Deployment Guide

## Railway Environment Variables

### Step 1: Create fresh Supabase project
1. Go to supabase.com → New project
2. Copy the three connection values from Settings → API

### Step 2: Update Railway env vars

| Variable | Old value | New value | Notes |
|---|---|---|---|
| `SUPABASE_URL` | old project URL | new project URL | Settings → API → Project URL |
| `SUPABASE_ANON_KEY` | old anon key | new anon key | Settings → API → anon public |
| `SUPABASE_SERVICE_ROLE_KEY` | old service role key | new service role key | Settings → API → service_role |
| `VITE_SUPABASE_URL` | old project URL | new project URL | Same as SUPABASE_URL — used in Vite build |
| `VITE_SUPABASE_ANON_KEY` | old anon key | new anon key | Same as SUPABASE_ANON_KEY — used in Vite build |
| `CLINIC_ID` | "libhib-gangnam" (TEXT slug) | **DELETE THIS** | Replaced by CLINIC_SLUG |
| `CLINIC_SLUG` | (new) | "tiki-demo" | Human-readable slug; server resolves → UUID |

### Step 3: Apply migrations in order
Run 001 through 031 in the Supabase SQL Editor (or via supabase CLI):
```
001_extensions.sql
002_clinics.sql
003_clinic_users.sql
004_master_procedures.sql
005_procedures.sql
006_procedures_knowledge.sql
007_patients.sql
008_visits.sql
009_patient_links.sql
010_conversations.sql
011_forms.sql
012_patient_interactions.sql
013_patient_journey_events.sql
014_telemetry.sql
015_rls.sql
016_seed.sql
025_ops_board.sql
026_arrival_mode.sql
027_patient_ask.sql
028_escalation_triage.sql
029_rooms_lite.sql
030_tiki_room.sql
031_aftercare_engine.sql
```

### Step 4: Run embedding job
After seeding, the knowledge chunks have `embedding = NULL`.
Run the embedding population script (or trigger it via `/api/admin/embed`) to fill in the vectors before RAG queries will work.

### Step 5: Trigger Railway rebuild
Railway rebuilds automatically on env var changes (if auto-deploy is on).
Otherwise: Railway dashboard → Deploy → Redeploy.

The build runs `npm run build` (Vite) then starts `node server.js`.
Vite picks up the new `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` at build time.

---

## server.js Changes Required

### 1. Add CLINIC_SLUG startup resolution

Replace the old `CLINIC_ID` / `getClinicInfo(clinicId)` pattern with a startup
UUID resolution that caches the result.

```js
// At top of server.js — replace old CLINIC_ID references
let CLINIC_UUID = null; // Resolved once on startup, then cached

async function resolveClinicSlug(slug) {
  if (!slug) throw new Error('CLINIC_SLUG env var is required');
  const { data, error } = await supabaseAdmin
    .from('clinics')
    .select('id, clinic_name, clinic_short_name, location, settings')
    .eq('slug', slug)
    .maybeSingle();
  if (error) throw new Error(`Clinic slug resolution failed: ${error.message}`);
  if (!data) throw new Error(`No clinic found for slug: ${slug}`);
  return data;
}

// In your startup / listen block:
const CLINIC_SLUG = process.env.CLINIC_SLUG;
let clinicInfo = null;

app.listen(PORT, async () => {
  clinicInfo = await resolveClinicSlug(CLINIC_SLUG);
  CLINIC_UUID = clinicInfo.id;
  console.log(`[startup] Clinic resolved: ${clinicInfo.clinic_name} (${CLINIC_UUID})`);
  console.log(`[startup] Server listening on port ${PORT}`);
});
```

### 2. Replace all clinic_id TEXT queries with UUID

Every Supabase query that filters by clinic_id now uses `CLINIC_UUID` (UUID):

```js
// OLD (v1):
const resolvedClinicId = clinicId || process.env.CLINIC_ID;
supabaseAdmin.from('procedures').select('*').eq('clinic_id', resolvedClinicId)

// NEW (v2):
supabaseAdmin.from('procedures').select('*').eq('clinic_id', CLINIC_UUID)
```

Replace ALL occurrences of:
- `.eq('clinic_id', clinicId)` → `.eq('clinic_id', CLINIC_UUID)`
- `.eq('clinic_id', process.env.CLINIC_ID)` → `.eq('clinic_id', CLINIC_UUID)`
- `.eq('clinic_id', resolvedClinicId)` → `.eq('clinic_id', CLINIC_UUID)`

### 3. Update getClinicInfo()

```js
// OLD:
async function getClinicInfo(clinicId) {
  const { data } = await supabaseAdmin
    .from('clinics')
    .select('clinic_id, clinic_name, clinic_short_name, location, specialties')
    .eq('clinic_id', clinicId)
    .maybeSingle();
  return data;
}

// NEW: clinicInfo is already resolved at startup — just return it
// Delete getClinicInfo() and replace all calls with the cached clinicInfo:
//   clinicInfo.clinic_name, clinicInfo.clinic_short_name, etc.
```

### 4. Update RAG RPC calls (TEXT → UUID)

```js
// OLD (v1) — clinic_id_filter was TEXT:
const { data: ragResults } = await supabaseAdmin.rpc('match_procedures', {
  clinic_id_filter: clinicId,      // TEXT
  query_embedding: embedding,
  match_threshold: 0.75,
  match_count: 5,
});

// NEW (v2) — parameter names changed, type is UUID:
const { data: ragResults } = await supabaseAdmin.rpc('match_procedures', {
  p_clinic_id: CLINIC_UUID,        // UUID
  p_query_embedding: embedding,
  p_match_threshold: 0.75,
  p_match_count: 5,
});

// Same for keyword search:
// OLD: search_procedures_keyword({ clinic_id_filter: clinicId, query_text: q, match_count: 10 })
// NEW: search_procedures_keyword({ p_clinic_id: CLINIC_UUID, p_query: q, p_match_count: 10 })
```

### 5. Update audit_logs insert

```js
// audit_logs.clinic_id is TEXT in v2 (intentional — no FK)
// Pass CLINIC_UUID.toString() or CLINIC_SLUG — either works since it's TEXT:
await supabaseAdmin.from('audit_logs').insert({
  clinic_id: CLINIC_UUID,   // UUID auto-casts to text in Postgres
  endpoint: req.path,
  action: 'tiki_paste',
  model_used: MODEL_HAIKU,
  tokens_in: usage.input_tokens,
  tokens_out: usage.output_tokens,
  duration_ms: Date.now() - startTime,
  patient_id: patientId || null,
  session_type: 'tiki_paste',
  lang: detectedLang,
  rag_chunks_used: ragChunks.length,
});
```

### 6. Update patient_id references

In v2, `patients.id` is UUID. Any code that constructed or compared patient IDs
as TEXT strings must handle UUID values instead:

```js
// OLD: patient_id might be "whatsapp_+821099998888" or similar
// NEW: patient_id is always a UUID string like "550e8400-e29b-41d4-a716-446655440000"

// When looking up a patient by channel:
const { data: patient } = await supabaseAdmin
  .from('patients')
  .select('id, name, lang')
  .eq('clinic_id', CLINIC_UUID)
  .contains('channel_refs', { kakao: externalUserId })  // GIN @> query
  .maybeSingle();
```
