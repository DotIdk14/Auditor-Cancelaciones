import { createHash } from 'node:crypto';

export interface PolicyHashInput {
  sourceText: string | null;
  numerals: Array<{
    code: string;
    title: string | null;
    text: string;
    orderIndex: number;
    processArea: string | null;
    effectiveFrom: string | null;
    effectiveTo: string | null;
  }>;
}

function normalizeText(value: string | null): string | null {
  return value === null ? null : value.replace(/\r\n/g, '\n').trim();
}

export function canonicalizePolicyContent(input: PolicyHashInput): string {
  const numerals = [...input.numerals]
    .sort((left, right) => left.code.localeCompare(right.code))
    .map((numeral) => ({
      code: numeral.code.trim(),
      title: normalizeText(numeral.title),
      text: normalizeText(numeral.text),
      orderIndex: numeral.orderIndex,
      processArea: normalizeText(numeral.processArea),
      effectiveFrom: numeral.effectiveFrom,
      effectiveTo: numeral.effectiveTo,
    }));

  return JSON.stringify({ sourceText: normalizeText(input.sourceText), numerals });
}

export function hashPolicyContent(input: PolicyHashInput): string {
  return createHash('sha256').update(canonicalizePolicyContent(input), 'utf8').digest('hex');
}
