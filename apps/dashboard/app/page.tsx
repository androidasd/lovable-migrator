"use client";

import { useMemo, useState } from "react";
import type { AnalysisReport } from "../lib/types";

type MigrationResult = { success: boolean; completed: string[]; skipped?: string[]; error?: string; message: string };

export default function Home() {
  const [report, setReport] = useState<AnalysisReport | null>(null);
  const [connectionString, setConnectionString] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<MigrationResult | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState("");
  const [connectionValidatedFor, setConnectionValidatedFor] = useState("");

  const totalSqlBytes = useMemo(() => report?.migrations.reduce((n, m) => n + m.sql.length, 0) ?? 0, [report]);

  async function analyze() {
    if (!file) return;
    setBusy(true); setError(""); setResult(null); setReport(null);
    try {
      const body = new FormData(); body.append("file", file);
      const response = await fetch("/api/analyze", { method: "POST", body });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Falha na análise.");
      setReport(data);
    } catch (e) { setError(e instanceof Error ? e.message : "Falha na análise."); }
    finally { setBusy(false); }
  }

  async function testConnection() {
    if (!connectionString.trim()) return;
    setBusy(true); setError(""); setConnectionStatus(""); setConnectionValidatedFor("");
    try {
      const response = await fetch("/api/test-connection", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ connectionString })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Não foi possível testar a conexão.");
      setConnectionStatus(data.message || "Conexão validada.");
      setConnectionValidatedFor(connectionString.trim());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha ao testar conexão.");
    } finally {
      setBusy(false);
    }
  }

  async function migrate() {
    if (!report || !confirmed || !connectionString.trim() || connectionValidatedFor !== connectionString.trim()) {
      setError("Teste a conexão com sucesso antes de aplicar as migrações.");
      return;
    }
    setBusy(true); setError(""); setResult(null);
    try {
      const response = await fetch("/api/migrate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          connectionString,
          migrations: report.migrations,
          confirm: "APLICAR MIGRAÇÕES"
        })
      });
      const data = await response.json();
      setResult(data);
      if (!response.ok) setError(data.error || "A migração não foi concluída.");
    } catch (e) { setError(e instanceof Error ? e.message : "Falha na migração."); }
    finally { setBusy(false); }
  }

  return (
    <main className="shell">
      <header className="topbar">
        <div className="brand"><span className="brandMark">LM</span><div><strong>Lovable Migrator</strong><small>Migration workspace</small></div></div>
        <span className="localBadge"><i /> Execução local</span>
      </header>

      <section className="hero">
        <div className="eyebrow">SUPABASE · MIGRAÇÃO ASSISTIDA</div>
        <h1>Seu projeto. Seu Supabase.<br /><span>Seu controle.</span></h1>
        <p>Analise um projeto exportado do Lovable, revise as migrações SQL e aplique-as em um projeto Supabase próprio.</p>
      </section>

      <section className="panel">
        <div className="stepTitle"><span>01</span><div><h2>Importar projeto</h2><p>Envie o ZIP exportado do Lovable para análise local.</p></div></div>
        <label className="dropzone">
          <input type="file" accept=".zip,application/zip" onChange={e => { setFile(e.target.files?.[0] ?? null); setReport(null); setResult(null); }} />
          <span className="uploadIcon">↑</span>
          <strong>{file ? file.name : "Selecione o ZIP do seu projeto"}</strong>
          <small>{file ? `${(file.size / 1024 / 1024).toFixed(2)} MB · pronto para analisar` : "Arraste ou clique para escolher · máximo 25 MB"}</small>
        </label>
        <button className="primary" onClick={analyze} disabled={!file || busy}>{busy ? "Processando..." : "Analisar projeto"}</button>
      </section>

      {report && <>
        <section className="stats">
          <div className="stat"><small>ARQUIVOS ANALISADOS</small><strong>{report.filesScanned}</strong></div>
          <div className="stat"><small>MIGRAÇÕES SQL</small><strong>{report.migrations.length}</strong></div>
          <div className="stat"><small>EDGE FUNCTIONS</small><strong>{report.edgeFunctions.length}</strong></div>
          <div className="stat"><small>VARIÁVEIS ENCONTRADAS</small><strong>{report.envVariableNames.length}</strong></div>
        </section>

        <section className="panel">
          <div className="stepTitle"><span>02</span><div><h2>Resultado da análise</h2><p>{report.projectName} · {new Date(report.scannedAt).toLocaleString("pt-BR")}</p></div></div>
          {report.findings.map((finding, i) => <div className={finding.level === "critical" ? "notice danger" : "notice"} key={i}>{finding.text}</div>)}
          <h3>Arquivos SQL encontrados</h3>
          {report.migrations.length === 0 ? <p className="muted">Nenhuma migração SQL foi localizada.</p> : report.migrations.map(m => <div className="migration" key={m.path}>
            <button className="fileRow" onClick={() => setExpanded(expanded === m.path ? null : m.path)}><span>▤</span>{m.path}<b>{expanded === m.path ? "−" : "+"}</b></button>
            {expanded === m.path && <pre className="sqlPreview">{m.sql.slice(0, 12000)}{m.sql.length > 12000 ? "\n… prévia limitada a 12.000 caracteres" : ""}</pre>}
          </div>)}
          <h3>Outros componentes detectados</h3>
          <div className="tagList">{report.indicators.map(x => <span key={x}>{x}</span>)}{report.edgeFunctions.map(x => <span key={x}>Edge Function: {x}</span>)}</div>
          <h3>Nomes das variáveis de ambiente</h3>
          <div className="tagList">{report.envVariableNames.map(x => <span key={x}>{x}</span>)}</div>
          <p className="muted small">Os valores dos arquivos .env não são mostrados. Edge Functions, usuários Auth e objetos Storage são identificados quando possível, mas ainda não são transferidos por esta versão.</p>
        </section>

        <section className="panel">
          <div className="stepTitle"><span>03</span><div><h2>Conectar Supabase próprio</h2><p>Informe a conexão PostgreSQL do projeto de destino.</p></div></div>
          <label className="fieldLabel" htmlFor="dburl">Connection string PostgreSQL</label>
          <input id="dburl" className="textInput" type="password" autoComplete="off" placeholder="postgresql://USUARIO:SENHA@HOST:5432/postgres" value={connectionString} onChange={e => { setConnectionString(e.target.value); setConnectionStatus(""); setConnectionValidatedFor(""); }} />
          <p className="muted small">Copie a URI em Supabase → Project Settings → Database → Connection string. Session Pooler normalmente usa usuário postgres.PROJECT_REF. Se a senha tiver caracteres especiais, codifique-a uma única vez com encodeURIComponent. A string não é salva pelo app.</p>
          <div className="notice danger">Atenção: migrações SQL podem criar, alterar ou apagar estruturas e dados. Faça backup do destino e revise cada arquivo. Se você já tentou migrar com uma versão anterior deste aplicativo, não execute novamente antes de conferir no Supabase quais alterações já foram aplicadas.</div>
          <label className="confirm"><input type="checkbox" checked={confirmed} onChange={e => setConfirmed(e.target.checked)} /> Revisei os arquivos SQL e tenho backup do projeto Supabase de destino.</label>
          <button className="secondary" onClick={testConnection} disabled={busy || !connectionString.trim()}>{busy ? "Verificando..." : "Testar conexão"}</button>
          {connectionStatus && <div className="notice success">{connectionStatus}</div>}
          {!connectionValidatedFor && <p className="muted small">O botão de aplicação só será liberado depois que o teste de conexão for aprovado para esta mesma URI.</p>}
          <button className="primary" onClick={migrate} disabled={busy || !confirmed || !connectionString.trim() || connectionValidatedFor !== connectionString.trim() || !report.migrations.length}>{busy ? "Processando..." : "Aplicar migrações SQL no Supabase"}</button>
          {result && <div className={result.success ? "notice success" : "notice danger"}><strong>{result.success ? "Migração concluída" : "Migração interrompida"}</strong><p>{result.message}</p>{result.completed?.length > 0 && <p>{result.completed.length} arquivo(s) aplicado(s): {result.completed.join(", ")}</p>}{result.skipped?.length ? <p>{result.skipped.length} arquivo(s) já registrados e ignorados: {result.skipped.join(", ")}</p> : null}</div>}
        </section>
      </>}

      {error && <div className="notice danger">{error}</div>}
      <footer>Lovable Migrator · 0.3 · Não transfere automaticamente Auth, Storage ou dados de tabelas nesta versão.</footer>
    </main>
  );
}
