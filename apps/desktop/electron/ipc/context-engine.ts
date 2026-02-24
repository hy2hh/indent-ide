import type { IpcMain } from 'electron';
import {
  FileScanner,
  TreeSitterParser,
  SemanticChunker,
  EmbeddingService,
  BatchProcessor,
  VectorStore,
  IndexManager,
  ContextRetriever,
} from '@intent-ide/context-engine';

interface ContextEngineState {
  vectorStore: VectorStore | null;
  retriever: ContextRetriever | null;
  indexManager: IndexManager | null;
}

const state: ContextEngineState = {
  vectorStore: null,
  retriever: null,
  indexManager: null,
};

export function setupContextEngineIpc(ipcMain: IpcMain): void {
  ipcMain.handle('context:indexProject', async (event, projectPath: string) => {
    const storagePath = `${projectPath}/.intent-ide`;

    // Initialize services
    const vectorStore = new VectorStore({ storagePath: `${storagePath}/vectors` });
    await vectorStore.initialize();

    const indexManager = new IndexManager(storagePath);
    await indexManager.load();

    const embeddingService = new EmbeddingService({ provider: 'hash' });
    const batchProcessor = new BatchProcessor(embeddingService, {
      batchSize: 20,
      concurrency: 4,
      onProgress: (processed, total) => {
        const progress = Math.round((processed / total) * 100);
        event.sender.send('context:indexProgress', progress);
      },
    });

    const scanner = new FileScanner(projectPath);
    const files = await scanner.scan();

    const parser = new TreeSitterParser();
    const chunker = new SemanticChunker();

    let totalChunks = 0;

    for (const file of files) {
      if (!indexManager.needsIndexing(file)) {
        continue;
      }

      const parsed = await parser.parseFile(file.absolutePath, file.extension);
      const chunks = chunker.rechunk(parsed.chunks);
      const embedded = await batchProcessor.process(chunks);

      await vectorStore.upsert(embedded);
      indexManager.markIndexed(
        file.absolutePath,
        chunks.map((c) => c.id),
        file.modifiedAt
      );
      totalChunks += chunks.length;
    }

    indexManager.updateLastIndexed();
    await indexManager.save();

    state.vectorStore = vectorStore;
    state.indexManager = indexManager;
    state.retriever = new ContextRetriever(vectorStore, embeddingService);

    return {
      filesIndexed: files.length,
      totalChunks,
      stats: indexManager.getStats(),
    };
  });

  ipcMain.handle('context:search', async (_, query: string, agentRole: string) => {
    if (!state.retriever) {
      return { chunks: [], totalTokens: 0 };
    }

    const role = agentRole as 'coordinator' | 'implementor' | 'verifier';
    const window = await state.retriever.retrieve({
      query,
      agentId: 'desktop-user',
      agentRole: role,
    });

    return window;
  });

  ipcMain.handle('context:getStats', () => {
    if (!state.indexManager) {
      return null;
    }
    return state.indexManager.getStats();
  });
}
