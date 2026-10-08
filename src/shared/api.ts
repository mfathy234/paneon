import type { AgentsReport } from './agentTools'
import type { CliCommand, CliReply } from './cli'
import type { WorktreeStatus } from './compare'
import type { OpsSnapshot } from './opsFeed'
import type { UpdateState } from './updates'
import type {
  AgentKind,
  AppInfo,
  BridgePreview,
  BridgeResult,
  BridgeStatus,
  CodexSession,
  GeminiSession,
  FolderCheck,
  GitChanges,
  GitResult,
  NotifyRequest,
  QuickOpenKind,
  RepoProbe,
  ResumeEntry,
  ResumeQuery,
  ResumeSession,
  StatusInfo,
  SessionFile,
  Settings,
  SettingsLoadResult,
  SpawnRequest,
  SpawnResult,
  WorktreeRemoval,
  WorktreesResult
} from './types'

export interface GridApi {
  getSettings(): Promise<SettingsLoadResult>
  updateSettings(patch: Partial<Settings>): Promise<Settings>
  pickFolder(): Promise<string | null>
  pickImage(): Promise<string | null>
  checkFolder(path: string): Promise<FolderCheck>
  gitBranch(folder: string): Promise<string | null>
  listSessions(): Promise<SessionFile[]>
  onSessions(listener: (sessions: SessionFile[]) => void): () => void
  listCodexSessions(): Promise<CodexSession[]>
  onCodexSessions(listener: (sessions: CodexSession[]) => void): () => void
  listGeminiSessions(): Promise<GeminiSession[]>
  onGeminiSessions(listener: (sessions: GeminiSession[]) => void): () => void
  listStatus(): Promise<StatusInfo[]>
  onStatus(listener: (infos: StatusInfo[]) => void): () => void
  listOps(): Promise<OpsSnapshot[]>
  onOps(listener: (snapshots: OpsSnapshot[]) => void): () => void
  trackOps(sessionIds: string[]): void
  gitChanges(folder: string): Promise<GitChanges | null>
  gitFiles(folder: string): Promise<string[] | null>
  listResumable(agent: AgentKind, folder: string): Promise<ResumeEntry[]>
  listAllResumable(query: ResumeQuery): Promise<ResumeSession[]>
  quickOpen(kind: QuickOpenKind, folder: string): Promise<void>
  notify(request: NotifyRequest): void
  onNotifyClick(listener: (paneId: string) => void): () => void
  bridgePreview(): Promise<BridgePreview>
  bridgeStatus(): Promise<BridgeStatus>
  bridgeInstall(): Promise<BridgeResult>
  bridgeUninstall(): Promise<BridgeResult>
  spawn(request: SpawnRequest): Promise<SpawnResult>
  write(id: string, data: string): void
  resize(id: string, cols: number, rows: number): void
  kill(id: string): Promise<void>
  onData(listener: (id: string, data: string) => void): () => void
  onExit(listener: (id: string, exitCode: number) => void): () => void
  readClipboard(): Promise<string>
  writeClipboard(text: string): Promise<void>
  openExternal(url: string): Promise<void>
  appInfo(): Promise<AppInfo>
  checkAgents(force: boolean): Promise<AgentsReport>
  onCliRun(listener: (command: CliCommand) => Promise<CliReply>): void
  onCliNotice(listener: (text: string, ok: boolean) => void): () => void
  cliReady(): void
  getUpdateState(): Promise<UpdateState>
  onUpdateState(listener: (state: UpdateState) => void): () => void
  checkForUpdate(): Promise<void>
  downloadUpdate(): Promise<void>
  retryUpdate(): Promise<void>
  dismissUpdate(): Promise<void>
  restartToUpdate(): Promise<void>
  openUpdateLink(url: string): Promise<void>
  compareProbe(folder: string): Promise<RepoProbe>
  compareCreate(folder: string, short: string): Promise<WorktreesResult>
  compareStatus(repo: string, path: string, branch: string): Promise<WorktreeStatus>
  compareRemove(request: WorktreeRemoval): Promise<GitResult>
  onFlushRequest(listener: () => Promise<void>): void
}
