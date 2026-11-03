import { writeFile } from "node:fs/promises";
import path from "node:path";
import { scanProject } from "./scanner.js";

const target = process.argv[2];
if (!target) {
  console.error("Uso: pnpm scan -- <pasta-do-projeto>");
  process.exit(2);
}

try {
  const report = await scanProject(target);
  const output = path.resolve("lovable-migrator-report.json");
  await writeFile(output, JSON.stringify(report, null, 2) + "\n", "utf8");
  console.log(`Análise concluída: ${report.filesScanned} arquivos; ${report.migrations.length} migrações SQL; ${report.edgeFunctions.length} Edge Functions.`);
  console.log(`Relatório: ${output}`);
  if (report.findings.some((finding) => finding.severity === "critical")) process.exitCode = 1;
} catch (error) {
  console.error(error instanceof Error ? error.message : "Falha no scanner.");
  process.exit(1);
}
