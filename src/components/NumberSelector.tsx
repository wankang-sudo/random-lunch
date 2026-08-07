'use client';

import { Member, Round } from '@/types';

interface NumberSelectorProps {
  round: Round;
  members: Member[];
  currentUserId: string | null;
  onSelectNumber: (number: number) => void;
  onDeselectNumber: (number: number) => void;
}

export default function NumberSelector({
  round,
  members,
  currentUserId,
  onSelectNumber,
  onDeselectNumber,
}: NumberSelectorProps) {
  const participantCount = round.participantIds.length;
  const selections = round.numberSelections || {};

  // 멤버 ID로 이름 찾기
  const getMemberName = (memberId: string) => {
    const member = members.find((m) => m.id === memberId);
    return member?.name || '알 수 없음';
  };

  // 번호별 선택 상태 확인
  const getNumberState = (number: number) => {
    const selectedBy = selections[number];
    if (!selectedBy) return 'available';
    if (selectedBy === currentUserId) return 'my-selection';
    return 'selected';
  };

  return (
    <div className="space-y-6">
      {/* 참여 정보 */}
      <div className="text-center space-y-1">
        <p className="text-gray-600">
          📅 이번 라운드: <span className="font-semibold">{participantCount}명</span> 참여
        </p>
        <p className="text-gray-600">
          🎯 추첨 인원: <span className="font-semibold text-blue-600">{round.drawCount}명</span>
          {' → '}
          다음 주: <span className="font-semibold">{participantCount - round.drawCount}명</span>
        </p>

        {/* 당첨조 보상 카드 */}
        <div className="mt-4 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-xl p-4 border-2 border-blue-200">
          <p className="text-sm font-bold text-blue-600 mb-3">🎁 당첨조 보상</p>
          <ul className="text-sm text-gray-700 space-y-2">
            <li className="flex items-center gap-2">
              <span className="text-lg">💳</span>
              <span>인당 15,000원 내 법카 사용</span>
            </li>
            <li className="flex items-center gap-2">
              <span className="text-lg">⏰</span>
              <span>점심시간 1.5시간</span>
            </li>
            <li className="flex items-center gap-2 text-blue-600 font-bold bg-blue-100 -mx-2 px-2 py-1.5 rounded-lg">
              <span className="text-lg">🎁</span>
              <span>당첨 혜택 인당 5,000원 추가</span>
            </li>
          </ul>
        </div>
      </div>

      {/* 선택 현황 */}
      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
        <p className="text-sm text-gray-500 text-center mb-2">
          선택 현황: {Object.keys(selections).length} / {participantCount}
        </p>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-blue-500 h-2 rounded-full transition-all duration-300"
            style={{
              width: `${(Object.keys(selections).length / participantCount) * 100}%`,
            }}
          />
        </div>
      </div>

      {/* 번호 선택 그리드 */}
      <div className="flex flex-wrap justify-center gap-4">
        {Array.from({ length: participantCount }, (_, i) => i + 1).map((number) => {
          const state = getNumberState(number);
          const selectedBy = selections[number];

          const handleClick = () => {
            if (state === 'available') {
              onSelectNumber(number);
            } else if (state === 'my-selection') {
              onDeselectNumber(number);
            }
          };

          return (
            <div key={number} className="flex flex-col items-center gap-1">
              <button
                onClick={handleClick}
                disabled={state === 'selected'}
                className={`number-button ${state} ${state === 'my-selection' ? 'cursor-pointer' : ''}`}
                title={state === 'my-selection' ? '클릭하여 취소' : ''}
              >
                {number}
              </button>
              {selectedBy && (
                <span className="text-xs text-gray-600 max-w-16 truncate">
                  {getMemberName(selectedBy)}
                </span>
              )}
              {state === 'my-selection' && (
                <span className="text-xs text-green-600">내 선택</span>
              )}
            </div>
          );
        })}
      </div>

      {/* 안내 메시지 */}
      {!currentUserId && (
        <p className="text-center text-gray-500 text-sm">
          번호를 선택하려면 먼저 설정에서 본인을 선택해주세요
        </p>
      )}
    </div>
  );
}
