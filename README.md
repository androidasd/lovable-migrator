# Lovable Migrator

Aplicação local para analisar projetos exportados do Lovable e aplicar migrações SQL em um projeto Supabase próprio.

## Requisitos
- Node.js 20.9+
- pnpm 9+
- Projeto Supabase de destino e sua connection string PostgreSQL

## Iniciar
```bash
corepack enable
pnpm install
pnpm dev
```
Acesse http://localhost:3000.

## Usar
1. Exporte seu projeto Lovable em ZIP.
2. Envie o ZIP na tela inicial e clique em **Analisar projeto**.
3. Expanda e revise todos os arquivos SQL listados.
4. Faça backup do projeto Supabase de destino.
5. Copie a connection string em Supabase → Project Settings → Database.
6. Informe a connection string, confirme a revisão e aplique as migrações.

## Segurança
- O ZIP é analisado em memória; o código do projeto não é executado.
- Os valores dos arquivos .env não são incluídos no relatório.
- A connection string é enviada somente ao endpoint de migração e não é persistida pelo aplicativo.
- Execute localmente ou em ambiente privado com HTTPS. Nunca exponha o dashboard publicamente sem autenticação.
- Revise SQL antes de executar. Migrações podem alterar ou apagar estruturas e dados.

## Limitações desta versão
A versão 0.2 aplica migrações SQL encontradas em `supabase/migrations`. Identifica Edge Functions e nomes de variáveis, mas não transfere automaticamente dados das tabelas, usuários do Supabase Auth, objetos do Storage ou secrets das Edge Functions. Esses recursos exigem rotinas adicionais, credenciais de origem e validações específicas.

## Estrutura
- `apps/dashboard`: interface web e API
- `apps/extension`: base da extensão Chrome
- `packages/scanner`: scanner CLI
