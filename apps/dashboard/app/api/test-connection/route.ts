import { NextRequest, NextResponse } from "next/server";
import postgres from "postgres";
import { z } from "zod";
import { validateSupabaseConnectionString } from "../../../lib/connection";

export const runtime = "nodejs";
export const maxDuration = 30;

const schema = z.object({ connectionString: z.string().min(20).max(2000) });

export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (origin && origin !== request.nextUrl.origin) {
    return NextResponse.json({ error: "Origem não autorizada." }, { status: 403 });
  }

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: "Informe uma connection string completa." }, { status: 400 });
  }

  let connectionString: string;
  try {
    ({ connectionString } = validateSupabaseConnectionString(parsed.data.connectionString));
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Connection string inválida."
    }, { status: 400 });
  }

  let db: ReturnType<typeof postgres> | undefined;
  try {
    db = postgres(connectionString, {
      max: 1,
      connect_timeout: 12,
      idle_timeout: 3,
      prepare: false,
      ssl: "require"
    });
    await db`select 1`;
    return NextResponse.json({ success: true, message: "Conexão estabelecida com sucesso. Nenhuma migração foi executada." });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Falha ao conectar ao Supabase.";
    const safeMessage = /password authentication failed/i.test(message)
      ? "O Supabase recusou usuário ou senha. Confira a senha do banco e o usuário completo informado na URI do Session Pooler."
      : /getaddrinfo|ENOTFOUND|ECONNREFUSED|timeout/i.test(message)
        ? "Não foi possível alcançar o servidor. Confira host, porta e modo de conexão no painel Supabase."
        : message.slice(0, 300);
    return NextResponse.json({ success: false, error: safeMessage }, { status: 422 });
  } finally {
    if (db) await db.end({ timeout: 3 }).catch(() => undefined);
  }
}
