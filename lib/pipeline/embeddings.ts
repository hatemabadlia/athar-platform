import "server-only";
import { serverEnv } from "@/lib/env";

/**
 * Embedding provider for semantic recycled/duplicate detection (1024 dims, matches the DB column).
 * Claude has no embeddings endpoint; Voyage AI is used when VOYAGE_API_KEY is set.
 * Without it the pipeline uses trigram similarity + hashes only (stated in the stage detail).
 */
export interface EmbeddingProvider {
  name: string;
  embed(text: string): Promise<number[]>;
}

export function embeddingProvider(): EmbeddingProvider | null {
  const key = serverEnv().VOYAGE_API_KEY;
  if (!key) return null;
  return {
    name: "voyage-3.5",
    async embed(text: string) {
      const res = await fetch("https://api.voyageai.com/v1/embeddings", {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${key}` },
        body: JSON.stringify({ input: [text.slice(0, 8000)], model: "voyage-3.5", input_type: "document", output_dimension: 1024 }),
        signal: AbortSignal.timeout(20_000),
      });
      if (!res.ok) throw new Error(`embedding request failed: ${res.status}`);
      const json = (await res.json()) as { data?: { embedding: number[] }[] };
      const v = json.data?.[0]?.embedding;
      if (!v || v.length !== 1024) throw new Error("unexpected embedding shape");
      return v;
    },
  };
}

export const toPgVector = (v: number[] | null) => (v ? `[${v.join(",")}]` : null);
