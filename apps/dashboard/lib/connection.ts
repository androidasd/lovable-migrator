export function validateSupabaseConnectionString(input: string): { connectionString: string; host: string } {
  const connectionString = input.trim();
  if (!connectionString || /\\s/.test(connectionString)) {
    throw new Error("A conexão contém espaços ou está vazia. Cole a URI completa sem espaços.");
  }

  let url: URL;
  try {
    url = new URL(connectionString);
  } catch {
    throw new Error("Formato inválido. Use postgresql://USUARIO:SENHA@HOST:5432/postgres.");
  }

  if (url.protocol !== "postgresql:" && url.protocol !== "postgres:") {
    throw new Error("A conexão deve começar com postgresql:// ou postgres://.");
  }
  if (url.hash) {
    throw new Error("A senha contém # sem codificação. Codifique caracteres especiais com encodeURIComponent.");
  }
  if (!url.username || !url.password) {
    throw new Error("Informe usuário e senha na connection string.");
  }

  try {
    decodeURIComponent(url.username);
    decodeURIComponent(url.password);
  } catch {
    throw new Error("A senha ou o usuário contém uma codificação % inválida. Codifique a senha uma única vez.");
  }

  const host = url.hostname.toLowerCase();
  const validHost =
    /^db\\.[a-z0-9-]+\\.supabase\\.co$/.test(host) ||
    /^[a-z0-9-]+\\.pooler\\.supabase\\.com$/.test(host);

  if (!validHost) {
    throw new Error("Host não reconhecido. Use a connection string copiada do painel do Supabase.");
  }
  if (url.port && url.port !== "5432" && url.port !== "6543") {
    throw new Error("Porta não reconhecida. Para Supabase, confira a porta 5432 ou 6543 no painel.");
  }
  if (url.pathname !== "/postgres") {
    throw new Error("O banco de dados no final da URI deve ser /postgres.");
  }

  return { connectionString, host };
}
