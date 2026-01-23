'use client';

import { useMemo } from 'react';
import { useHistory } from '@/hooks/useHistory';

interface RestaurantStats {
  name: string;
  count: number;
  lastVisit: string;
  isWinnerVisits: number;
}

export default function RestaurantsPage() {
  const { records, loading } = useHistory();

  // 식당별 통계 계산
  const restaurantStats = useMemo(() => {
    const statsMap = new Map<string, RestaurantStats>();

    records.forEach((record) => {
      if (record.restaurant && record.restaurant.trim()) {
        const name = record.restaurant.trim();
        const existing = statsMap.get(name);

        if (existing) {
          existing.count += 1;
          if (record.isWinner) {
            existing.isWinnerVisits += 1;
          }
          // 최근 방문일 업데이트
          if (record.date > existing.lastVisit) {
            existing.lastVisit = record.date;
          }
        } else {
          statsMap.set(name, {
            name,
            count: 1,
            lastVisit: record.date,
            isWinnerVisits: record.isWinner ? 1 : 0,
          });
        }
      }
    });

    // 방문 횟수 기준 내림차순 정렬
    return Array.from(statsMap.values()).sort((a, b) => b.count - a.count);
  }, [records]);

  // 날짜 포맷
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const month = date.getMonth() + 1;
    const day = date.getDate();
    return `${month}/${day}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 타이틀 */}
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-800">🍽️ 식당 모음</h2>
        <p className="text-gray-600 mt-1">방문한 식당 목록</p>
      </div>

      {/* 통계 요약 */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-gradient-to-br from-orange-50 to-amber-50 rounded-xl p-4 border border-orange-200">
          <p className="text-sm text-orange-600 font-medium">총 식당 수</p>
          <p className="text-3xl font-bold text-orange-700">{restaurantStats.length}</p>
        </div>
        <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl p-4 border border-blue-200">
          <p className="text-sm text-blue-600 font-medium">총 방문 횟수</p>
          <p className="text-3xl font-bold text-blue-700">
            {restaurantStats.reduce((sum, r) => sum + r.count, 0)}
          </p>
        </div>
      </div>

      {/* 식당 리스트 */}
      {restaurantStats.length > 0 ? (
        <div className="space-y-3">
          {restaurantStats.map((restaurant, index) => (
            <div
              key={restaurant.name}
              className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 flex items-center gap-4"
            >
              {/* 순위 */}
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg ${
                  index === 0
                    ? 'bg-yellow-100 text-yellow-700'
                    : index === 1
                      ? 'bg-gray-200 text-gray-600'
                      : index === 2
                        ? 'bg-orange-100 text-orange-700'
                        : 'bg-gray-100 text-gray-500'
                }`}
              >
                {index + 1}
              </div>

              {/* 식당 정보 */}
              <div className="flex-1">
                <h3 className="font-bold text-gray-800">{restaurant.name}</h3>
                <p className="text-xs text-gray-500">
                  마지막 방문: {formatDate(restaurant.lastVisit)}
                </p>
              </div>

              {/* 방문 횟수 */}
              <div className="text-right">
                <p className="text-2xl font-bold text-blue-600">{restaurant.count}</p>
                <p className="text-xs text-gray-500">회 방문</p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-10">
          <span className="text-6xl block mb-4">🍽️</span>
          <p className="text-gray-500">아직 등록된 식당이 없습니다</p>
          <p className="text-sm text-gray-400 mt-1">기록 탭에서 식당을 추가해보세요</p>
        </div>
      )}
    </div>
  );
}
