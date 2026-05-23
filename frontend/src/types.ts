export interface Question {
  id: number;
  type: string;
  title: string;
  content: string;
}

export interface ErrorLog {
  id: number;
  errorType: string;
  incorrect: string;
  suggestion: string;
  explanation: string | null;
  important: boolean;
}

export interface Revision {
  id: number;
  text: string;
  score: number | null;
  feedback: string | null;
  errorLogs: ErrorLog[];
  createdAt: string;
}

export interface SubmissionResponse {
  id: number;
  currentText: string;
  revisions: ApiRevision[];
}

interface ApiErrorLog {
  id: number;
  errorType: string;
  incorrect: string;
  suggestion: string;
  explanation: string | null;
  important?: boolean;
}

interface ApiRevision {
  id: number;
  text: string;
  score: number | null;
  feedback: string | null;
  errorLogs?: ApiErrorLog[];
  createdAt: string;
}

export function mapRevision(rev: ApiRevision): Revision {
  return {
    id: rev.id,
    text: rev.text,
    score: rev.score,
    feedback: rev.feedback,
    createdAt: rev.createdAt,
    errorLogs: (rev.errorLogs ?? []).map((err) => ({
      id: err.id,
      errorType: err.errorType,
      incorrect: err.incorrect,
      suggestion: err.suggestion,
      explanation: err.explanation ?? null,
      important: err.important ?? false,
    })),
  };
}

export function mapRevisions(revisions: ApiRevision[]): Revision[] {
  return revisions.map(mapRevision);
}
