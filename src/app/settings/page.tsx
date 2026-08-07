'use client';

import { useState, useEffect } from 'react';
import { ref, set, remove } from 'firebase/database';
import { getDb } from '@/lib/firebase';
import { useMembers } from '@/hooks/useMembers';
import { useCurrentRound } from '@/hooks/useCurrentRound';
import { useStatistics } from '@/hooks/useStatistics';
import { useSettings } from '@/hooks/useSettings';
import AdminPasswordModal from '@/components/AdminPasswordModal';

const IS_PRODUCTION = process.env.NODE_ENV === 'production';

export default function SettingsPage() {
  const { members, loading: membersLoading, addMember, updateMember, deleteMember } = useMembers();
  const { round, createRound, resetRound } = useCurrentRound();
  const { restoreStatistics } = useStatistics();
  const { verifyPassword, changePassword } = useSettings();

  // 관리자 인증 상태
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(true);

  const [newMemberName, setNewMemberName] = useState('');
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [drawCount, setDrawCount] = useState(4);
  const [nextWeekCount, setNextWeekCount] = useState(5);
  const [includeAbsentees, setIncludeAbsentees] = useState(true);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [pendingAction, setPendingAction] = useState<'newRound' | 'reset' | null>(null);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [showInitModal, setShowInitModal] = useState(false);
  const [initializing, setInitializing] = useState(false);

  const activeMembers = members.filter((m) => m.isActive);

  // 이름으로 멤버 ID 찾기
  const getMemberIdByName = (name: string) => {
    const member = members.find((m) => m.name === name);
    return member?.id || null;
  };

  // 과거 데이터 초기화
  const handleInitializeHistory = async () => {
    if (IS_PRODUCTION) {
      alert('운영 환경에서는 과거 데이터를 초기화할 수 없습니다.');
      return;
    }

    // 먼저 멤버 매칭 확인
    const requiredNames = ['고희진', '김수진', '이규희', '강봉수', '김민주', '최성학', '권태욱', '강완', '윤선빈'];
    const missingNames = requiredNames.filter((name) => !getMemberIdByName(name));

    if (missingNames.length > 0) {
      alert(`다음 멤버가 등록되어 있지 않습니다: ${missingNames.join(', ')}\n\n먼저 구성원 관리에서 해당 멤버를 추가해주세요.`);
      return;
    }

    if (!confirm('기존 기록, 스코어, 찐친 데이터가 모두 삭제되고 새로운 데이터로 대체됩니다. 계속하시겠습니까?')) {
      return;
    }

    setInitializing(true);

    try {
      const db = getDb();
      if (!db) throw new Error('Firebase 연결 실패');

      // 1. 기존 데이터 삭제
      await remove(ref(db, 'history'));
      await remove(ref(db, 'statistics/memberScores'));
      await remove(ref(db, 'statistics/pairCounts'));

      // 2. 과거 기록 데이터 (사용자가 실제로 진행한 이력 기준)
      const historicalData = [
        {
          date: '2025-12-26',
          memberNames: ['고희진', '김수진', '이규희', '강봉수'],
          note: '',
          isWinner: true,
        },
        {
          date: '2026-01-02',
          memberNames: [],
          note: '신년회 기념 전체 회식으로 변경!',
          isWinner: false,
        },
        {
          date: '2026-01-09',
          memberNames: ['김민주', '최성학', '이규희', '김수진'],
          note: '',
          isWinner: true,
        },
        {
          date: '2026-01-16',
          memberNames: ['강봉수', '고희진', '권태욱', '강완'],
          note: '윤선빈, 김민주는 깍두기 참여',
          isWinner: false,
        },
        {
          date: '2026-01-23',
          memberNames: ['권태욱', '김수진', '윤선빈', '최성학'],
          note: '',
          isWinner: true,
        },
        {
          date: '2026-01-30',
          memberNames: [],
          note: '전체 회식으로 랜덤 런치 건너뜀',
          isWinner: false,
        },
        {
          date: '2026-02-06',
          memberNames: ['강완', '강봉수', '김민주', '고희진', '이규희'],
          note: '',
          isWinner: false,
        },
        {
          date: '2026-02-13',
          memberNames: ['이규희', '김수진', '권태욱', '고희진'],
          note: '',
          isWinner: true,
        },
        {
          date: '2026-02-20',
          memberNames: ['윤선빈', '강완', '강봉수', '김민주', '최성학'],
          note: '',
          isWinner: false,
        },
        {
          date: '2026-02-27',
          memberNames: [],
          note: '전체 회식으로 랜덤 런치 건너뜀',
          isWinner: false,
        },
      ];

      // 3. History에 기록 추가
      const now = Date.now();
      const historyRecords: Record<string, object> = {};
      historicalData.forEach((record, index) => {
        const key = `record_${index}`;
        historyRecords[key] = {
          ...record,
          createdAt: now,
          updatedAt: now,
        };
      });
      await set(ref(db, 'history'), historyRecords);

      // 4. 스코어 계산 (당첨 그룹만)
      const memberScores: Record<string, number> = {};
      const winnerGroups = historicalData.filter((d) => d.isWinner && d.memberNames.length > 0);

      winnerGroups.forEach((group) => {
        group.memberNames.forEach((name) => {
          const memberId = getMemberIdByName(name);
          if (memberId) {
            memberScores[memberId] = (memberScores[memberId] || 0) + 1;
          }
        });
      });
      await set(ref(db, 'statistics/memberScores'), memberScores);

      // 5. 찐친 페어 카운트 계산 (모든 그룹 - 깍두기 포함, 전체 회식/건너뜀 날짜 제외)
      const pairCounts: Record<string, number> = {};

      // 찐친 카운트에 포함할 그룹 (깍두기 포함)
      const pairGroups = [
        ['고희진', '김수진', '이규희', '강봉수'], // 12/26 (당첨조)
        // 1/2 skip (전체 회식)
        ['김민주', '최성학', '이규희', '김수진'], // 1/9 (당첨조)
        ['강봉수', '고희진', '권태욱', '강완', '윤선빈', '김민주'], // 1/16 (깍두기 포함, 비당첨조)
        ['권태욱', '김수진', '윤선빈', '최성학'], // 1/23 (당첨조)
        // 1/30 skip (전체 회식)
        ['강완', '강봉수', '김민주', '고희진', '이규희'], // 2/6 (비당첨조)
        ['이규희', '김수진', '권태욱', '고희진'], // 2/13 (당첨조)
        ['윤선빈', '강완', '강봉수', '김민주', '최성학'], // 2/20 (비당첨조)
        // 2/27 skip (전체 회식)
      ];

      pairGroups.forEach((group) => {
        const memberIds = group.map((name) => getMemberIdByName(name)).filter((id): id is string => !!id);

        for (let i = 0; i < memberIds.length; i++) {
          for (let j = i + 1; j < memberIds.length; j++) {
            const pairKey = [memberIds[i], memberIds[j]].sort().join('_');
            pairCounts[pairKey] = (pairCounts[pairKey] || 0) + 1;
          }
        }
      });
      await set(ref(db, 'statistics/pairCounts'), pairCounts);

      alert('과거 데이터가 성공적으로 초기화되었습니다!');
      setShowInitModal(false);
    } catch (err) {
      console.error('초기화 오류:', err);
      alert('데이터 초기화 중 오류가 발생했습니다.');
    } finally {
      setInitializing(false);
    }
  };

  // 활성 멤버가 로드되면 모두 선택
  useEffect(() => {
    if (activeMembers.length > 0 && selectedMembers.length === 0) {
      setSelectedMembers(activeMembers.map((m) => m.id));
    }
  }, [activeMembers]);

  // 관리자 인증 성공
  const handleAuthSuccess = () => {
    setIsAuthenticated(true);
    setShowAuthModal(false);
  };

  // 추가 중 상태 (중복 방지)
  const [isAdding, setIsAdding] = useState(false);

  // 멤버 추가
  const handleAddMember = async () => {
    if (!newMemberName.trim() || isAdding) return;
    setIsAdding(true);
    await addMember(newMemberName.trim());
    setNewMemberName('');
    setIsAdding(false);
  };

  // 멤버 삭제
  const handleDeleteMember = async (id: string, name: string) => {
    if (confirm(`"${name}"을(를) 삭제하시겠습니까?`)) {
      await deleteMember(id);
    }
  };

  // 멤버 참여 토글
  const toggleMember = (memberId: string) => {
    setSelectedMembers((prev) =>
      prev.includes(memberId)
        ? prev.filter((id) => id !== memberId)
        : [...prev, memberId]
    );
  };

  // 미참여 멤버 수
  const absenteeCount = activeMembers.length - selectedMembers.length;

  // 다음 주 최대 가능 인원 (미참여 + 추첨 탈락자)
  const maxNextWeek = includeAbsentees
    ? absenteeCount + (selectedMembers.length - drawCount)
    : selectedMembers.length - drawCount;

  // 유효성 검사
  const isDrawCountValid = drawCount <= selectedMembers.length;
  const isNextWeekValid = nextWeekCount <= maxNextWeek;
  const isConfigValid = isDrawCountValid && isNextWeekValid && selectedMembers.length >= 4;

  // 새 라운드 시작
  const handleStartNewRound = () => {
    if (selectedMembers.length < 4) {
      alert('최소 4명 이상 선택해주세요');
      return;
    }
    if (!isDrawCountValid) {
      alert('이번 주 추첨 인원이 참여 인원보다 많습니다');
      return;
    }
    if (!isNextWeekValid) {
      alert(`다음 주 인원은 최대 ${maxNextWeek}명까지 가능합니다`);
      return;
    }
    setPendingAction('newRound');
    setShowPasswordModal(true);
  };

  // 새 라운드 확인
  const handleNewRoundConfirmed = async () => {
    setShowPasswordModal(false);

    // 미참여 멤버 (활성 멤버 중 선택되지 않은 멤버)
    const absenteeIds = activeMembers
      .filter((m) => !selectedMembers.includes(m.id))
      .map((m) => m.id);

    await createRound(selectedMembers, {
      drawCount,
      nextWeekCount,
      includeAbsentees,
      absenteeIds,
    });
    setPendingAction(null);
    alert('새 라운드가 시작되었습니다!');
  };

  // 리셋 시작
  const handleReset = () => {
    setPendingAction('reset');
    setShowResetModal(true);
  };

  // 리셋 확인
  const handleResetConfirmed = async () => {
    setShowResetModal(false);

    // 스냅샷이 있으면 통계 복원
    if (round?.preDrawSnapshot) {
      await restoreStatistics({
        memberScores: round.preDrawSnapshot.memberScores,
        pairCounts: round.preDrawSnapshot.pairCounts,
      });
    }

    // 라운드 리셋
    await resetRound();
    setPendingAction(null);
    alert('라운드가 리셋되었습니다');
  };

  // 비밀번호 변경
  const handleChangePassword = async () => {
    if (newPassword.length !== 4 || !/^\d+$/.test(newPassword)) {
      alert('비밀번호는 숫자 4자리여야 합니다');
      return;
    }
    await changePassword(newPassword);
    setNewPassword('');
    setShowChangePassword(false);
    alert('비밀번호가 변경되었습니다');
  };

  // 로딩 중
  if (membersLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  // 관리자 인증 필요
  if (!isAuthenticated) {
    return (
      <div className="space-y-6">
        <div className="text-center py-10">
          <span className="text-6xl block mb-4">🔐</span>
          <h2 className="text-xl font-bold text-gray-800 mb-2">관리자 전용</h2>
          <p className="text-gray-600 mb-6">설정 페이지에 접근하려면 관리자 인증이 필요합니다</p>
          <button
            onClick={() => setShowAuthModal(true)}
            className="bg-blue-500 text-white px-6 py-3 rounded-xl font-medium hover:bg-blue-600 transition-colors"
          >
            비밀번호 입력
          </button>
        </div>

        <AdminPasswordModal
          isOpen={showAuthModal}
          onClose={() => setShowAuthModal(false)}
          onVerify={verifyPassword}
          onSuccess={handleAuthSuccess}
          title="관리자 인증"
          description="설정 페이지에 접근하려면 관리자 비밀번호를 입력하세요"
        />
      </div>
    );
  }

  // 인증 완료 - 설정 페이지 표시
  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-800">⚙️ 설정</h2>
        <p className="text-gray-600 mt-1">관리자 전용</p>
      </div>

      {/* 멤버 관리 */}
      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
        <h3 className="font-bold text-gray-800 mb-4">👥 구성원 관리</h3>

        {/* 새 멤버 추가 */}
        <div className="flex gap-2 mb-4">
          <input
            type="text"
            value={newMemberName}
            onChange={(e) => setNewMemberName(e.target.value)}
            placeholder="새 구성원 이름"
            className="flex-1 p-3 border border-gray-200 rounded-lg focus:border-blue-500 focus:outline-none"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleAddMember();
              }
            }}
            disabled={isAdding}
          />
          <button
            onClick={handleAddMember}
            disabled={isAdding}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 transition-colors disabled:bg-gray-300"
          >
            {isAdding ? '...' : '추가'}
          </button>
        </div>

        {/* 멤버 리스트 */}
        <div className="space-y-2 max-h-60 overflow-y-auto">
          {members.map((member) => (
            <div
              key={member.id}
              className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-50"
            >
              <span className={`flex-1 ${member.isActive ? 'text-gray-800' : 'text-gray-400 line-through'}`}>
                {member.name}
              </span>
              <button
                onClick={() => updateMember(member.id, { isActive: !member.isActive })}
                className={`px-3 py-1 rounded-full text-sm ${
                  member.isActive
                    ? 'bg-green-100 text-green-700'
                    : 'bg-gray-100 text-gray-500'
                }`}
              >
                {member.isActive ? '활성' : '비활성'}
              </button>
              <button
                onClick={() => handleDeleteMember(member.id, member.name)}
                className="px-2 py-1 rounded-full text-sm bg-red-100 text-red-600 hover:bg-red-200 transition-colors"
              >
                삭제
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* 새 라운드 시작 */}
      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
        <h3 className="font-bold text-gray-800 mb-4">🎯 새 라운드 시작</h3>

        {/* 참여자 선택 */}
        <p className="text-sm text-gray-600 mb-2">참여할 구성원을 선택하세요:</p>
        <div className="grid grid-cols-2 gap-2 mb-4">
          {activeMembers.map((member) => (
            <label
              key={member.id}
              className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer border ${
                selectedMembers.includes(member.id)
                  ? 'bg-blue-50 border-blue-300'
                  : 'bg-gray-50 border-gray-200'
              }`}
            >
              <input
                type="checkbox"
                checked={selectedMembers.includes(member.id)}
                onChange={() => toggleMember(member.id)}
                className="w-4 h-4 text-blue-500"
              />
              <span className="text-gray-800">{member.name}</span>
            </label>
          ))}
        </div>

        {/* 추첨 인원 설정 */}
        <div className="space-y-3 mb-4 p-3 bg-gray-50 rounded-lg">
          <div className="flex items-center gap-4">
            <label className="text-sm text-gray-600 w-32">이번 주 추첨:</label>
            <select
              value={drawCount}
              onChange={(e) => setDrawCount(Number(e.target.value))}
              className="p-2 border border-gray-200 rounded-lg bg-white"
            >
              {[2, 3, 4, 5, 6].map((n) => (
                <option key={n} value={n}>
                  {n}명
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-4">
            <label className="text-sm text-gray-600 w-32">다음 주 인원:</label>
            <select
              value={nextWeekCount}
              onChange={(e) => setNextWeekCount(Number(e.target.value))}
              className="p-2 border border-gray-200 rounded-lg bg-white"
            >
              {[2, 3, 4, 5, 6].map((n) => (
                <option key={n} value={n}>
                  {n}명
                </option>
              ))}
            </select>
          </div>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={includeAbsentees}
              onChange={(e) => setIncludeAbsentees(e.target.checked)}
              className="w-4 h-4 text-blue-500 rounded"
            />
            <span className="text-sm text-gray-700">
              미참여 멤버 다음주 필수 배정
            </span>
          </label>

          {/* 현황 요약 */}
          <div className="text-xs text-gray-500 pt-2 border-t border-gray-200 space-y-1">
            <p>참여: {selectedMembers.length}명 / 미참여: {absenteeCount}명</p>
            <p>이번 주: {drawCount}명 추첨 → 탈락: {Math.max(0, selectedMembers.length - drawCount)}명</p>
            <p>다음 주 최대 가능: {maxNextWeek}명 {includeAbsentees && absenteeCount > 0 ? `(미참여 ${absenteeCount} + 탈락 ${Math.max(0, selectedMembers.length - drawCount)})` : ''}</p>
          </div>

          {/* 유효성 경고 */}
          {!isDrawCountValid && (
            <p className="text-xs text-red-600 font-medium">
              ⚠️ 이번 주 추첨 인원이 참여 인원({selectedMembers.length}명)보다 많습니다
            </p>
          )}
          {!isNextWeekValid && (
            <p className="text-xs text-red-600 font-medium">
              ⚠️ 다음 주 인원은 최대 {maxNextWeek}명까지 가능합니다
            </p>
          )}

          {/* 미참여 멤버 안내 */}
          {includeAbsentees && absenteeCount > 0 && (
            <p className="text-xs text-blue-600">
              * 미참여 {absenteeCount}명이 다음 주에 자동 포함됩니다
            </p>
          )}
        </div>

        <button
          onClick={handleStartNewRound}
          disabled={!isConfigValid}
          className="w-full py-3 bg-blue-500 text-white rounded-xl font-medium hover:bg-blue-600 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
        >
          새 라운드 시작
        </button>
      </div>

      {/* 현재 라운드 관리 */}
      {round && (
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <h3 className="font-bold text-gray-800 mb-4">📋 현재 라운드</h3>
          <div className="space-y-2 text-sm text-gray-600 mb-4">
            <p>상태: <span className="font-medium text-gray-800">{round.status}</span></p>
            <p>참여 인원: <span className="font-medium text-gray-800">{round.participantIds.length}명</span></p>
            <p>추첨 인원: <span className="font-medium text-gray-800">{round.drawCount}명</span></p>
          </div>

          {round.status !== 'completed' && (
            <button
              onClick={handleReset}
              className="w-full py-3 bg-red-500 text-white rounded-xl font-medium hover:bg-red-600 transition-colors"
            >
              🔄 라운드 리셋
            </button>
          )}
        </div>
      )}

      {/* 비밀번호 변경 */}
      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
        <h3 className="font-bold text-gray-800 mb-4">🔐 비밀번호 변경</h3>

        {showChangePassword ? (
          <div className="space-y-3">
            <input
              type="password"
              maxLength={4}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value.replace(/\D/g, ''))}
              placeholder="새 비밀번호 (숫자 4자리)"
              className="w-full p-3 border border-gray-200 rounded-lg text-center text-xl tracking-widest"
            />
            <div className="flex gap-2">
              <button
                onClick={() => setShowChangePassword(false)}
                className="flex-1 py-2 bg-gray-100 text-gray-700 rounded-lg"
              >
                취소
              </button>
              <button
                onClick={handleChangePassword}
                className="flex-1 py-2 bg-blue-500 text-white rounded-lg"
              >
                변경
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setShowChangePassword(true)}
            className="w-full py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-colors"
          >
            비밀번호 변경하기
          </button>
        )}
      </div>

      {/* 데이터 초기화 (개발 환경에서만 표시) */}
      {!IS_PRODUCTION && (
        <div className="bg-white rounded-xl p-4 shadow-sm border border-red-100">
          <h3 className="font-bold text-gray-800 mb-4">📊 과거 데이터 초기화</h3>
          <p className="text-sm text-gray-600 mb-4">
            기록, 스코어, 찐친 데이터를 미리 정의된 과거 데이터로 초기화합니다.
          </p>

          {showInitModal ? (
            <div className="space-y-4">
              {/* 현재 등록된 멤버 */}
              <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                <p className="text-sm text-blue-800 font-medium mb-2">현재 등록된 멤버:</p>
                <p className="text-xs text-blue-700">
                  {members.map((m) => m.name).join(', ') || '없음'}
                </p>
              </div>

              {/* 필요한 멤버 체크 */}
              <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                <p className="text-sm text-gray-800 font-medium mb-2">필요한 멤버 (9명):</p>
                <div className="flex flex-wrap gap-1">
                  {['고희진', '김수진', '이규희', '강봉수', '김민주', '최성학', '권태욱', '강완', '윤선빈'].map((name) => {
                    const found = !!getMemberIdByName(name);
                    return (
                      <span
                        key={name}
                        className={`px-2 py-0.5 rounded text-xs ${
                          found ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                        }`}
                      >
                        {name} {found ? '✓' : '✗'}
                      </span>
                    );
                  })}
                </div>
              </div>

              <div className="p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                <p className="text-sm text-yellow-800 font-medium mb-2">⚠️ 초기화할 데이터:</p>
                <ul className="text-xs text-yellow-700 space-y-1 list-disc list-inside">
                  <li>12/26 당첨: 고희진, 김수진, 이규희, 강봉수</li>
                  <li>1/2 미당첨: (전체 회식)</li>
                  <li>1/9 당첨: 김민주, 최성학, 이규희, 김수진</li>
                  <li>1/16 미당첨: 강봉수, 고희진, 권태욱, 강완 (+깍두기: 윤선빈, 김민주)</li>
                  <li>1/23 당첨: 최성학, 윤선빈, 김수진, 권태욱</li>
                  <li>1/30 미당첨: 강완, 고희진, 강봉수, 이규희, 김민주</li>
                </ul>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowInitModal(false)}
                  className="flex-1 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm"
                >
                  취소
                </button>
                <button
                  onClick={handleInitializeHistory}
                  disabled={initializing}
                  className="flex-1 py-2 bg-red-500 text-white rounded-lg text-sm hover:bg-red-600 transition-colors disabled:bg-gray-300"
                >
                  {initializing ? '초기화 중...' : '초기화 실행'}
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowInitModal(true)}
              className="w-full py-3 bg-red-100 text-red-700 rounded-xl font-medium hover:bg-red-200 transition-colors"
            >
              과거 데이터 초기화
            </button>
          )}
        </div>
      )}

      {/* 비밀번호 모달 */}
      <AdminPasswordModal
        isOpen={showPasswordModal}
        onClose={() => {
          setShowPasswordModal(false);
          setPendingAction(null);
        }}
        onVerify={verifyPassword}
        onSuccess={handleNewRoundConfirmed}
        title="새 라운드 시작"
        description="새 라운드를 시작하려면 관리자 비밀번호를 입력하세요"
      />

      {/* 리셋 확인 모달 */}
      {showResetModal && (
        <div className="modal-overlay" onClick={() => setShowResetModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-xl font-bold text-red-600 mb-2">⚠️ 라운드 리셋</h2>
            <p className="text-gray-600 mb-4">
              정말 리셋하시겠습니까? 다음 데이터가 롤백됩니다:
            </p>
            <ul className="text-sm text-gray-600 mb-4 space-y-1 list-disc list-inside">
              <li>추첨 결과 (당첨 번호, 조 편성)</li>
              <li>모든 구성원의 번호 선택</li>
              <li>누적 스코어 (이번 라운드 반영분)</li>
              <li>찐친 카운트 (이번 라운드 반영분)</li>
            </ul>

            <AdminPasswordModal
              isOpen={true}
              onClose={() => setShowResetModal(false)}
              onVerify={verifyPassword}
              onSuccess={handleResetConfirmed}
              title=""
              description="관리자 비밀번호를 입력하세요"
            />
          </div>
        </div>
      )}
    </div>
  );
}
