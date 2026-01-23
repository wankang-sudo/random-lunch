'use client';

import { useState, useEffect } from 'react';
import { Member } from '@/types';

interface UserSelectorProps {
  members: Member[];
  participantIds: string[]; // 이번 라운드 참여자 ID 목록
  onSelect: (memberId: string) => void;
}

const STORAGE_KEY = 'random-lunch-user-id';

export default function UserSelector({ members, participantIds, onSelect }: UserSelectorProps) {
  const [selectedId, setSelectedId] = useState<string>('');

  // 참여자만 필터링
  const participants = members.filter((m) => participantIds.includes(m.id));

  useEffect(() => {
    // 로컬 스토리지에서 저장된 사용자 ID 불러오기
    const savedId = localStorage.getItem(STORAGE_KEY);
    if (savedId && participantIds.includes(savedId)) {
      setSelectedId(savedId);
      onSelect(savedId);
    }
  }, [participantIds, onSelect]);

  const handleSelect = (memberId: string) => {
    setSelectedId(memberId);
    localStorage.setItem(STORAGE_KEY, memberId);
    onSelect(memberId);
  };

  return (
    <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
      <label className="block text-sm font-medium text-gray-700 mb-2">
        본인을 선택하세요
      </label>
      <select
        value={selectedId}
        onChange={(e) => handleSelect(e.target.value)}
        className="w-full p-3 border border-gray-200 rounded-lg focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
      >
        <option value="">선택해주세요</option>
        {participants.map((member) => (
          <option key={member.id} value={member.id}>
            {member.name}
          </option>
        ))}
      </select>
    </div>
  );
}

// 저장된 사용자 ID 가져오기 헬퍼 함수
export function getSavedUserId(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(STORAGE_KEY);
}
