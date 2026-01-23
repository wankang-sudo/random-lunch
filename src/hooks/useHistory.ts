'use client';

import { useState, useEffect } from 'react';
import { ref, onValue, set, update, push, remove } from 'firebase/database';
import { getDb } from '@/lib/firebase';
import { HistoryRecord } from '@/types';

export function useHistory() {
  const [records, setRecords] = useState<HistoryRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const db = getDb();
    if (!db) {
      setLoading(false);
      return;
    }

    const historyRef = ref(db, 'history');

    const unsubscribe = onValue(
      historyRef,
      (snapshot) => {
        const data = snapshot.val();
        if (data) {
          const recordsList = Object.entries(data).map(([id, record]) => {
            const rec = record as Record<string, unknown>;

            // memberNames 방어 처리
            let memberNames: string[] = [];
            const rawMemberNames = rec.memberNames;
            if (Array.isArray(rawMemberNames)) {
              memberNames = rawMemberNames.filter((n): n is string => typeof n === 'string' && n.length > 0);
            } else if (rawMemberNames && typeof rawMemberNames === 'object') {
              memberNames = Object.values(rawMemberNames).filter((n): n is string => typeof n === 'string' && n.length > 0);
            } else if (typeof rawMemberNames === 'string' && rawMemberNames.length > 0) {
              memberNames = rawMemberNames.split(',').map(s => s.trim()).filter(s => s.length > 0);
            }

            // reviews 방어 처리
            let reviews: HistoryRecord['reviews'] = [];
            const rawReviews = rec.reviews;
            if (Array.isArray(rawReviews)) {
              reviews = rawReviews;
            } else if (rawReviews && typeof rawReviews === 'object') {
              reviews = Object.values(rawReviews);
            }

            return {
              id,
              date: String(rec.date || ''),
              memberNames,
              note: String(rec.note || ''),
              isWinner: Boolean(rec.isWinner),
              restaurant: String(rec.restaurant || ''),
              reviews,
              createdAt: Number(rec.createdAt) || Date.now(),
              updatedAt: Number(rec.updatedAt) || Date.now(),
            };
          });
          // 날짜 기준 내림차순 정렬
          recordsList.sort((a, b) => b.date.localeCompare(a.date));
          setRecords(recordsList);
        } else {
          setRecords([]);
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

  // 기록 추가
  const addRecord = async (record: Omit<HistoryRecord, 'id' | 'createdAt' | 'updatedAt' | 'restaurant' | 'reviews'> & { restaurant?: string }) => {
    const db = getDb();
    if (!db) return null;

    const historyRef = ref(db, 'history');
    const newRef = push(historyRef);
    const now = Date.now();

    const newRecord: Omit<HistoryRecord, 'id'> = {
      ...record,
      restaurant: record.restaurant || '',
      reviews: [],
      createdAt: now,
      updatedAt: now,
    };

    await set(newRef, newRecord);
    return newRef.key;
  };

  // 한줄평 추가
  const addReview = async (recordId: string, author: string, content: string) => {
    const db = getDb();
    if (!db) return;

    const record = records.find((r) => r.id === recordId);
    if (!record) return;

    const newReview = {
      id: `review_${Date.now()}`,
      author,
      content,
      createdAt: Date.now(),
    };

    const updatedReviews = [...(record.reviews || []), newReview];

    // set()을 사용하여 전체 레코드 저장
    const recordRef = ref(db, `history/${recordId}`);
    await set(recordRef, {
      date: record.date,
      memberNames: record.memberNames || [],
      note: record.note || '',
      isWinner: record.isWinner,
      restaurant: record.restaurant || '',
      reviews: updatedReviews,
      createdAt: record.createdAt,
      updatedAt: Date.now(),
    });
  };

  // 한줄평 삭제
  const deleteReview = async (recordId: string, reviewId: string) => {
    const db = getDb();
    if (!db) return;

    const record = records.find((r) => r.id === recordId);
    if (!record) return;

    const updatedReviews = (record.reviews || []).filter((r) => r.id !== reviewId);

    // set()을 사용하여 전체 레코드 저장
    const recordRef = ref(db, `history/${recordId}`);
    await set(recordRef, {
      date: record.date,
      memberNames: record.memberNames || [],
      note: record.note || '',
      isWinner: record.isWinner,
      restaurant: record.restaurant || '',
      reviews: updatedReviews,
      createdAt: record.createdAt,
      updatedAt: Date.now(),
    });
  };

  // 기록 수정 - set()을 사용하여 배열이 객체로 변환되는 것 방지
  const updateRecord = async (id: string, updates: Partial<Omit<HistoryRecord, 'id' | 'createdAt'>>) => {
    const db = getDb();
    if (!db) return;

    // 현재 레코드 찾기
    const currentRecord = records.find((r) => r.id === id);
    if (!currentRecord) return;

    // 전체 레코드를 다시 저장 (배열 형식 유지)
    const recordRef = ref(db, `history/${id}`);
    const updatedRecord = {
      date: currentRecord.date,
      memberNames: updates.memberNames || currentRecord.memberNames || [],
      note: updates.note !== undefined ? updates.note : currentRecord.note || '',
      isWinner: updates.isWinner !== undefined ? updates.isWinner : currentRecord.isWinner,
      restaurant: updates.restaurant !== undefined ? updates.restaurant : currentRecord.restaurant || '',
      reviews: updates.reviews || currentRecord.reviews || [],
      createdAt: currentRecord.createdAt,
      updatedAt: Date.now(),
    };

    await set(recordRef, updatedRecord);
  };

  // 기록 삭제
  const deleteRecord = async (id: string) => {
    const db = getDb();
    if (!db) return;

    const recordRef = ref(db, `history/${id}`);
    await remove(recordRef);
  };

  // 날짜별 기록 가져오기
  const getRecordByDate = (date: string) => {
    return records.find((r) => r.date === date);
  };

  return {
    records,
    loading,
    error,
    addRecord,
    updateRecord,
    deleteRecord,
    getRecordByDate,
    addReview,
    deleteReview,
  };
}
