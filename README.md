# Lovable Migrator

Ferramenta local para analisar um projeto exportado do Lovable e aplicar arquivos SQL de `supabase/migrations` em um projeto Supabase próprio.

> **Escopo atual:** esta versão migra o schema e as alterações descritas nos arquivos SQL encontrados. Ela não é uma cópia integral do Supabase: não transfere automaticamente linhas de tabelas, usuários do Auth, arquivos do Storage, secrets nem faz deploy de Edge Functions.

## Requisitos

- Node.js 22
- pnpm 9+
- Projeto Supabase de destino
- Connection string PostgreSQL do destino

## Instalação e execução

```bash
corepack enable
pnpm install
pnpm dev
```

Abra http://localhost:3000.

## Fluxo recomendado

1. Exporte o projeto do Lovable como ZIP.
2. Envie o ZIP e clique em **Analisar projeto**.
3. Revise cada arquivo SQL identificado em `supabase/migrations`.
4. Faça backup do projeto Supabase de destino.
5. Copie a URI PostgreSQL em **Supabase → Project Settings → Database → Connection string**.
6. Cole a URI no campo protegido e clique em **Testar conexão**.
7. Só depois de o teste passar, marque a confirmação e aplique as migrações.
8. Confira o schema e os dados no painel do Supabase e execute testes funcionais do aplicativo.

### Senhas com caracteres especiais

Codifique a senha exatamente uma vez antes de colocá-la na URI. No console do navegador local, pode usar:

```js
encodeURIComponent(prompt("Senha do banco (não compartilhe com ninguém):"))
```

Não cole senhas ou connection strings em chamados, mensagens ou repositórios.

## Segurança e comportamento das migrações

- O ZIP é analisado em memória; o código contido nele não é executado.
- Os valores dos arquivos `.env` não são exibidos no relatório.
- A connection string é enviada ao endpoint para testar/aplicar e não é persistida pelo aplicativo.
- O endpoint aceita hosts oficiais do Supabase em formato Direct ou Pooler, com portas 5432/6543.
- O botão de aplicar só é liberado após teste bem-sucedido da mesma URI.
- O migrador cria `public._lovable_migrator_history`, guardando nome, SHA-256 e data de cada migration aplicada por esta ferramenta.
- Migrações já registradas com o mesmo checksum são ignoradas. Se o mesmo arquivo aparecer com conteúdo diferente, a execução é interrompida.
- Cada arquivo SQL e seu registro de histórico são executados na mesma transação. Um advisory lock evita duas execuções simultâneas desta ferramenta.
- Arquivos com comandos incompatíveis com transações (por exemplo, `CREATE INDEX CONCURRENTLY`) precisam de tratamento manual.

**Importante para quem já tentou migrar com versões anteriores:** versões anteriores não mantinham histórico. Antes de executar novamente, compare os arquivos SQL com o banco de destino e confirme manualmente quais alterações já foram aplicadas. O histórico novo não consegue reconstruir retroativamente uma execução antiga.

Use localmente ou em ambiente privado com HTTPS e autenticação. Não exponha o dashboard publicamente sem proteção. Revise SQL e faça backup antes de executar.

## Limitações atuais

- Não copia automaticamente dados das tabelas.
- Não migra usuários/senhas do Supabase Auth.
- Não copia objetos do Storage nem políticas/segredos externos automaticamente.
- Detecta nomes de Edge Functions e variáveis, mas não faz deploy de funções nem transfere secrets.
- Não garante compatibilidade de extensões, triggers, permissões, RLS ou integrações externas; revise e teste no projeto de destino.

## Estrutura

- `apps/dashboard`: interface web e API
- `apps/extension`: base da extensão Chrome
- `packages/scanner`: scanner CLI
