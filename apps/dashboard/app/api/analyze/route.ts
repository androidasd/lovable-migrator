import { NextRequest, NextResponse } from "next/server";
import { unzipSync, strFromU8 } from "fflate";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_UPLOAD = 25 * 1024 * 1024;
const MAX_FILES = 5000;

export async function POST(request: NextRequest) {
  try {
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File) || !file.name.toLowerCase().endsWith(".zip")) {
      return NextResponse.json({ error: "Envie um arquivo ZIP do projeto." }, { status: 400 });
    }
    if (file.size > MAX_UPLOAD) {
      return NextResponse.json({ error: "O ZIP excede o limite de 25 MB." }, { status: 413 });
    }

    const archive = unzipSync(new Uint8Array(await file.arrayBuffer()));
    const paths = Object.keys(archive);
    if (paths.length > MAX_FILES) {
      return NextResponse.json({ error: "O ZIP contém arquivos demais para análise." }, { status: 413 });
    }

    const migrations = paths
      .filter((p) => /^supabase\/migrations\/[\w.-]+\.sql$/i.test(p))
      .sort()
      .map((path) => ({ path, sql: strFromU8(archive[path]) }));

    const edgeFunctions = [...new Set(paths
      .filter((p) => /^supabase\/functions\/[^/]+\//i.test(p))
      .map((p) => p.split("/")[2]))].sort();

    const envNames = new Set<string>();
    for (const path of paths.filter((p) => /(^|\/)\.env(?:\.[\w.-]+)?$/.test(p))) {
      if (/\.example$/.test(path)) continue;
      const content = strFromU8(archive[path]);
      for (const line of content.split(/\r?\n/)) {
        const match = line.match(/^\s*(?:export\s+)?([A-Z][A-Z0-9_]*)\s*=/);
        if (match) envNames.add(match[1]);
      }
    }

    const packageFiles = paths.filter((p) => p.endsWith("package.json"));
    const indicators = new Set<string>();
    for (const path of packageFiles) {
      try {
        const json = JSON.parse(strFromU8(archive[path]));
        const deps = { ...json.dependencies, ...json.devDependencies };
        if (deps["@supabase/supabase-js"]) indicators.add("@supabase/supabase-js");
        if (deps["@supabase/ssr"]) indicators.add("@supabase/ssr");
      } catch { /* arquivo de configuração inválido: ignorar */ }
    }

    const findings = [];
    if (!migrations.length) findings.push({ level: "warning", text: "Nenhuma migração SQL foi encontrada em supabase/migrations." });
    if (!paths.some((p) => p.startsWith("supabase/"))) findings.push({ level: "warning", text: "Pasta supabase não encontrada." });
    if ([...envNames].some((name) => /SERVICE_ROLE|SECRET|TOKEN|PASSWORD|PRIVATE_KEY/i.test(name))) {
      findings.push({ level: "critical", text: "Há nomes de variáveis potencialmente sensíveis. Os valores não foram lidos para o relatório." });
    }

    return NextResponse.json({
      projectName: file.name.replace(/\.zip$/i, ""),
      scannedAt: new Date().toISOString(),
      filesScanned: paths.length,
      migrations,
      edgeFunctions,
      envVariableNames: [...envNames].sort(),
      indicators: [...indicators].sort(),
      findings,
      capabilities: {
        sqlMigrations: migrations.length > 0,
        edgeFunctions: edgeFunctions.length > 0,
        authUsers: false,
        storageObjects: false
      }
    });
  } catch {
    return NextResponse.json({ error: "Não foi possível ler o ZIP. Verifique se é um arquivo válido." }, { status: 400 });
  }
}
