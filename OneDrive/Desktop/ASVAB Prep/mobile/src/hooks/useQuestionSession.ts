import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { questionsService, QuestionSession, ResumeSessionResponse } from '@/services/questionsService';
import { Question } from '@asvab-prep/shared';

export interface QuestionSessionState {
  session: QuestionSession | null;
  currentQuestion: Question | null;
  currentIndex: number;
  totalQuestions: number;
  isLoading: boolean;
  error: string | null;
}

export const useQuestionSession = () => {
  const [sessionState, setSessionState] = useState<QuestionSessionState>({
    session: null,
    currentQuestion: null,
    currentIndex: 0,
    totalQuestions: 0,
    isLoading: false,
    error: null,
  });

  const queryClient = useQueryClient();

  // Query to get active session
  const {
    data: activeSession,
    isLoading: isSessionLoading,
    error: sessionError,
  } = useQuery({
    queryKey: ['questionSession'],
    queryFn: questionsService.getQuestionSession,
    staleTime: 0, // Always check for fresh session data
  });

  // Mutation to resume session
  const resumeSessionMutation = useMutation({
    mutationFn: (sessionId: string) => questionsService.resumeQuestionSession(sessionId),
    onSuccess: (data: ResumeSessionResponse) => {
      setSessionState(prev => ({
        ...prev,
        session: data.session,
        currentIndex: data.answeredCount,
        totalQuestions: data.totalCount,
        isLoading: false,
        error: null,
      }));
    },
    onError: (error: any) => {
      setSessionState(prev => ({
        ...prev,
        error: error.message || 'Failed to resume session',
        isLoading: false,
      }));
    },
  });

  // Update session state when active session changes
  useEffect(() => {
    if (activeSession) {
      setSessionState(prev => ({
        ...prev,
        session: activeSession,
        totalQuestions: activeSession.questionIds.length,
        isLoading: false,
        error: null,
      }));
    } else if (sessionError) {
      setSessionState(prev => ({
        ...prev,
        session: null,
        error: sessionError.message || 'Failed to load session',
        isLoading: false,
      }));
    }
  }, [activeSession, sessionError]);

  const hasActiveSession = () => {
    return !!activeSession && !activeSession.completedAt;
  };

  const resumeSession = () => {
    if (activeSession) {
      setSessionState(prev => ({ ...prev, isLoading: true }));
      resumeSessionMutation.mutate(activeSession.id);
    }
  };

  const clearSession = () => {
    queryClient.setQueryData(['questionSession'], null);
    setSessionState({
      session: null,
      currentQuestion: null,
      currentIndex: 0,
      totalQuestions: 0,
      isLoading: false,
      error: null,
    });
  };

  const getSessionProgress = () => {
    if (!sessionState.session) return { completed: 0, total: 0, percentage: 0 };
    
    const completed = sessionState.currentIndex;
    const total = sessionState.totalQuestions;
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
    
    return { completed, total, percentage };
  };

  const getRemainingQuestions = () => {
    if (!sessionState.session) return 0;
    return Math.max(0, sessionState.totalQuestions - sessionState.currentIndex);
  };

  const getSessionDuration = () => {
    if (!sessionState.session?.startedAt) return 0;
    
    const startTime = new Date(sessionState.session.startedAt).getTime();
    const currentTime = new Date().getTime();
    return Math.floor((currentTime - startTime) / 1000); // Duration in seconds
  };

  const canResumeSession = () => {
    return hasActiveSession() && getRemainingQuestions() > 0;
  };

  return {
    sessionState,
    isLoading: isSessionLoading || sessionState.isLoading,
    hasActiveSession,
    resumeSession,
    clearSession,
    getSessionProgress,
    getRemainingQuestions,
    getSessionDuration,
    canResumeSession,
    resumeSessionMutation,
  };
};