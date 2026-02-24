import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import type { ContextRetriever } from '../retriever/ContextRetriever.js';
import type { VectorStore } from '../store/VectorStore.js';

/**
 * Context Engine을 MCP 프로토콜로 외부에 노출
 * Claude Code, Codex 등 외부 에이전트가 코드베이스 컨텍스트 활용 가능
 */
export class ContextMcpServer {
  private server: Server;
  private retriever: ContextRetriever;
  private vectorStore: VectorStore;

  constructor(retriever: ContextRetriever, vectorStore: VectorStore) {
    this.retriever = retriever;
    this.vectorStore = vectorStore;
    this.server = new Server(
      { name: 'intent-ide-context', version: '0.1.0' },
      { capabilities: { tools: {} } }
    );
    this.setupHandlers();
  }

  private setupHandlers(): void {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: 'search_code',
          description: '시맨틱 코드 검색 - 의미 기반으로 관련 코드 찾기',
          inputSchema: {
            type: 'object',
            properties: {
              query: { type: 'string', description: '검색 쿼리' },
              topK: { type: 'number', description: '반환할 결과 수 (기본: 10)' },
              tokenBudget: { type: 'number', description: '최대 토큰 예산' },
            },
            required: ['query'],
          },
        },
        {
          name: 'get_project_summary',
          description: 'PageRank 기반 프로젝트 요약 및 핵심 파일 목록',
          inputSchema: {
            type: 'object',
            properties: {
              tokenBudget: { type: 'number', description: '최대 토큰 예산' },
            },
          },
        },
      ],
    }));

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      if (name === 'search_code') {
        const { query, topK = 10 } = args as { query: string; topK?: number };
        const result = await this.retriever.retrieve({
          query,
          agentId: 'mcp-client',
          agentRole: 'implementor',
          topK,
        });

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                result.chunks.map((r) => ({
                  filePath: r.chunk.filePath,
                  content: r.chunk.content,
                  score: r.score,
                  lines: `${r.chunk.startLine}-${r.chunk.endLine}`,
                })),
                null,
                2
              ),
            },
          ],
        };
      }

      if (name === 'get_project_summary') {
        const size = this.vectorStore.getSize();
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({ totalChunks: size }, null, 2),
            },
          ],
        };
      }

      throw new Error(`Unknown tool: ${name}`);
    });
  }

  getServer(): Server {
    return this.server;
  }
}
