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
  // Mitiga envio cross-site em implantações acidentais; o uso recomendado continua local.
  const origin = request.headers.get("origin");
  if (origin && origin !== request.nextUrl.origin) {
    return NextResponse.json({ error: "Origem não autorizada." }, { status: 403 });
  }

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Dados inválidos. Confirme a conexão, os arquivos SQL e a frase de confirmação." }, { s  let validatedConnection: string;
  try {
    ({ connectionString: validatedConnection } = validateSupabaseConnectionString(connectionString));
  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : "Connection string inválida."
    }, { status: 400 });
  }necte-se a um host PostgreSQL oficial do Supabase." }, { status: 400 });
  }

  let db: ReturnType<typeof postgres> | undefined;
  const completed: string[] = [];
  try {
    db = postgres(validatedConnection, {
      max: 1,
      connect_timeout: 15,
      idle_timeout: 5,
      prepare: false,
      ssl: "require"
    });

    await db`select 1`;
    for (const migration of migrations) {
      // O operador deve revisar os SQLs apresentados na interface antes da confirmação.
      await db.unsafe(migration.sql);
      completed.push(migration.path);
    }
    return NextResponse.json({
      success: true,
      completed,
      message: "Migrações SQL aplicadas. Revise o schema no painel do Supabase."
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      completed,
      error: error instanceof Error ? error.message.slice(0, 500) : "Falha ao executar migração.",
      message: "A execução parou no primeiro erro. Migrações já concluídas não foram revertidas automaticamente."
    }, { status: 422 });
  } finally {
    if (db) await db.end({ timeout: 5 }).catch(() => undefined);
  }
}
