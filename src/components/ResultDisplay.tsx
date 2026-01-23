'use client';

import { useState, useMemo } from 'react';
import { Member, Round } from '@/types';
import { useHistory } from '@/hooks/useHistory';
import { useSettings } from '@/hooks/useSettings';
import AdminPasswordModal from '@/components/AdminPasswordModal';

interface ResultDisplayProps {
  round: Round;
  members: Member[];
}

// 금요일 날짜 생성 함수 (최근 4주 + 앞으로 2주)
function generateFridays(): string[] {
  const fridays: string[] = [];
  const today = new Date();

  // 4주 전부터
  const startDate = new Date(today);
  startDate.setDate(startDate.getDate() - 28);

  // 가장 가까운 금요일 찾기
  while (startDate.getDay() !== 5) {
    startDate.setDate(startDate.getDate() + 1);
  }

  // 2주 후까지
  const endDate = new Date(today);
  endDate.setDate(endDate.getDate() + 14);

  let current = new Date(startDate);
  while (current <= endDate) {
    const year = current.getFullYear();
    const month = String(current.getMonth() + 1).padStart(2, '0');
    const day = String(current.getDate()).padStart(2, '0');
    fridays.push(`${year}-${month}-${day}`);
    current.setDate(current.getDate() + 7);
  }

  return fridays;
}

// 날짜 포맷 함수
function formatDateKorean(dateStr: string): string {
  const date = new Date(dateStr);
  const month = date.getMonth() + 1;
  const day = date.getDate();
  return `${month}월 ${day}일`;
}

export default function ResultDisplay({ round, members }: ResultDisplayProps) {
  const selections = round.numberSelections || {};
  const { addRecord, getRecordByDate } = useHistory();
  const { verifyPassword } = useSettings();

  const [isAdmin, setIsAdmin] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState<'thisWeek' | 'nextWeek' | null>(null);
  const [selectedDate, setSelectedDate] = useState('');
  const [saveNote, setSaveNote] = useState('');
  const [saving, setSaving] = useState(false);

  const fridays = useMemo(() => generateFridays(), []);

  // 멤버 ID로 이름 찾기
  const getMemberName = (memberId: string) => {
    const member = members.find((m) => m.id === memberId);
    return member?.name || '알 수 없음';
  };

  const today = new Date();
  const dateStr = `${today.getFullYear()}년 ${today.getMonth() + 1}월 ${today.getDate()}일`;

  const handleAdminAuth = () => {
    setIsAdmin(true);
    setShowAuthModal(false);
  };

  const openSaveModal = (type: 'thisWeek' | 'nextWeek') => {
    // 기본 날짜 설정 (가장 가까운 금요일)
    const todayStr = today.toISOString().split('T')[0];
    const closestFriday = fridays.find((f) => f >= todayStr) || fridays[fridays.length - 1];
    setSelectedDate(closestFriday);
    setSaveNote('');
    setShowSaveModal(type);
  };

  const handleSaveToHistory = async () => {
    if (!selectedDate || !showSaveModal) return;

    const existingRecord = getRecordByDate(selectedDate);
    if (existingRecord) {
      if (!confirm(`${formatDateKorean(selectedDate)}에 이미 기록이 있습니다. 덮어쓰시겠습니까?`)) {
        return;
      }
    }

    setSaving(true);

    const memberIds = showSaveModal === 'thisWeek'
      ? round.thisWeekGroup || []
      : round.nextWeekGroup || [];

    const memberNames = memberIds.map((id) => getMemberName(id));

    await addRecord({
      date: selectedDate,
      memberNames,
      note: saveNote,
      isWinner: showSaveModal === 'thisWeek',
    });

    setSaving(false);
    setShowSaveModal(null);
    alert('기록이 저장되었습니다!');
  };

  return (
    <div className="space-y-6">
      {/* 완료 메시지 */}
      <div className="text-center">
        <span className="text-4xl">🎉</span>
        <h2 className="text-2xl font-bold text-gray-800 mt-2">추첨 완료!</h2>
        <p className="text-gray-600 mt-1">{dateStr}</p>
      </div>

      {/* 관리자 모드 토글 */}
      <div className="text-center">
        {!isAdmin ? (
          <button
            onClick={() => setShowAuthModal(true)}
            className="text-sm text-gray-500 hover:text-blue-500 transition-colors"
          >
            관리자 모드
          </button>
        ) : (
          <span className="inline-block px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm">
            관리자 모드 활성화
          </span>
        )}
      </div>

      {/* 이번 주 점심 조 */}
      <div className="result-card bg-gradient-to-br from-blue-50 to-cyan-50 border-blue-200">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-blue-600 flex items-center gap-2">
            🍱 이번 주 점심 조
          </h3>
          {isAdmin && (
            <button
              onClick={() => openSaveModal('thisWeek')}
              className="text-xs px-3 py-1.5 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              📅 기록에 저장
            </button>
          )}
        </div>
        <div className="flex flex-col sm:flex-row gap-4">
          {/* 멤버 목록 */}
          <div className="flex-1 flex flex-wrap gap-3 justify-center items-center">
            {(round.thisWeekGroup || []).map((memberId) => (
              <div
                key={memberId}
                className="bg-white px-4 py-2 rounded-full shadow-sm border border-blue-200 font-medium text-gray-800"
              >
                {getMemberName(memberId)}
              </div>
            ))}
          </div>
          {/* 혜택 카드 */}
          <div className="sm:w-64 bg-white rounded-xl p-4 border-2 border-blue-300 shadow-md animate-benefit-glow">
            <p className="text-sm font-bold text-blue-600 mb-3">혜택</p>
            <ul className="text-sm text-gray-700 space-y-2">
              <li className="flex items-start gap-2">
                <span className="text-lg">💳</span>
                <span>인당 15,000원 내 법카 사용</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-lg">⏰</span>
                <span>점심시간 1.5시간</span>
              </li>
              <li className="flex items-start gap-2 text-blue-600 font-bold bg-blue-50 -mx-2 px-2 py-1.5 rounded-lg">
                <span className="text-lg">🎁</span>
                <span>당첨 혜택 인당 5,000원 추가</span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* 다음 주 점심 조 */}
      <div className="result-card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-gray-600 flex items-center gap-2">
            📅 다음 주 점심 조
          </h3>
          {isAdmin && (
            <button
              onClick={() => openSaveModal('nextWeek')}
              className="text-xs px-3 py-1.5 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
            >
              📅 기록에 저장
            </button>
          )}
        </div>
        <div className="flex flex-col sm:flex-row gap-4">
          {/* 멤버 목록 */}
          <div className="flex-1 flex flex-wrap gap-3 justify-center items-center">
            {(round.nextWeekGroup || []).map((memberId, index) => (
              <div
                key={`${memberId}-${index}`}
                className="bg-gray-100 px-4 py-2 rounded-full font-medium text-gray-700"
              >
                {getMemberName(memberId)}
              </div>
            ))}
          </div>
          {/* 혜택 카드 */}
          <div className="sm:w-64 bg-gray-50 rounded-xl p-4 border-2 border-gray-200 shadow-md">
            <p className="text-sm font-bold text-gray-600 mb-3">혜택</p>
            <ul className="text-sm text-gray-700 space-y-2">
              <li className="flex items-start gap-2">
                <span className="text-lg">💳</span>
                <span>인당 15,000원 내 법카 사용</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-lg">⏰</span>
                <span>점심시간 1.5시간</span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* 번호별 결과 */}
      <div className="result-card">
        <h3 className="text-lg font-bold text-gray-600 mb-4">📋 번호별 결과</h3>
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
          {Object.entries(selections)
            .sort(([a], [b]) => Number(a) - Number(b))
            .map(([number, memberId]) => {
              const isThisWeek = (round.thisWeekGroup || []).includes(memberId);
              return (
                <div
                  key={number}
                  className={`flex items-center gap-2 p-2 rounded-lg ${
                    isThisWeek ? 'bg-blue-100' : 'bg-gray-50'
                  }`}
                >
                  <span
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                      isThisWeek
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-300 text-gray-600'
                    }`}
                  >
                    {number}
                  </span>
                  <span className="text-sm text-gray-700 truncate">
                    {getMemberName(memberId)}
                  </span>
                </div>
              );
            })}
        </div>
      </div>

      {/* 관리자 인증 모달 */}
      <AdminPasswordModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onVerify={verifyPassword}
        onSuccess={handleAdminAuth}
        title="관리자 인증"
        description="기록 저장 기능을 사용하려면 관리자 비밀번호를 입력하세요"
      />

      {/* 기록 저장 모달 */}
      {showSaveModal && (
        <div className="modal-overlay" onClick={() => setShowSaveModal(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-xl font-bold text-gray-800 mb-2">
              📅 기록에 저장
            </h2>
            <p className="text-gray-600 mb-4">
              {showSaveModal === 'thisWeek' ? '이번 주 점심 조' : '다음 주 점심 조'}를 기록에 저장합니다
            </p>

            {/* 멤버 미리보기 */}
            <div className="mb-4 p-3 bg-gray-50 rounded-lg">
              <p className="text-xs text-gray-500 mb-2">저장할 멤버</p>
              <div className="flex flex-wrap gap-2">
                {(showSaveModal === 'thisWeek' ? round.thisWeekGroup : round.nextWeekGroup || []).map((id) => (
                  <span key={id} className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-sm">
                    {getMemberName(id)}
                  </span>
                ))}
              </div>
            </div>

            {/* 날짜 선택 */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                저장할 날짜 선택
              </label>
              <select
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full p-3 border border-gray-200 rounded-lg focus:border-blue-500 focus:outline-none"
              >
                {fridays.map((date) => {
                  const existing = getRecordByDate(date);
                  return (
                    <option key={date} value={date}>
                      {formatDateKorean(date)} {existing ? '(기록 있음)' : ''}
                    </option>
                  );
                })}
              </select>
            </div>

            {/* 메모 입력 */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                메모 (선택)
              </label>
              <input
                type="text"
                value={saveNote}
                onChange={(e) => setSaveNote(e.target.value)}
                placeholder="추가 메모를 입력하세요"
                className="w-full p-3 border border-gray-200 rounded-lg focus:border-blue-500 focus:outline-none"
              />
            </div>

            {/* 타입 표시 */}
            <div className="mb-4 p-3 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600">
                저장 타입: {' '}
                <span className={showSaveModal === 'thisWeek' ? 'text-blue-600 font-medium' : 'text-gray-600 font-medium'}>
                  {showSaveModal === 'thisWeek' ? '당첨 조 (파란색)' : '일반 조 (회색)'}
                </span>
              </p>
            </div>

            {/* 버튼 */}
            <div className="flex gap-3">
              <button
                onClick={() => setShowSaveModal(null)}
                className="flex-1 py-3 px-4 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-colors"
              >
                취소
              </button>
              <button
                onClick={handleSaveToHistory}
                disabled={saving}
                className="flex-1 py-3 px-4 bg-blue-500 text-white rounded-xl font-medium hover:bg-blue-600 transition-colors disabled:bg-gray-300"
              >
                {saving ? '저장 중...' : '저장'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
