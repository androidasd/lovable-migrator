export type ValidatedConnection = {
  connectionString: string;
  host: string;
  mode: "direct" | "pooler";
};

export function validateSupabaseConnectionString(input: string): ValidatedConnection {
  const connectionString = input.trim();
  if (!connectionString) throw new Error("Cole a connection string completa do Supabase.");
  if (/\s/.test(connectionString)) {
    throw new Error("A conexão contém espaços ou quebras de linha. Cole a URI em uma única linha.");
  }
  let url: URL;
  try {
    url = new URL(connectionString);
  } catch {
    throw new Error("Formato inválido. Copie a URI PostgreSQL em Supabase → Project Settings → Database → Connection string.");
  }
  if (url.protocol !== "postgresql:" && url.protocol !== "postgres:") {
    throw new Error("A URI deve começar com postgresql:// ou postgres://.");
  }
  if (url.hash) {
    throw new Error("Foi encontrado um # não codificado na URI. Codifique a senha com encodeURIComponent.");
  }
  if (!url.username || !url.password) {
    throw new Error("A URI precisa conter usuário e senha: postgresql://USUARIO:SENHA@HOST:PORTA/postgres.");
  }
  try {
    decodeURIComponent(url.username);
    decodeURIComponent(url.password);
  } catch {
    throw new Error("A URI contém uma sequência % inválida. Codifique a senha uma única vez com encodeURIComponent.");
  }
  const host = url.hostname.toLowerCase();
  const isDirect = /^db\.[a-z0-9-]+\.supabase\.co$/.test(host);
  const isPooler = /^[a-z0-9-]+\.pooler\.supabase\.com$/.test(host);
  if (!isDirect && !isPooler) {
    throw new Error("Host não reconhecido. Copie a connection string diretamente do painel do projeto Supabase de destino.");
  }
  if (!url.port || !["5432", "6543"].includes(url.port)) {
    throw new Error("Porta inválida. Use a porta indicada na connection string do Supabase (geralmente 5432 ou 6543).");
  }
  if (url.pathname !== "/postgres") {
    throw new Error("O nome do banco no final da URI deve ser /postgres.");
  }
  return { connectionString, host, mode: isPooler ? "pooler" : "direct" };
}
