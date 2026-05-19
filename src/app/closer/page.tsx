'use client';

import { useState, useMemo } from 'react';
import { useMembers } from '@/hooks/useMembers';
import { useHistory } from '@/hooks/useHistory';

export default function CloserPage() {
  const { members, loading: membersLoading } = useMembers();
  const { records, loading: historyLoading } = useHistory();
  const [showMatrix, setShowMatrix] = useState(false);

  // 활성 멤버만 필터링
  const activeMembers = useMemo(() => members.filter((m) => m.isActive), [members]);

  // 기록 기반 페어 카운트 계산
  const pairCounts = useMemo(() => {
    const counts = new Map<string, number>();

    records.forEach((record) => {
      if (Array.isArray(record.memberNames) && record.memberNames.length >= 2) {
        const names = [...new Set(record.memberNames.filter((n) => n && typeof n === 'string'))];

        for (let i = 0; i < names.length; i++) {
          for (let j = i + 1; j < names.length; j++) {
            const pairKey = [names[i], names[j]].sort().join('_');
            const currentCount = counts.get(pairKey) || 0;
            counts.set(pairKey, currentCount + 1);
          }
        }
      }
    });

    return counts;
  }, [records]);

  // 두 멤버의 페어 카운트 가져오기 (이름 기반)
  const getPairCount = (name1: string, name2: string): number | '-' => {
    if (name1 === name2) return '-';
    const pairKey = [name1, name2].sort().join('_');
    return pairCounts.get(pairKey) || 0;
  };

  // 활성 멤버 간의 모든 가능한 2인 조합을 만들어서 0회 포함 랭킹 계산
  const ranking = useMemo(() => {
    const pairs: { name1: string; name2: string; count: number }[] = [];
    const activeNames = activeMembers.map((m) => m.name).sort();

    for (let i = 0; i < activeNames.length; i++) {
      for (let j = i + 1; j < activeNames.length; j++) {
        const name1 = activeNames[i];
        const name2 = activeNames[j];
        const pairKey = [name1, name2].sort().join('_');
        const count = pairCounts.get(pairKey) || 0;
        pairs.push({ name1, name2, count });
      }
    }

    // 적은 순서로 정렬 (동률은 이름 알파벳순)
    return pairs.sort((a, b) => {
      if (a.count !== b.count) return a.count - b.count;
      if (a.name1 !== b.name1) return a.name1.localeCompare(b.name1);
      return a.name2.localeCompare(b.name2);
    });
  }, [pairCounts, activeMembers]);

  // 매트릭스용 활성 멤버 이름들
  const activeMemberNames = useMemo(
    () => activeMembers.map((m) => m.name).sort(),
    [activeMembers]
  );

  const medals = ['🥇', '🥈', '🥉'];

  if (membersLoading || historyLoading) {
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
        <h2 className="text-2xl font-bold text-gray-800">🌱 친해지길바라</h2>
        <p className="text-gray-600 mt-1">가장 적게 함께 식사한 조합 TOP 10</p>
      </div>

      {/* 랭킹 리스트 */}
      {ranking.length === 0 ? (
        <div className="text-center py-10">
          <span className="text-4xl block mb-4">🤔</span>
          <p className="text-gray-600">활성 멤버가 2명 이상이어야 합니다</p>
        </div>
      ) : (
        <>
          <div className="space-y-3">
            {ranking.slice(0, 10).map((item, index) => (
              <div
                key={`${item.name1}_${item.name2}`}
                className={`
                  flex items-center gap-4 p-4 rounded-xl
                  ${index < 3 ? 'bg-gradient-to-r from-emerald-50 to-teal-50 border border-teal-200' : 'bg-white border border-gray-100'}
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
                    <span className="text-teal-400">&</span>
                    <span className={`font-medium ${index < 3 ? 'text-gray-800' : 'text-gray-700'}`}>
                      {item.name2}
                    </span>
                  </div>
                </div>

                {/* 횟수 */}
                <div className="flex items-center gap-1">
                  <span className={`text-xl font-bold ${index < 3 ? 'text-teal-600' : 'text-gray-600'}`}>
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
              className="px-6 py-3 bg-teal-100 text-teal-700 rounded-xl font-medium hover:bg-teal-200 transition-colors"
            >
              {showMatrix ? '접기' : '📊 전체 조합 보기'}
            </button>
          </div>

          {/* 전체 조합 매트릭스 */}
          {showMatrix && activeMemberNames.length > 0 && (
            <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 overflow-x-auto">
              <h3 className="font-medium text-gray-700 mb-4 text-center">📋 활성 멤버 전체 조합별 식사 횟수</h3>
              <div className="min-w-max">
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr>
                      <th className="p-2 border border-gray-200 bg-gray-50 sticky left-0 z-10"></th>
                      {activeMemberNames.map((name) => (
                        <th
                          key={name}
                          className="p-2 border border-gray-200 bg-teal-50 text-teal-700 font-medium min-w-16 whitespace-nowrap"
                        >
                          {name}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {activeMemberNames.map((rowName) => (
                      <tr key={rowName}>
                        <td className="p-2 border border-gray-200 bg-teal-50 text-teal-700 font-medium sticky left-0 z-10 whitespace-nowrap">
                          {rowName}
                        </td>
                        {activeMemberNames.map((colName) => {
                          const count = getPairCount(rowName, colName);
                          const isLowlight = typeof count === 'number' && count === 0;
                          const isSelf = rowName === colName;
                          return (
                            <td
                              key={colName}
                              className={`p-2 border border-gray-200 text-center font-medium ${
                                isSelf
                                  ? 'bg-gray-100 text-gray-400'
                                  : isLowlight
                                    ? 'bg-teal-100 text-teal-700'
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
                * 0회 함께한 조합은 청록색으로 표시됩니다
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
