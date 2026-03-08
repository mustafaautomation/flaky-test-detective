import { ParsedRunResult } from '../core/types';

export abstract class BaseParser {
  abstract name: string;
  abstract canParse(content: string): boolean;
  abstract parse(content: string): ParsedRunResult;
}

export function detectParser(parsers: BaseParser[], content: string): BaseParser | null {
  for (const parser of parsers) {
    if (parser.canParse(content)) {
      return parser;
    }
  }
  return null;
}
