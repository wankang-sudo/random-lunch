'use client';

import { useState, useEffect } from 'react';
import { ref, onValue, update, set } from 'firebase/database';
import { getDb } from '@/lib/firebase';
import { Statistics } from '@/types';

export function useStatistics() {
  const [statistics, setStatistics] = useState<Statistics>({
    memberScores: {},
    pairCounts: {},
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const db = getDb();
    if (!db) {
      setLoading(false);
      return;
    }

    const statsRef = ref(db, 'statistics');

    const unsubscribe = onValue(
      statsRef,
      (snapshot) => {
        const data = snapshot.val();
        if (data) {
          setStatistics(data as Statistics);
        } else {
          setStatistics({ memberScores: {}, pairCounts: {} });
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

  // 멤버 스코어 증가
  const incrementScore = async (memberId: string) => {
    const db = getDb();
    if (!db) return;

    const currentScore = statistics.memberScores[memberId] || 0;
    await update(ref(db, 'statistics/memberScores'), {
      [memberId]: currentScore + 1,
    });
  };

  // 찐친 카운트 증가 (페어 키 생성: 항상 작은 ID가 앞에)
  const incrementPairCount = async (memberId1: string, memberId2: string) => {
    const db = getDb();
    if (!db) return;

    const pairKey = [memberId1, memberId2].sort().join('_');
    const currentCount = statistics.pairCounts[pairKey] || 0;
    await update(ref(db, 'statistics/pairCounts'), {
      [pairKey]: currentCount + 1,
    });
  };

  // 그룹 내 모든 페어의 카운트 증가
  const incrementGroupPairCounts = async (memberIds: string[]) => {
    const db = getDb();
    if (!db) return;

    // falsy 값 필터링 (undefined, null, '' 등)
    const validMemberIds = memberIds.filter((id) => !!id);
    if (validMemberIds.length < 2) return;

    const updates: Record<string, number> = {};

    for (let i = 0; i < validMemberIds.length; i++) {
      for (let j = i + 1; j < validMemberIds.length; j++) {
        const pairKey = [validMemberIds[i], validMemberIds[j]].sort().join('_');
        const currentCount = statistics.pairCounts[pairKey] || 0;
        updates[pairKey] = currentCount + 1;
      }
    }

    if (Object.keys(updates).length > 0) {
      await update(ref(db, 'statistics/pairCounts'), updates);
    }
  };

  // 통계 복원 (롤백용)
  const restoreStatistics = async (snapshot: Statistics) => {
    const db = getDb();
    if (!db) return;

    await set(ref(db, 'statistics'), snapshot);
  };

  // 스코어 랭킹 가져오기
  const getScoreRanking = () => {
    return Object.entries(statistics.memberScores)
      .map(([memberId, score]) => ({ memberId, score }))
      .sort((a, b) => b.score - a.score);
  };

  // 찐친 랭킹 가져오기
  const getPairRanking = () => {
    return Object.entries(statistics.pairCounts)
      .map(([pairKey, count]) => {
        const [memberId1, memberId2] = pairKey.split('_');
        return { memberId1, memberId2, count };
      })
      .sort((a, b) => b.count - a.count);
  };

  return {
    statistics,
    loading,
    error,
    incrementScore,
    incrementPairCount,
    incrementGroupPairCounts,
    restoreStatistics,
    getScoreRanking,
    getPairRanking,
  };
}
