// Simple API client to replace @workspace/api-client-react
const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

let authTokenGetter: (() => string | null) | null = null;

export function setAuthTokenGetter(getter: () => string | null) {
  authTokenGetter = getter;
}

export function setBaseUrl(url: string) {
  // For now, this is a no-op since we use env var
}

export async function customFetch(url: string, options: RequestInit = {}) {
  const token = authTokenGetter?.();
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${url}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
  }

  return response.json();
}

// Types
export interface CheatingFlag {
  id: string;
  type: string;
  timestamp: string;
}

export interface FlagInputType {
  type: string;
  description?: string;
}

export interface UserProfileUpdateRole {
  role: 'student' | 'instructor';
}

export interface GenerateQuestionsInputDifficulty {
  level: 'easy' | 'medium' | 'hard';
}

export interface GenerateQuestionsInputQuestionTypesItem {
  type: string;
  count: number;
}

// React Query hooks (simplified placeholders)
export function useGetMe() {
  return { data: null, isLoading: false, error: null };
}

export function useUpdateMe() {
  return { mutate: async () => {}, isPending: false };
}

export function useListExams() {
  return { data: [], isLoading: false, error: null };
}

export function useUpdateExam() {
  return { mutate: async () => {}, isPending: false };
}

export function useCreateExam() {
  return { mutate: async () => {}, isPending: false };
}

export function useGetSession(sessionId?: string) {
  return { data: null, isLoading: false, error: null };
}

export function useStartSession() {
  return { mutate: async () => {}, isPending: false };
}

export function useSubmitSession() {
  return { mutate: async () => {}, isPending: false };
}

export function useReportFlag() {
  return { mutate: async () => {}, isPending: false };
}

export function useListSessions(query?: any) {
  return { data: [], isLoading: false, error: null };
}

export function useJoinExam() {
  return { mutate: async () => {}, isPending: false };
}

export function useGetDashboardStats() {
  return { data: null, isLoading: false, error: null };
}

export function useGetExamResults(examId?: string) {
  return { data: null, isLoading: false, error: null };
}

export function useReviewFlag() {
  return { mutate: async () => {}, isPending: false };
}

export function useListSessionFlags(sessionId?: number) {
  return { data: [], isLoading: false, error: null };
}

export function useListQuestions(examId?: string) {
  return { data: [], isLoading: false, error: null };
}

export function useUpdateQuestion() {
  return { mutate: async () => {}, isPending: false };
}

export function useDeleteQuestion() {
  return { mutate: async () => {}, isPending: false };
}

export function useGenerateQuestions() {
  return { mutate: async () => {}, isPending: false };
}

export function usePublishExam() {
  return { mutate: async () => {}, isPending: false };
}

export function useCreateQuestion() {
  return { mutate: async () => {}, isPending: false };
}

export function useGetExam(examId?: string) {
  return { data: null, isLoading: false, error: null };
}

// Query key helpers
export function getGetMeQueryKey() {
  return ['getMe'];
}

export function getGetSessionQueryKey(sessionId?: string) {
  return ['getSession', sessionId];
}

export function getListSessionsQueryKey() {
  return ['listSessions'];
}

export function getListExamsQueryKey() {
  return ['listExams'];
}

export function getGetExamResultsQueryKey(examId?: string) {
  return ['getExamResults', examId];
}

export function getListQuestionsQueryKey(examId?: string) {
  return ['listQuestions', examId];
}

export function getListSessionFlagsQueryKey(sessionId?: number) {
  return ['listSessionFlags', sessionId];
}

export function getGetExamQueryKey(examId?: string) {
  return ['getExam', examId];
}
