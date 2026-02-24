import type { StreamChunk } from '@intent-ide/core';

export interface ParsedStreamResult {
  text: string;
  codeBlocks: Array<{ language: string; code: string }>;
  jsonBlocks: unknown[];
  isComplete: boolean;
}

/**
 * CLI stdout 스트리밍 파싱
 * Claude Code, Codex, Gemini의 출력 형식을 파싱
 */
export class StreamParser {
  private buffer = '';
  private result: ParsedStreamResult = {
    text: '',
    codeBlocks: [],
    jsonBlocks: [],
    isComplete: false,
  };

  process(chunk: StreamChunk): ParsedStreamResult {
    if (chunk.type === 'done') {
      this.result.isComplete = true;
      return this.result;
    }

    if (chunk.type === 'text') {
      this.buffer += chunk.content;
      this.parseBuffer();
    }

    return this.result;
  }

  async collectAll(stream: AsyncIterable<StreamChunk>): Promise<ParsedStreamResult> {
    for await (const chunk of stream) {
      this.process(chunk);
      if (this.result.isComplete) {
        break;
      }
    }
    this.parseBuffer();
    return this.result;
  }

  private parseBuffer(): void {
    this.result.text = this.buffer;
    this.extractCodeBlocks();
    this.extractJsonBlocks();
  }

  private extractCodeBlocks(): void {
    const codeBlockRegex = /```(\w*)\n([\s\S]*?)```/g;
    const blocks: Array<{ language: string; code: string }> = [];
    let match: RegExpExecArray | null;

    while ((match = codeBlockRegex.exec(this.buffer)) !== null) {
      blocks.push({
        language: match[1] ?? 'text',
        code: match[2] ?? '',
      });
    }

    this.result.codeBlocks = blocks;
  }

  private extractJsonBlocks(): void {
    const jsonBlocks: unknown[] = [];

    // Try to parse stream-json format (one JSON per line)
    const lines = this.buffer.split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
        try {
          jsonBlocks.push(JSON.parse(trimmed));
        } catch {
          // Not valid JSON, skip
        }
      }
    }

    if (jsonBlocks.length === 0) {
      // Try whole buffer as JSON
      try {
        jsonBlocks.push(JSON.parse(this.buffer));
      } catch {
        // Not JSON
      }
    }

    this.result.jsonBlocks = jsonBlocks;
  }

  reset(): void {
    this.buffer = '';
    this.result = {
      text: '',
      codeBlocks: [],
      jsonBlocks: [],
      isComplete: false,
    };
  }

  getBuffer(): string {
    return this.buffer;
  }
}
