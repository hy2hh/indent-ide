// Scanner
export { FileScanner } from './scanner/FileScanner.js';
export { FileWatcher } from './scanner/FileWatcher.js';
export type { ScanOptions, ScannedFile } from './scanner/FileScanner.js';
export type { FileChangeType, FileChangeEvent } from './scanner/FileWatcher.js';

// Parser
export { TreeSitterParser } from './parser/TreeSitterParser.js';
export { SymbolExtractor } from './parser/SymbolExtractor.js';
export type { ParsedFile, ParsedSymbol } from './parser/TreeSitterParser.js';
export type { SymbolIndex } from './parser/SymbolExtractor.js';

// Chunker
export { SemanticChunker } from './chunker/SemanticChunker.js';

// Embedder
export { EmbeddingService } from './embedder/EmbeddingService.js';
export { BatchProcessor } from './embedder/BatchProcessor.js';

// Store
export { VectorStore } from './store/VectorStore.js';
export { IndexManager } from './store/IndexManager.js';

// Graph
export { DependencyGraph } from './graph/DependencyGraph.js';
export { GraphRanker } from './graph/GraphRanker.js';
export type { RankedNode } from './graph/GraphRanker.js';

// Retriever
export { ContextRetriever } from './retriever/ContextRetriever.js';
export { TokenBudget } from './retriever/TokenBudget.js';
export type { RetrievalQuery } from './retriever/ContextRetriever.js';

// Context Manager (Manus Strategies)
export { ContextCompactor } from './context-manager/ContextCompactor.js';
export { TrajectoryStore } from './context-manager/TrajectoryStore.js';
export { TrajectorySummarizer } from './context-manager/TrajectorySummarizer.js';
export { ContextWindowManager } from './context-manager/ContextWindowManager.js';
export type { CompactedResult } from './context-manager/ContextCompactor.js';
export type { AgentContextConfig } from './context-manager/ContextWindowManager.js';

// MCP Server
export { ContextMcpServer } from './mcp/ContextMcpServer.js';
