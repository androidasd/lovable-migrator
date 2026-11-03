import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";

const ignored = new Set(["node_modules", ".git", ".next", "dist", "build"]);

async function walk(root: string): Promise<string[]> {
  const result: string[] = [];
  const queue = [root];

  while (queue.length) {
    const dir = queue.pop()!;
    for (const entry of await readdir(dir, { withFileTypes: true })) {
      if (entry.isSymbolicLink() || ignored.has(entry.name)) continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) queue.push(full);
      else if (entry.isFile()) {
        result.push(full);
        if (result.length > 20000) throw new Error("Limite de 20.000 arquivos excedido.");
      }
    }
  }
  return result;
}

export async function scanProject(input: string) {
  const root = path.resolve(input);
  if (!(await stat(root)).isDirectory()) throw new Error("Informe o caminho de uma pasta.");

  const files = await walk(root);
  const rel = (file: string) => path.relative(root, file).split(path.sep).join("/");
  const paths = files.map(rel);
  const migrations = paths
    .filter((item) => /^supabase\/migrations\/.+\.sql$/i.test(item))
    .sort();
  const edgeFunctions = [...new Set(
    paths
      .filter((item) => /^supabase\/functions\/[^/]+\//i.test(item))
      .map((item) => item.split("/")[2])
  )].sort();

  const envNames = new Set<string>();
  const envFiles = files.filter((file) =>
    /^\.env(?:\..+)?$/.test(path.basename(file)) && !file.endsWith(".example")
  );

  for (const file of envFiles) {
    const fileStat = await stat(file);
    if (fileStat.size > 2_000_000) continue;
    const body = await readFile(file, "utf8");
    for (const line of body.split(/\r?\n/)) {
      const match = line.match(/^\s*(?:export\s+)?([A-Z][A-Z0-9_]*)\s*=/);
      if (match) envNames.add(match[1]);
    }
  }

  const indicators = new Set<string>();
  for (const file of files.filter((item) => path.basename(item) === "package.json")) {
    try {
      const manifest = JSON.parse(await readFile(file, "utf8"));
      const deps = { ...manifest.dependencies, ...manifest.devDependencies };
      if (deps["@supabase/supabase-js"]) indicators.add("@supabase/supabase-js");
      if (deps["@supabase/ssr"]) indicators.add("@supabase/ssr");
    } catch {
      // Ignora manifests inválidos e continua a análise.
    }
  }

  const findings: Array<{ severity: "warning" | "critical"; code: string; message?: string }> = [];
  if (!paths.some((item) => item.startsWith("supabase/")) && !indicators.size) {
    findings.push({ severity: "warning", code: "SUPABASE_NOT_DETECTED" });
  }
  if (!migrations.length) findings.push({ severity: "warning", code: "NO_SQL_MIGRATIONS" });
  if ([...envNames].some((name) => /SERVICE_ROLE|SECRET|TOKEN|PASSWORD|PRIVATE_KEY/i.test(name))) {
    findings.push({
      severity: "critical",
      code: "SENSITIVE_ENV_KEYS_PRESENT",
      message: "Nomes potencialmente sensíveis detectados; valores foram omitidos."
    });
  }

  return {
    scannedAt: new Date().toISOString(),
    root,
    filesScanned: files.length,
    supabaseDirectoryFound: paths.some((item) => item.startsWith("supabase/")),
    migrations,
    edgeFunctions,
    envVariableNames: [...envNames].sort(),
    indicators: [...indicators].sort(),
    findings
  };
}
