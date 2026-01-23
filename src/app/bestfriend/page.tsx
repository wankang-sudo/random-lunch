'use client';

import { useState, useMemo } from 'react';
import { useMembers } from '@/hooks/useMembers';
import { useStatistics } from '@/hooks/useStatistics';

export default function BestFriendPage() {
  const { members, loading: membersLoading } = useMembers();
  const { statistics, loading: statsLoading } = useStatistics();
  const [showMatrix, setShowMatrix] = useState(false);

  // 활성 멤버만 필터링
  const activeMembers = useMemo(() => members.filter((m) => m.isActive), [members]);

  // 멤버 ID로 이름 찾기
  const getMemberName = (memberId: string) => {
    const member = members.find((m) => m.id === memberId);
    return member?.name || null;
  };

  // 두 멤버의 페어 카운트 가져오기
  const getPairCount = (memberId1: string, memberId2: string): number | '-' => {
    if (memberId1 === memberId2) return '-';
    const pairKey = [memberId1, memberId2].sort().join('_');
    return statistics.pairCounts[pairKey] || 0;
  };

  // 활성 멤버들 기준으로 랭킹 계산 (매트릭스와 동일한 데이터 소스 사용)
  const ranking = useMemo(() => {
    const pairs: { memberId1: string; memberId2: string; name1: string; name2: string; count: number }[] = [];

    for (let i = 0; i < activeMembers.length; i++) {
      for (let j = i + 1; j < activeMembers.length; j++) {
        const member1 = activeMembers[i];
        const member2 = activeMembers[j];
        const count = getPairCount(member1.id, member2.id);

        if (typeof count === 'number' && count > 0) {
          pairs.push({
            memberId1: member1.id,
            memberId2: member2.id,
            name1: member1.name,
            name2: member2.name,
            count,
          });
        }
      }
    }

    return pairs.sort((a, b) => b.count - a.count);
  }, [activeMembers, statistics.pairCounts]);

  const medals = ['🥇', '🥈', '🥉'];

  if (membersLoading || statsLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 타이틀 */}
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-800">👯 찐친 랭킹</h2>
        <p className="text-gray-600 mt-1">가장 많이 함께 식사한 조합</p>
      </div>

      {/* 랭킹 리스트 */}
      {ranking.length === 0 ? (
        <div className="text-center py-10">
          <span className="text-4xl block mb-4">🤝</span>
          <p className="text-gray-600">아직 함께 식사한 기록이 없습니다</p>
        </div>
      ) : (
        <>
          <div className="space-y-3">
            {ranking.slice(0, 10).map((item, index) => (
              <div
                key={`${item.memberId1}_${item.memberId2}`}
                className={`
                  flex items-center gap-4 p-4 rounded-xl
                  ${index < 3 ? 'bg-gradient-to-r from-pink-50 to-purple-50 border border-purple-200' : 'bg-white border border-gray-100'}
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

                {/* 이름 조합 */}
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`font-medium ${index < 3 ? 'text-gray-800' : 'text-gray-700'}`}>
                      {item.name1}
                    </span>
                    <span className="text-purple-400">&</span>
                    <span className={`font-medium ${index < 3 ? 'text-gray-800' : 'text-gray-700'}`}>
                      {item.name2}
                    </span>
                  </div>
                </div>

                {/* 횟수 */}
                <div className="flex items-center gap-1">
                  <span className={`text-xl font-bold ${index < 3 ? 'text-purple-600' : 'text-gray-600'}`}>
                    {item.count}
                  </span>
                  <span className="text-sm text-gray-500">회</span>
                </div>
              </div>
            ))}
          </div>

          {/* 더보기 버튼 */}
          <div className="text-center">
            <button
              onClick={() => setShowMatrix(!showMatrix)}
              className="px-6 py-3 bg-purple-100 text-purple-700 rounded-xl font-medium hover:bg-purple-200 transition-colors"
            >
              {showMatrix ? '접기' : '📊 전체 조합 보기'}
            </button>
          </div>

          {/* 전체 조합 매트릭스 */}
          {showMatrix && activeMembers.length > 0 && (
            <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 overflow-x-auto">
              <h3 className="font-medium text-gray-700 mb-4 text-center">📋 전체 조합별 식사 횟수</h3>
              <div className="min-w-max">
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr>
                      <th className="p-2 border border-gray-200 bg-gray-50 sticky left-0 z-10"></th>
                      {activeMembers.map((member) => (
                        <th
                          key={member.id}
                          className="p-2 border border-gray-200 bg-purple-50 text-purple-700 font-medium min-w-16 whitespace-nowrap"
                        >
                          {member.name}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {activeMembers.map((rowMember) => (
                      <tr key={rowMember.id}>
                        <td className="p-2 border border-gray-200 bg-purple-50 text-purple-700 font-medium sticky left-0 z-10 whitespace-nowrap">
                          {rowMember.name}
                        </td>
                        {activeMembers.map((colMember) => {
                          const count = getPairCount(rowMember.id, colMember.id);
                          const isHighlight = typeof count === 'number' && count >= 3;
                          const isSelf = rowMember.id === colMember.id;
                          return (
                            <td
                              key={colMember.id}
                              className={`p-2 border border-gray-200 text-center font-medium ${
                                isSelf
                                  ? 'bg-gray-100 text-gray-400'
                                  : isHighlight
                                    ? 'bg-purple-100 text-purple-700'
                                    : count === 0
                                      ? 'text-gray-300'
                                      : 'text-gray-600'
                              }`}
                            >
                              {count}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-xs text-gray-500 mt-3 text-center">
                * 3회 이상 함께 식사한 조합은 보라색으로 표시됩니다
              </p>
            </div>
          )}
        </>
      )}

    </div>
  );
}
