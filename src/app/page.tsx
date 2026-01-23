'use client';

import { useState, useEffect, useCallback } from 'react';
import { useMembers } from '@/hooks/useMembers';
import { useCurrentRound } from '@/hooks/useCurrentRound';
import { useStatistics } from '@/hooks/useStatistics';
import { useSettings } from '@/hooks/useSettings';
import NumberSelector from '@/components/NumberSelector';
import UserSelector, { getSavedUserId } from '@/components/UserSelector';
import AdminPasswordModal from '@/components/AdminPasswordModal';
import LotteryAnimation from '@/components/LotteryAnimation';
import ResultDisplay from '@/components/ResultDisplay';

export default function Home() {
  const { members, loading: membersLoading } = useMembers();
  const {
    round,
    loading: roundLoading,
    selectNumber,
    deselectNumber,
    updateStatus,
    saveDrawResult,
    saveSnapshot,
  } = useCurrentRound();
  const { statistics, incrementScore, incrementGroupPairCounts } = useStatistics();
  const { verifyPassword } = useSettings();

  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);

  // 저장된 사용자 ID 로드
  useEffect(() => {
    const savedId = getSavedUserId();
    if (savedId) {
      setCurrentUserId(savedId);
    }
  }, []);

  const handleUserSelect = useCallback((memberId: string) => {
    setCurrentUserId(memberId);
  }, []);

  const handleSelectNumber = async (number: number) => {
    if (!currentUserId) return;

    // 이미 선택한 번호가 있는지 확인
    const myCurrentNumber = Object.entries(round?.numberSelections || {}).find(
      ([, id]) => id === currentUserId
    );

    if (myCurrentNumber) {
      alert('이미 번호를 선택하셨습니다.');
      return;
    }

    await selectNumber(number, currentUserId);
  };

  const handleDeselectNumber = async (number: number) => {
    if (!currentUserId) return;
    await deselectNumber(number);
  };

  const handleStartDraw = () => {
    setShowPasswordModal(true);
  };

  const handleDrawConfirmed = async () => {
    setShowPasswordModal(false);

    // 스냅샷 저장 (롤백용)
    await saveSnapshot(statistics.memberScores, statistics.pairCounts);

    // 추첨 상태로 변경
    await updateStatus('drawing');
    setIsDrawing(true);
  };

  const handleDrawComplete = async (selectedNumbers: number[]) => {
    if (!round) return;

    // 이번 주 조 멤버 ID 추출 (undefined 값 필터링)
    const selections = round.numberSelections || {};
    const thisWeekMemberIds = selectedNumbers
      .map((num) => selections[num])
      .filter((id): id is string => !!id);

    // 추첨에서 떨어진 멤버 (참여했지만 이번 주에 선택되지 않은)
    const allParticipantIds = Object.values(selections);
    const notSelectedIds = allParticipantIds.filter(
      (id) => !thisWeekMemberIds.includes(id)
    );

    // 다음 주 조 구성
    let nextWeekMemberIds: string[] = [];
    const absenteeIds = round.absenteeIds || [];

    if (round.includeAbsentees && absenteeIds.length > 0) {
      // 미참여 멤버 우선 포함
      nextWeekMemberIds = [...absenteeIds];

      // 남은 자리는 추첨에서 떨어진 멤버로 채움 (미참여 멤버 제외)
      const remainingSlots = round.nextWeekCount - nextWeekMemberIds.length;
      if (remainingSlots > 0) {
        const eligibleForNextWeek = notSelectedIds.filter(
          (id) => !absenteeIds.includes(id)
        );
        nextWeekMemberIds.push(...eligibleForNextWeek.slice(0, remainingSlots));
      }
    } else {
      // 미참여 멤버 미포함 - 추첨에서 떨어진 멤버만
      nextWeekMemberIds = notSelectedIds.slice(0, round.nextWeekCount);
    }

    // 중복 제거
    nextWeekMemberIds = [...new Set(nextWeekMemberIds)];

    // 결과 저장
    await saveDrawResult(thisWeekMemberIds, nextWeekMemberIds);

    // 통계 업데이트 - 이번 주 조 멤버들 스코어 증가
    for (const memberId of thisWeekMemberIds) {
      await incrementScore(memberId);
    }

    // 찐친 카운트 증가 - 이번 주 조 + 다음 주 조 내 모든 페어
    await incrementGroupPairCounts(thisWeekMemberIds);
    await incrementGroupPairCounts(nextWeekMemberIds);

    // 애니메이션 종료
    setTimeout(() => {
      setIsDrawing(false);
    }, 2000);
  };

  // 모든 참여자가 번호를 선택했는지 확인
  const isAllSelected = round
    ? Object.keys(round.numberSelections || {}).length === round.participantIds.length
    : false;

  // 로딩 상태
  if (membersLoading || roundLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <div className="animate-spin w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-gray-600">로딩 중...</p>
        </div>
      </div>
    );
  }

  // 라운드가 없는 경우
  if (!round) {
    return (
      <div className="text-center py-20">
        <span className="text-6xl mb-4 block">📋</span>
        <h2 className="text-xl font-bold text-gray-800 mb-2">
          진행 중인 라운드가 없습니다
        </h2>
        <p className="text-gray-600 mb-4">
          설정 페이지에서 새 라운드를 시작해주세요
        </p>
        <a
          href="/settings"
          className="inline-block bg-blue-500 text-white px-6 py-3 rounded-xl font-medium hover:bg-blue-600 transition-colors"
        >
          설정으로 이동
        </a>
      </div>
    );
  }

  // 추첨 애니메이션 중
  if (isDrawing) {
    return (
      <LotteryAnimation
        round={round}
        members={members}
        onComplete={handleDrawComplete}
      />
    );
  }

  // 추첨 완료 상태
  if (round.status === 'completed') {
    return <ResultDisplay round={round} members={members} />;
  }

  // 참여자/미참여자 이름 목록
  const participantNames = members
    .filter((m) => round.participantIds.includes(m.id))
    .map((m) => m.name);
  const absenteeNames = members
    .filter((m) => (round.absenteeIds || []).includes(m.id))
    .map((m) => m.name);

  // 번호 선택 상태
  return (
    <div className="space-y-6">
      {/* 라운드 정보 */}
      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 space-y-3">
        <div>
          <p className="text-sm text-gray-500 mb-1">이번 라운드 참여 ({participantNames.length}명)</p>
          <div className="flex flex-wrap gap-2">
            {participantNames.map((name) => (
              <span key={name} className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
                {name}
              </span>
            ))}
          </div>
        </div>

        {absenteeNames.length > 0 && round.includeAbsentees && (
          <div>
            <p className="text-sm text-gray-500 mb-1">미참여 → 다음 주 필수 ({absenteeNames.length}명)</p>
            <div className="flex flex-wrap gap-2">
              {absenteeNames.map((name) => (
                <span key={name} className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
                  {name}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 사용자 선택 */}
      <UserSelector
        members={members}
        participantIds={round.participantIds}
        onSelect={handleUserSelect}
      />

      {/* 번호 선택 */}
      <NumberSelector
        round={round}
        members={members}
        currentUserId={currentUserId}
        onSelectNumber={handleSelectNumber}
        onDeselectNumber={handleDeselectNumber}
      />

      {/* 추첨 시작 버튼 */}
      {isAllSelected && (
        <div className="text-center">
          <button
            onClick={handleStartDraw}
            className="bg-gradient-to-r from-blue-500 to-cyan-500 text-white px-8 py-4 rounded-2xl font-bold text-lg shadow-lg hover:shadow-xl transition-all hover:scale-105 active:scale-95"
          >
            🎱 추첨 시작하기
          </button>
          <p className="text-sm text-gray-500 mt-2">관리자 비밀번호가 필요합니다</p>
        </div>
      )}

      {/* 비밀번호 모달 */}
      <AdminPasswordModal
        isOpen={showPasswordModal}
        onClose={() => setShowPasswordModal(false)}
        onVerify={verifyPassword}
        onSuccess={handleDrawConfirmed}
        title="추첨 시작"
        description="추첨을 시작하려면 관리자 비밀번호를 입력하세요"
      />
    </div>
  );
}
