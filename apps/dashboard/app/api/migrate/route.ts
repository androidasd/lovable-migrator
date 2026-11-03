import { createHash } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import postgres from "postgres";
import { z } from "zod";
import { validateSupabaseConnectionString } from "../../../lib/connection";

export const runtime = "nodejs";
export const maxDuration = 300;

const schema = z.object({
  connectionString: z.string().min(20).max(2000),
  migrations: z.array(z.object({
    path: z.string().regex(/^supabase\/migrations\/[\w.-]+\.sql$/),
    sql: z.string().min(1).max(2_000_000)
  })).min(1).max(500),
  confirm: z.literal("APLICAR MIGRAÇÕES")
});

export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (origin && origin !== request.nextUrl.origin) return NextResponse.json({ error: "Origem não autorizada." }, { status: 403 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ success: false, error: "Dados inválidos. Confira a connection string, os arquivos SQL e a confirmação." }, { status: 400 });
  const { connectionString, migrations } = parsed.data;
  let validatedConnection: string;
  try { ({ connectionString: validatedConnection } = validateSupabaseConnectionString(connectionString)); }
  catch (error) { return NextResponse.json({ success: false, error: error instanceof Error ? error.message : "Connection string inválida." }, { status: 400 }); }

  let db: ReturnType<typeof postgres> | undefined;
  let lockAcquired = false;
  const completed: string[] = [];
  const skipped: string[] = [];
  try {
    db = postgres(validatedConnection, { max: 1, connect_timeout: 15, idle_timeout: 5, prepare: false, ssl: "require" });
    await db`select 1`;
    await db`select pg_advisory_lock(hashtext($$lovable-migrator-migrations$$))`;
    lockAcquired = true;
    await db`create table if not exists public._lovable_migrator_history (filename text primary key, checksum text not null, applied_at timestamptz not null default now())`;
    for (const migration of migrations) {
      const checksum = createHash("sha256").update(migration.sql, "utf8").digest("hex");
      const previous = await db`select checksum from public._lovable_migrator_history where filename = ${migration.path} limit 1`;
      if (previous.length > 0) {
        if (previous[0].checksum !== checksum) throw new Error("A migration já consta no histórico, mas seu conteúdo mudou: " + migration.path + ". Não foi reaplicada. Verifique o arquivo e o banco manualmente.");
        skipped.push(migration.path);
        continue;
      }
      await db.begin(async (tx) => {
        await tx.unsafe(migration.sql);
        await tx`insert into public._lovable_migrator_history (filename, checksum) values (${migration.path}, ${checksum})`;
      });
      completed.push(migration.path);
    }
    return NextResponse.json({ success: true, completed, skipped, message: "Processamento concluído. Migrações já registradas foram ignoradas; novas migrações foram aplicadas individualmente em transações." });
  } catch (error) {
    const raw = error instanceof Error ? error.message : "Falha ao executar migração.";
    const safe = /cannot run inside a transaction block/i.test(raw) ? "Uma instrução deste arquivo não pode ser executada dentro de uma transação (por exemplo, CREATE INDEX CONCURRENTLY). Esse arquivo precisa de tratamento manual antes de continuar." : raw.slice(0, 500);
    return NextResponse.json({ success: false, completed, skipped, error: safe, message: "A execução parou no primeiro erro. As migrações concluídas foram registradas no histórico; a migração com erro foi revertida quando o PostgreSQL permitiu." }, { status: 422 });
  } finally {
    if (db && lockAcquired) await db`select pg_advisory_unlock(hashtext($$lovable-migrator-migrations$$))`.catch(() => undefined);
    if (db) await db.end({ timeout: 5 }).catch(() => undefined);
  }
}