export type MigrationFile = { path: string; sql: string };
export type AnalysisReport = {
  projectName: string;
  scannedAt: string;
  filesScanned: number;
  migrations: MigrationFile[];
  edgeFunctions: string[];
  envVariableNames: string[];
  indicators: string[];
  findings: { level: "warning" | "critical"; text: string }[];
  capabilities: {
    sqlMigrations: boolean;
    edgeFunctions: boolean;
    authUsers: boolean;
    storageObjects: boolean;
  };
};
