'use client';

import { useMemo, useState, useEffect } from 'react';
import { ref, onValue, push, remove, set } from 'firebase/database';
import { getDb } from '@/lib/firebase';
import { useHistory } from '@/hooks/useHistory';

interface RestaurantStats {
  name: string;
  count: number;
  lastVisit: string;
  isWinnerVisits: number;
}

interface Recommendation {
  id: string;
  author: string;
  restaurant: string;
  link: string;
  comment: string;
  createdAt: number;
}

export default function RestaurantsPage() {
  const { records, loading } = useHistory();
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [newRecommendation, setNewRecommendation] = useState({
    author: '',
    restaurant: '',
    link: '',
    comment: '',
  });
  const [submitting, setSubmitting] = useState(false);

  // 추천 식당 목록 불러오기
  useEffect(() => {
    const db = getDb();
    if (!db) return;

    const recommendationsRef = ref(db, 'recommendations');
    const unsubscribe = onValue(recommendationsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const list = Object.entries(data).map(([id, rec]) => {
          const r = rec as Record<string, unknown>;
          return {
            id,
            author: String(r.author || ''),
            restaurant: String(r.restaurant || ''),
            link: String(r.link || ''),
            comment: String(r.comment || ''),
            createdAt: Number(r.createdAt) || Date.now(),
          };
        });
        // 최신순 정렬
        list.sort((a, b) => b.createdAt - a.createdAt);
        setRecommendations(list);
      } else {
        setRecommendations([]);
      }
    });

    return () => unsubscribe();
  }, []);

  // 추천 식당 추가
  const handleAddRecommendation = async () => {
    if (!newRecommendation.author.trim() || !newRecommendation.restaurant.trim()) {
      alert('이름과 식당명을 입력해주세요');
      return;
    }

    setSubmitting(true);
    try {
      const db = getDb();
      if (!db) throw new Error('Firebase 연결 실패');

      const recommendationsRef = ref(db, 'recommendations');
      const newRef = push(recommendationsRef);
      await set(newRef, {
        author: newRecommendation.author.trim(),
        restaurant: newRecommendation.restaurant.trim(),
        link: newRecommendation.link.trim(),
        comment: newRecommendation.comment.trim(),
        createdAt: Date.now(),
      });

      setNewRecommendation({ author: '', restaurant: '', link: '', comment: '' });
    } catch (err) {
      console.error('추천 추가 오류:', err);
      alert('추천 등록에 실패했습니다');
    } finally {
      setSubmitting(false);
    }
  };

  // 추천 식당 삭제
  const handleDeleteRecommendation = async (id: string) => {
    if (!confirm('이 추천을 삭제하시겠습니까?')) return;

    try {
      const db = getDb();
      if (!db) return;

      await remove(ref(db, `recommendations/${id}`));
    } catch (err) {
      console.error('삭제 오류:', err);
    }
  };

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

    return Array.from(statsMap.values()).sort((a, b) => b.count - a.count);
  }, [records]);

  // 날짜 포맷
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const month = date.getMonth() + 1;
    const day = date.getDate();
    return `${month}/${day}`;
  };

  // 타임스탬프 포맷
  const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp);
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

      {/* 추천 식당 섹션 */}
      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
        <h3 className="font-bold text-gray-800 mb-4">💡 추천 식당</h3>
        <p className="text-sm text-gray-500 mb-4">가보고 싶은 식당을 추천해주세요!</p>

        {/* 추천 입력 */}
        <div className="space-y-3 mb-4 p-3 bg-gray-50 rounded-lg">
          <div className="flex gap-2">
            <input
              type="text"
              value={newRecommendation.author}
              onChange={(e) => setNewRecommendation({ ...newRecommendation, author: e.target.value })}
              placeholder="이름"
              className="w-20 p-2 border border-gray-200 rounded-lg text-sm focus:border-blue-500 focus:outline-none"
            />
            <input
              type="text"
              value={newRecommendation.restaurant}
              onChange={(e) => setNewRecommendation({ ...newRecommendation, restaurant: e.target.value })}
              placeholder="식당명"
              className="flex-1 p-2 border border-gray-200 rounded-lg text-sm focus:border-blue-500 focus:outline-none"
            />
            <input
              type="text"
              value={newRecommendation.link}
              onChange={(e) => setNewRecommendation({ ...newRecommendation, link: e.target.value })}
              placeholder="링크 (선택)"
              className="flex-1 p-2 border border-gray-200 rounded-lg text-sm focus:border-blue-500 focus:outline-none"
            />
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={newRecommendation.comment}
              onChange={(e) => setNewRecommendation({ ...newRecommendation, comment: e.target.value })}
              placeholder="추천 이유 (선택)"
              className="flex-1 p-2 border border-gray-200 rounded-lg text-sm focus:border-blue-500 focus:outline-none"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddRecommendation();
                }
              }}
            />
            <button
              onClick={handleAddRecommendation}
              disabled={submitting}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg text-sm font-medium hover:bg-blue-600 transition-colors disabled:bg-gray-300"
            >
              {submitting ? '...' : '등록'}
            </button>
          </div>
        </div>

        {/* 추천 목록 */}
        {recommendations.length > 0 ? (
          <div className="space-y-2">
            {recommendations.map((rec) => (
              <div
                key={rec.id}
                className="flex items-start gap-3 p-3 bg-gradient-to-r from-yellow-50 to-orange-50 rounded-lg border border-yellow-200"
              >
                <span className="text-xl">🍴</span>
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-gray-800">{rec.restaurant}</span>
                    {rec.link && (
                      <a
                        href={rec.link.startsWith('http') ? rec.link : `https://${rec.link}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-500 hover:text-blue-700 text-sm"
                      >
                        🔗
                      </a>
                    )}
                    <span className="text-xs text-gray-500">by {rec.author}</span>
                    <span className="text-xs text-gray-400">{formatTimestamp(rec.createdAt)}</span>
                  </div>
                  {rec.comment && (
                    <p className="text-sm text-gray-600 mt-1">{rec.comment}</p>
                  )}
                </div>
                <button
                  onClick={() => handleDeleteRecommendation(rec.id)}
                  className="text-xs text-gray-400 hover:text-red-500 transition-colors"
                >
                  삭제
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-center text-sm text-gray-400 py-4">
            아직 추천 식당이 없습니다. 첫 번째로 추천해보세요!
          </p>
        )}
      </div>
    </div>
  );
}
