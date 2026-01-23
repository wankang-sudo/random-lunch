'use client';

import { useMembers } from '@/hooks/useMembers';
import { useStatistics } from '@/hooks/useStatistics';

export default function ScorePage() {
  const { members, loading: membersLoading } = useMembers();
  const { statistics, loading: statsLoading, getScoreRanking } = useStatistics();

  if (membersLoading || statsLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  const getMemberName = (memberId: string) => {
    const member = members.find((m) => m.id === memberId);
    return member?.name || null;
  };

  // 존재하는 멤버만 필터링
  const ranking = getScoreRanking().filter((item) => {
    return getMemberName(item.memberId) !== null;
  });

  const medals = ['🥇', '🥈', '🥉'];

  return (
    <div className="space-y-6">
      {/* 타이틀 */}
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-800">🏆 스코어 랭킹</h2>
        <p className="text-gray-600 mt-1">누적 당첨 횟수 순위</p>
      </div>

      {/* 랭킹 리스트 */}
      {ranking.length === 0 ? (
        <div className="text-center py-10">
          <span className="text-4xl block mb-4">📊</span>
          <p className="text-gray-600">아직 추첨 기록이 없습니다</p>
        </div>
      ) : (
        <div className="space-y-3">
          {ranking.map((item, index) => (
            <div
              key={item.memberId}
              className={`
                flex items-center gap-4 p-4 rounded-xl
                ${index < 3 ? 'bg-gradient-to-r from-cyan-50 to-blue-50 border border-blue-200' : 'bg-white border border-gray-100'}
                shadow-sm
              `}
            >
              {/* 순위 */}
              <div className="w-10 text-center">
                {index < 3 ? (
                  <span className="text-2xl">{medals[index]}</span>
                ) : (
                  <span className="text-lg font-bold text-gray-400">{index + 1}</span>
                )}
              </div>

              {/* 이름 */}
              <div className="flex-1">
                <span className={`font-medium ${index < 3 ? 'text-gray-800' : 'text-gray-700'}`}>
                  {getMemberName(item.memberId) || ''}
                </span>
              </div>

              {/* 점수 */}
              <div className="flex items-center gap-1">
                <span className={`text-xl font-bold ${index < 3 ? 'text-blue-600' : 'text-gray-600'}`}>
                  {item.score}
                </span>
                <span className="text-sm text-gray-500">회</span>
              </div>
            </div>
          ))}
        </div>
      )}

    </div>
  );
}
