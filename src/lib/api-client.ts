/**
 * api-client.ts — Real API client using React Query + fetch
 * All hooks connect to the Express backend via /api routes.
 */
import { useQuery, useMutation, useQueryClient, UseQueryOptions } from '@tanstack/react-query';
import { useAuth } from '@clerk/react';

const API_BASE = '/api';

// ─── Auth token helper ───────────────────────────────────────────────────────

let authTokenGetter: (() => string | null | Promise<string | null>) | null = null;

export function setAuthTokenGetter(getter: () => string | null | Promise<string | null>) {
  authTokenGetter = getter;
}

export function setBaseUrl(_url: string) {
  // no-op — kept for compatibility
}

// ─── Core fetch wrapper ──────────────────────────────────────────────────────

export async function customFetch(url: string, options: RequestInit = {}) {
  const token = authTokenGetter ? await authTokenGetter() : null;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const response = await fetch(`${API_BASE}${url}`, { ...options, headers });

  if (!response.ok) {
    let message = `API error: ${response.status}`;
    try {
      const body = await response.json();
      if (body?.error) message = body.error;
    } catch {}
    throw new Error(message);
  }

  return response.json();
}

// ─── Types ───────────────────────────────────────────────────────────────────

export interface User {
  id: number;
  clerkId: string;
  name: string | null;
  email: string;
  role: 'student' | 'instructor' | null;
  institutionName: string | null;
  subjectArea: string | null;
  trafficSource: string | null;
  createdAt: string;
}

export interface UserProfileUpdateRole {
  role: 'student' | 'instructor';
}

export interface Exam {
  id: number;
  instructorClerkId: string;
  title: string;
  description: string | null;
  subject: string | null;
  durationMinutes: number;
  status: 'draft' | 'published' | 'archived';
  gradingMode: 'auto' | 'manual';
  aiConfig: any;
  examType: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Question {
  id: number;
  examId: number;
  text: string;
  type: string;
  options: string[] | null;
  correctAnswer: string | null;
  referenceSolution: string | null;
  points: number;
  difficulty: string | null;
  order: number;
}

export interface ExamSession {
  id: number;
  examId: number;
  studentClerkId: string;
  studentEmail: string | null;
  studentName: string | null;
  accessCode: string;
  status: string;
  startedAt: string | null;
  completedAt: string | null;
  submittedAt: string | null;
  answers: Record<number, string> | null;
  score: number | null;
  maxScore: number | null;
  createdAt: string;
}

export interface CheatingFlag {
  id: number;
  sessionId: number;
  type: string;
  description: string | null;
  timestamp: string;
  reviewed: boolean;
  createdAt: string;
}

export interface GenerateQuestionsInputDifficulty {
  level: 'easy' | 'medium' | 'hard';
}

export interface GenerateQuestionsInputQuestionTypesItem {
  type: string;
  count: number;
}

// ─── Query key helpers ───────────────────────────────────────────────────────

export const getGetMeQueryKey = () => ['getMe'] as const;
export const getGetSessionQueryKey = (id?: string) => ['getSession', id] as const;
export const getListSessionsQueryKey = () => ['listSessions'] as const;
export const getListExamsQueryKey = () => ['listExams'] as const;
export const getGetExamResultsQueryKey = (id?: string) => ['getExamResults', id] as const;
export const getListQuestionsQueryKey = (id?: string) => ['listQuestions', id] as const;
export const getListSessionFlagsQueryKey = (id?: number) => ['listSessionFlags', id] as const;
export const getGetExamQueryKey = (id?: string) => ['getExam', id] as const;

// ─── User hooks ──────────────────────────────────────────────────────────────

export function useGetMe(opts?: { query?: Omit<UseQueryOptions<User>, 'queryKey' | 'queryFn'> }) {
  const { getToken } = useAuth();
  return useQuery<User>({
    queryKey: getGetMeQueryKey(),
    queryFn: async () => {
      const token = await getToken();
      const res = await fetch(`${API_BASE}/users/me`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      if (!res.ok) throw new Error(`GET /users/me failed: ${res.status}`);
      return res.json();
    },
    retry: false,
    ...opts?.query,
  });
}

export function useUpdateMe() {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();
  return useMutation<User, Error, { data: Partial<User> & { role?: string } }>({
    mutationFn: async ({ data }) => {
      const token = await getToken();
      const res = await fetch(`${API_BASE}/users/me`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        let msg = `PATCH /users/me failed: ${res.status}`;
        try { const b = await res.json(); if (b.error) msg = b.error; } catch {}
        throw new Error(msg);
      }
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.setQueryData(getGetMeQueryKey(), data);
      queryClient.invalidateQueries({ queryKey: getGetMeQueryKey() });
    },
  });
}

// ─── Exam hooks ──────────────────────────────────────────────────────────────

export function useListExams() {
  const { getToken } = useAuth();
  return useQuery<Exam[]>({
    queryKey: getListExamsQueryKey(),
    queryFn: async () => {
      const token = await getToken();
      const res = await fetch(`${API_BASE}/exams`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`GET /exams failed: ${res.status}`);
      return res.json();
    },
  });
}

export function useGetExam(examId?: string) {
  const { getToken } = useAuth();
  return useQuery<Exam>({
    queryKey: getGetExamQueryKey(examId),
    enabled: !!examId,
    queryFn: async () => {
      const token = await getToken();
      const res = await fetch(`${API_BASE}/exams/${examId}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`GET /exams/${examId} failed: ${res.status}`);
      return res.json();
    },
  });
}

export function useCreateExam() {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();
  return useMutation<Exam, Error, { data: Partial<Exam> }>({
    mutationFn: async ({ data }) => {
      const token = await getToken();
      const res = await fetch(`${API_BASE}/exams`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error(`POST /exams failed: ${res.status}`);
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: getListExamsQueryKey() }),
  });
}

export function useUpdateExam() {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();
  return useMutation<Exam, Error, { examId: string; data: Partial<Exam> }>({
    mutationFn: async ({ examId, data }) => {
      const token = await getToken();
      const res = await fetch(`${API_BASE}/exams/${examId}`, {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error(`PATCH /exams/${examId} failed: ${res.status}`);
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: getListExamsQueryKey() }),
  });
}

export function usePublishExam() {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();
  return useMutation<Exam, Error, { examId: string }>({
    mutationFn: async ({ examId }) => {
      const token = await getToken();
      const res = await fetch(`${API_BASE}/exams/${examId}/publish`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`POST /exams/${examId}/publish failed: ${res.status}`);
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: getListExamsQueryKey() }),
  });
}

// ─── Question hooks ──────────────────────────────────────────────────────────

export function useListQuestions(examId?: string) {
  const { getToken } = useAuth();
  return useQuery<Question[]>({
    queryKey: getListQuestionsQueryKey(examId),
    enabled: !!examId,
    queryFn: async () => {
      const token = await getToken();
      const res = await fetch(`${API_BASE}/exams/${examId}/questions`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`GET /exams/${examId}/questions failed: ${res.status}`);
      return res.json();
    },
  });
}

export function useCreateQuestion() {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();
  return useMutation<Question, Error, { examId: string; data: Partial<Question> }>({
    mutationFn: async ({ examId, data }) => {
      const token = await getToken();
      const res = await fetch(`${API_BASE}/exams/${examId}/questions`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error(`POST /questions failed: ${res.status}`);
      return res.json();
    },
    onSuccess: (_d, v) => queryClient.invalidateQueries({ queryKey: getListQuestionsQueryKey(v.examId) }),
  });
}

export function useUpdateQuestion() {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();
  return useMutation<Question, Error, { examId: string; questionId: number; data: Partial<Question> }>({
    mutationFn: async ({ examId, questionId, data }) => {
      const token = await getToken();
      const res = await fetch(`${API_BASE}/exams/${examId}/questions/${questionId}`, {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error(`PATCH /questions/${questionId} failed: ${res.status}`);
      return res.json();
    },
    onSuccess: (_d, v) => queryClient.invalidateQueries({ queryKey: getListQuestionsQueryKey(v.examId) }),
  });
}

export function useDeleteQuestion() {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();
  return useMutation<void, Error, { examId: string; questionId: number }>({
    mutationFn: async ({ examId, questionId }) => {
      const token = await getToken();
      const res = await fetch(`${API_BASE}/exams/${examId}/questions/${questionId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`DELETE /questions/${questionId} failed: ${res.status}`);
    },
    onSuccess: (_d, v) => queryClient.invalidateQueries({ queryKey: getListQuestionsQueryKey(v.examId) }),
  });
}

export function useGenerateQuestions() {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();
  return useMutation<Question[], Error, { examId: string; data: any }>({
    mutationFn: async ({ examId, data }) => {
      const token = await getToken();
      const res = await fetch(`${API_BASE}/exams/${examId}/questions/generate`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error(`POST /generate failed: ${res.status}`);
      return res.json();
    },
    onSuccess: (_d, v) => queryClient.invalidateQueries({ queryKey: getListQuestionsQueryKey(v.examId) }),
  });
}

// ─── Session hooks ───────────────────────────────────────────────────────────

export function useGetSession(sessionId?: string) {
  const { getToken } = useAuth();
  return useQuery<ExamSession>({
    queryKey: getGetSessionQueryKey(sessionId),
    enabled: !!sessionId,
    queryFn: async () => {
      const token = await getToken();
      const res = await fetch(`${API_BASE}/sessions/${sessionId}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`GET /sessions/${sessionId} failed: ${res.status}`);
      return res.json();
    },
  });
}

export function useListSessions(query?: any) {
  const { getToken } = useAuth();
  return useQuery<ExamSession[]>({
    queryKey: getListSessionsQueryKey(),
    queryFn: async () => {
      const token = await getToken();
      const params = query ? `?${new URLSearchParams(query)}` : '';
      const res = await fetch(`${API_BASE}/sessions${params}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`GET /sessions failed: ${res.status}`);
      return res.json();
    },
  });
}

export function useJoinExam() {
  const { getToken } = useAuth();
  return useMutation<ExamSession, Error, { data: { accessCode: string } }>({
    mutationFn: async ({ data }) => {
      const token = await getToken();
      const res = await fetch(`${API_BASE}/sessions/join`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error(`POST /sessions/join failed: ${res.status}`);
      return res.json();
    },
  });
}

export function useStartSession() {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();
  return useMutation<ExamSession, Error, { sessionId: string }>({
    mutationFn: async ({ sessionId }) => {
      const token = await getToken();
      const res = await fetch(`${API_BASE}/sessions/${sessionId}/start`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`POST /sessions/${sessionId}/start failed: ${res.status}`);
      return res.json();
    },
    onSuccess: (_d, v) => queryClient.invalidateQueries({ queryKey: getGetSessionQueryKey(v.sessionId) }),
  });
}

export function useSubmitSession() {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();
  return useMutation<ExamSession, Error, { sessionId: string; data: any }>({
    mutationFn: async ({ sessionId, data }) => {
      const token = await getToken();
      const res = await fetch(`${API_BASE}/sessions/${sessionId}/submit`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error(`POST /sessions/${sessionId}/submit failed: ${res.status}`);
      return res.json();
    },
    onSuccess: (_d, v) => queryClient.invalidateQueries({ queryKey: getGetSessionQueryKey(v.sessionId) }),
  });
}

// ─── Flag hooks ──────────────────────────────────────────────────────────────

export function useListSessionFlags(sessionId?: number) {
  const { getToken } = useAuth();
  return useQuery<CheatingFlag[]>({
    queryKey: getListSessionFlagsQueryKey(sessionId),
    enabled: !!sessionId,
    queryFn: async () => {
      const token = await getToken();
      const res = await fetch(`${API_BASE}/sessions/${sessionId}/flags`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`GET /sessions/${sessionId}/flags failed: ${res.status}`);
      return res.json();
    },
  });
}

export function useReportFlag() {
  const { getToken } = useAuth();
  return useMutation<CheatingFlag, Error, { sessionId: string; data: Partial<CheatingFlag> }>({
    mutationFn: async ({ sessionId, data }) => {
      const token = await getToken();
      const res = await fetch(`${API_BASE}/sessions/${sessionId}/flags`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error(`POST /flags failed: ${res.status}`);
      return res.json();
    },
  });
}

export function useReviewFlag() {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();
  return useMutation<CheatingFlag, Error, { flagId: number; data: any; sessionId?: number }>({
    mutationFn: async ({ flagId, data }) => {
      const token = await getToken();
      const res = await fetch(`${API_BASE}/flags/${flagId}/review`, {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error(`PATCH /flags/${flagId}/review failed: ${res.status}`);
      return res.json();
    },
    onSuccess: (data, v) => {
      const sId = v.sessionId || data.sessionId;
      if (sId) {
        queryClient.invalidateQueries({ queryKey: getListSessionFlagsQueryKey(sId) });
      }
    },
  });
}

// ─── Dashboard ───────────────────────────────────────────────────────────────

export function useGetDashboardStats() {
  const { getToken } = useAuth();
  return useQuery({
    queryKey: ['dashboardStats'],
    queryFn: async () => {
      const token = await getToken();
      const res = await fetch(`${API_BASE}/dashboard/stats`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`GET /dashboard/stats failed: ${res.status}`);
      return res.json();
    },
  });
}

export function useGetExamResults(examId?: string) {
  const { getToken } = useAuth();
  return useQuery({
    queryKey: getGetExamResultsQueryKey(examId),
    enabled: !!examId,
    queryFn: async () => {
      const token = await getToken();
      const res = await fetch(`${API_BASE}/exams/${examId}/results`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`GET /exams/${examId}/results failed: ${res.status}`);
      return res.json();
    },
  });
}
