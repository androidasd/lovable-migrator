export type FindingSeverity = "info" | "warning" | "critical";

export interface Finding {
  severity: FindingSeverity;
  code: string;
  message: string;
  path?: string;
}

export interface ProjectReport {
  scannedAt: string;
  root: string;
  filesScanned: number;
  supabaseDirectoryFound: boolean;
  migrations: string[];
  edgeFunctions: string[];
  envVariableNames: string[];
  indicators: string[];
  findings: Finding[];
}
