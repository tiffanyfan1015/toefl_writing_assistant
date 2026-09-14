import { api } from "../api";
import type { WritingSearchResponse } from "../types/writingSearch";

export async function fetchWritingSearch(
  q: string,
): Promise<WritingSearchResponse> {
  const res = await api.get<WritingSearchResponse>("/writing-search", {
    params: { q },
  });
  return res.data;
}
