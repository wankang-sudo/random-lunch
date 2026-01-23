'use client';

import { useState, useEffect } from 'react';
import { ref, onValue, set } from 'firebase/database';
import { getDb } from '@/lib/firebase';

// 간단한 해시 함수 (실제 프로덕션에서는 더 강력한 해시 사용 권장)
const hashPassword = (password: string): string => {
  let hash = 0;
  for (let i = 0; i < password.length; i++) {
    const char = password.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return hash.toString(16);
};

// 기본 비밀번호 해시 (1234)
const DEFAULT_PASSWORD_HASH = hashPassword('1234');

export function useSettings() {
  const [adminPasswordHash, setAdminPasswordHash] = useState<string>(DEFAULT_PASSWORD_HASH);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const db = getDb();
    if (!db) {
      setLoading(false);
      return;
    }

    const settingsRef = ref(db, 'settings/adminPassword');

    const unsubscribe = onValue(
      settingsRef,
      (snapshot) => {
        const data = snapshot.val();
        if (data) {
          setAdminPasswordHash(data);
        } else {
          // 초기 비밀번호 설정
          set(settingsRef, DEFAULT_PASSWORD_HASH);
        }
        setLoading(false);
      },
      () => {
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  // 비밀번호 검증
  const verifyPassword = (password: string): boolean => {
    return hashPassword(password) === adminPasswordHash;
  };

  // 비밀번호 변경
  const changePassword = async (newPassword: string) => {
    const db = getDb();
    if (!db) return;

    const newHash = hashPassword(newPassword);
    await set(ref(db, 'settings/adminPassword'), newHash);
  };

  return {
    loading,
    verifyPassword,
    changePassword,
  };
}
