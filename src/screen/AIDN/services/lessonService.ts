import { LessonPlan } from '../types/node.types';

const BASE_URL = process.env.AIDN_API_URL ?? 'https://your-api.com'; // replace with env config

export interface FetchLessonOptions {
  lessonId: string;
  studentId: string;
  authToken: string;
}

/**
 * Fetch the initial lesson plan from the REST API.
 * Returns parsed LessonPlan with nodes array ready for the canvas.
 */
export async function fetchLessonPlan(opts: FetchLessonOptions): Promise<LessonPlan> {
  const { lessonId, studentId, authToken } = opts;

  const response = await fetch(`${BASE_URL}/lessons/${lessonId}/plan?studentId=${studentId}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${authToken}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`[LessonService] Failed to fetch lesson plan: ${response.status} ${errorBody}`);
  }

  const data: LessonPlan = await response.json();
  return data;
}

/**
 * Submit a node interaction result (MCQ answer, etc.) via REST fallback.
 * Prefer wsService.sendInteraction() when WS is connected.
 */
export async function submitInteraction(opts: {
  lessonId: string;
  nodeId: string;
  type: string;
  data: Record<string, unknown>;
  authToken: string;
}): Promise<void> {
  const { lessonId, nodeId, type, data, authToken } = opts;

  await fetch(`${BASE_URL}/lessons/${lessonId}/interactions`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${authToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ nodeId, type, data, timestamp: Date.now() }),
  });
}
