export default function Home() {
  return (
    <main>
      <h1>Lovable Migrator</h1>
      <p>Plataforma de análise e migração segura de projetos Lovable.</p>
      <section className="panel">
        <h2>Scanner local disponível</h2>
        <p>
          O primeiro módulo identifica estrutura Supabase, migrações SQL,
          Edge Functions e nomes de variáveis de ambiente sem expor seus valores.
        </p>
        <p>A execução de migrações será habilitada após os módulos de backup e validação.</p>
      </section>
    </main>
  );
}
