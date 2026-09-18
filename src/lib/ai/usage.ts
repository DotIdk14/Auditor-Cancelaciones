export interface LlmUsageLog {
  provider: 'openrouter';
  model: string;
  task: string;
  inputTokens?: number;
  outputTokens?: number;
  latencyMs: number;
  fallbackUsed: boolean;
}

export interface AuditUsageSummary {
  llmCalls: number;
  inputTokens: number;
  outputTokens: number;
  visionCalls: number;
  fallbackCalls: number;
}

export class UsageCollector {
  private logs: LlmUsageLog[] = [];

  record(log: LlmUsageLog): void {
    this.logs.push(log);
    console.info('llm_usage', JSON.stringify(log));
  }

  summary(): AuditUsageSummary {
    return this.logs.reduce<AuditUsageSummary>((acc, log) => {
      acc.llmCalls += 1;
      acc.inputTokens += log.inputTokens || 0;
      acc.outputTokens += log.outputTokens || 0;
      if (log.task.includes('vision') || log.task.includes('image') || log.task.includes('scanned_pdf')) acc.visionCalls += 1;
      if (log.fallbackUsed) acc.fallbackCalls += 1;
      return acc;
    }, { llmCalls: 0, inputTokens: 0, outputTokens: 0, visionCalls: 0, fallbackCalls: 0 });
  }

  all(): LlmUsageLog[] {
    return [...this.logs];
  }
}
