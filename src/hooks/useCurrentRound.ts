'use client';

import { useState, useEffect } from 'react';
import { ref, onValue, set, update } from 'firebase/database';
import { getDb } from '@/lib/firebase';
import { Round, RoundStatus } from '@/types';

const DEFAULT_DRAW_COUNTS: Record<number, number> = {
  9: 4,
  8: 4,
  7: 3,
  6: 3,
  5: 2,
  4: 2,
};

export function useCurrentRound() {
  const [round, setRound] = useState<Round | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const db = getDb();
    if (!db) {
      setLoading(false);
      return;
    }

    const roundRef = ref(db, 'currentRound');

    const unsubscribe = onValue(
      roundRef,
      (snapshot) => {
        const data = snapshot.val();
        if (data) {
          setRound(data as Round);
        } else {
          setRound(null);
        }
        setLoading(false);
      },
      (err) => {
        setError(err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  // 새 라운드 생성
  const createRound = async (
    participantIds: string[],
    options?: {
      drawCount?: number;
      nextWeekCount?: number;
      includeAbsentees?: boolean;
      absenteeIds?: string[];
    }
  ) => {
    const db = getDb();
    if (!db) return null;

    const roundRef = ref(db, 'currentRound');
    const defaultDrawCount = DEFAULT_DRAW_COUNTS[participantIds.length] || Math.floor(participantIds.length / 2);

    const newRound: Round = {
      id: `round_${Date.now()}`,
      status: 'selecting',
      participantIds,
      absenteeIds: options?.absenteeIds || [],
      numberSelections: {},
      drawCount: options?.drawCount || defaultDrawCount,
      nextWeekCount: options?.nextWeekCount || 4,
      includeAbsentees: options?.includeAbsentees ?? true,
      thisWeekGroup: [],
      nextWeekGroup: [],
      preDrawSnapshot: null,
      resetHistory: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    await set(roundRef, newRound);
    return newRound;
  };

  // 번호 선택
  const selectNumber = async (number: number, memberId: string) => {
    const db = getDb();
    if (!db || !round) return;

    const selectionsRef = ref(db, 'currentRound/numberSelections');
    await update(selectionsRef, { [number]: memberId });
    await update(ref(db, 'currentRound'), { updatedAt: Date.now() });
  };

  // 번호 선택 취소
  const deselectNumber = async (number: number) => {
    const db = getDb();
    if (!db || !round) return;

    const numberRef = ref(db, `currentRound/numberSelections/${number}`);
    await set(numberRef, null);
    await update(ref(db, 'currentRound'), { updatedAt: Date.now() });
  };

  // 라운드 상태 변경
  const updateStatus = async (status: RoundStatus) => {
    const db = getDb();
    if (!db || !round) return;

    await update(ref(db, 'currentRound'), {
      status,
      updatedAt: Date.now(),
    });
  };

  // 추첨 인원 수 변경
  const updateDrawCount = async (drawCount: number) => {
    const db = getDb();
    if (!db || !round) return;

    await update(ref(db, 'currentRound'), {
      drawCount,
      updatedAt: Date.now(),
    });
  };

  // 추첨 결과 저장
  const saveDrawResult = async (thisWeekGroup: string[], nextWeekGroup: string[]) => {
    const db = getDb();
    if (!db || !round) return;

    await update(ref(db, 'currentRound'), {
      status: 'completed',
      thisWeekGroup,
      nextWeekGroup,
      updatedAt: Date.now(),
    });
  };

  // 스냅샷 저장 (롤백용)
  const saveSnapshot = async (memberScores: Record<string, number>, pairCounts: Record<string, number>) => {
    const db = getDb();
    if (!db || !round) return;

    await update(ref(db, 'currentRound'), {
      preDrawSnapshot: { memberScores, pairCounts },
      updatedAt: Date.now(),
    });
  };

  // 라운드 리셋
  const resetRound = async () => {
    const db = getDb();
    if (!db || !round) return;

    await update(ref(db, 'currentRound'), {
      status: 'selecting',
      numberSelections: {},
      thisWeekGroup: [],
      nextWeekGroup: [],
      resetHistory: [
        ...round.resetHistory,
        { resetAt: Date.now() },
      ],
      updatedAt: Date.now(),
    });
  };

  // 모든 번호가 선택되었는지 확인
  const isAllNumbersSelected = () => {
    if (!round) return false;
    const selectedCount = Object.keys(round.numberSelections || {}).length;
    return selectedCount === round.participantIds.length;
  };

  return {
    round,
    loading,
    error,
    createRound,
    selectNumber,
    deselectNumber,
    updateStatus,
    updateDrawCount,
    saveDrawResult,
    saveSnapshot,
    resetRound,
    isAllNumbersSelected,
  };
}
