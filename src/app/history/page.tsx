'use client';

import { useState, useMemo } from 'react';
import { useHistory } from '@/hooks/useHistory';
import { useSettings } from '@/hooks/useSettings';
import AdminPasswordModal from '@/components/AdminPasswordModal';

// 금요일 날짜 생성 함수 (2025-12-26부터 현재까지)
function generateFridays(): string[] {
  const fridays: string[] = [];
  const startDate = new Date('2025-12-26');
  const today = new Date();

  let current = new Date(startDate);
  while (current <= today) {
    const year = current.getFullYear();
    const month = String(current.getMonth() + 1).padStart(2, '0');
    const day = String(current.getDate()).padStart(2, '0');
    fridays.push(`${year}-${month}-${day}`);
    current.setDate(current.getDate() + 7);
  }

  return fridays.reverse(); // 최신순
}

// 날짜 포맷 함수
function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const dayNames = ['일', '월', '화', '수', '목', '금', '토'];
  const dayName = dayNames[date.getDay()];
  return `${year}년 ${month}월 ${day}일 ${dayName}요일`;
}

export default function HistoryPage() {
  const { records, loading, addRecord, updateRecord, deleteRecord, getRecordByDate, addReview, deleteReview } = useHistory();
  const { verifyPassword } = useSettings();

  const [isAdmin, setIsAdmin] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [editingDate, setEditingDate] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    memberNames: '',
    note: '',
    isWinner: true,
    restaurant: '',
  });
  const [originalMemberNames, setOriginalMemberNames] = useState<string[]>([]);
  const [reviewInputs, setReviewInputs] = useState<Record<string, { author: string; content: string }>>({});

  const fridays = useMemo(() => generateFridays(), []);

  const handleAdminAuth = () => {
    setIsAdmin(true);
    setShowAuthModal(false);
  };

  const handleEdit = (date: string) => {
    const record = getRecordByDate(date);
    if (record) {
      const memberNamesArray = Array.isArray(record.memberNames) ? record.memberNames : [];
      setOriginalMemberNames(memberNamesArray);
      setEditForm({
        memberNames: memberNamesArray.join(', '),
        note: record.note || '',
        isWinner: record.isWinner,
        restaurant: record.restaurant || '',
      });
    } else {
      setOriginalMemberNames([]);
      setEditForm({
        memberNames: '',
        note: '',
        isWinner: true,
        restaurant: '',
      });
    }
    setEditingDate(date);
  };

  const handleSave = async () => {
    if (!editingDate) return;

    const parsedMemberNames = editForm.memberNames
      .split(',')
      .map((name) => name.trim())
      .filter((name) => name.length > 0);

    const record = getRecordByDate(editingDate);

    if (record) {
      // 멤버 이름 우선순위: 1) 폼에서 파싱된 값, 2) 편집 시작 시 저장된 원본, 3) 현재 레코드 값
      let finalMemberNames = parsedMemberNames;
      if (finalMemberNames.length === 0 && originalMemberNames.length > 0) {
        finalMemberNames = originalMemberNames;
      }
      if (finalMemberNames.length === 0 && Array.isArray(record.memberNames) && record.memberNames.length > 0) {
        finalMemberNames = record.memberNames;
      }

      await updateRecord(record.id, {
        memberNames: finalMemberNames,
        note: editForm.note || '',
        isWinner: Boolean(editForm.isWinner),
        restaurant: editForm.restaurant || '',
        reviews: record.reviews || [],
      });
    } else {
      await addRecord({
        date: editingDate,
        memberNames: parsedMemberNames,
        note: editForm.note || '',
        isWinner: Boolean(editForm.isWinner),
        restaurant: editForm.restaurant || '',
      });
    }

    setEditingDate(null);
    setOriginalMemberNames([]);
  };

  // 한줄평 추가
  const handleAddReview = async (recordId: string) => {
    const input = reviewInputs[recordId];
    if (!input?.author?.trim() || !input?.content?.trim()) {
      alert('이름과 한줄평을 입력해주세요');
      return;
    }

    await addReview(recordId, input.author.trim(), input.content.trim());
    setReviewInputs((prev) => ({
      ...prev,
      [recordId]: { author: '', content: '' },
    }));
  };

  // 한줄평 삭제
  const handleDeleteReview = async (recordId: string, reviewId: string) => {
    if (confirm('이 한줄평을 삭제하시겠습니까?')) {
      await deleteReview(recordId, reviewId);
    }
  };

  const handleDelete = async (date: string) => {
    const record = getRecordByDate(date);
    if (record && confirm('이 기록을 삭제하시겠습니까?')) {
      await deleteRecord(record.id);
    }
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
        <h2 className="text-2xl font-bold text-gray-800">📅 추첨 기록</h2>
        <p className="text-gray-600 mt-1">매주 금요일 점심 조 기록</p>
      </div>

      {/* 관리자 버튼 */}
      {!isAdmin && (
        <div className="text-center">
          <button
            onClick={() => setShowAuthModal(true)}
            className="text-sm text-gray-500 hover:text-blue-500 transition-colors"
          >
            관리자 모드
          </button>
        </div>
      )}

      {isAdmin && (
        <div className="text-center">
          <span className="inline-block px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm">
            관리자 모드 활성화
          </span>
        </div>
      )}

      {/* 타임라인 */}
      <div className="relative">
        {/* 세로 라인 */}
        <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200" />

        <div className="space-y-4">
          {fridays.map((date) => {
            const record = getRecordByDate(date);
            const isEditing = editingDate === date;

            return (
              <div key={date} className="relative pl-10">
                {/* 타임라인 점 */}
                <div
                  className={`absolute left-2 w-5 h-5 rounded-full border-4 border-white ${
                    record?.isWinner ? 'bg-blue-500' : record ? 'bg-gray-400' : 'bg-gray-300'
                  }`}
                />

                {/* 카드 */}
                <div
                  className={`rounded-xl p-4 ${
                    record?.isWinner
                      ? 'bg-gradient-to-r from-blue-50 to-cyan-50 border border-blue-200'
                      : record
                        ? 'bg-gray-50 border border-gray-200'
                        : 'bg-white border border-gray-100 border-dashed'
                  }`}
                >
                  {/* 날짜 */}
                  <div className="flex items-center justify-between mb-2">
                    <span className={`font-medium ${record?.isWinner ? 'text-blue-700' : 'text-gray-700'}`}>
                      {formatDate(date)}
                    </span>
                    {isAdmin && !isEditing && (
                      <button
                        onClick={() => handleEdit(date)}
                        className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded hover:bg-gray-200 transition-colors"
                      >
                        편집
                      </button>
                    )}
                  </div>

                  {isEditing ? (
                    /* 편집 모드 */
                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">멤버 (쉼표로 구분)</label>
                        <input
                          type="text"
                          value={editForm.memberNames}
                          onChange={(e) => setEditForm({ ...editForm, memberNames: e.target.value })}
                          placeholder="홍길동, 김철수, 이영희"
                          className="w-full p-2 border border-gray-200 rounded-lg text-sm focus:border-blue-500 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">식당</label>
                        <input
                          type="text"
                          value={editForm.restaurant}
                          onChange={(e) => setEditForm({ ...editForm, restaurant: e.target.value })}
                          placeholder="식당 이름 (선택)"
                          className="w-full p-2 border border-gray-200 rounded-lg text-sm focus:border-blue-500 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">메모</label>
                        <input
                          type="text"
                          value={editForm.note}
                          onChange={(e) => setEditForm({ ...editForm, note: e.target.value })}
                          placeholder="추가 메모 (선택)"
                          className="w-full p-2 border border-gray-200 rounded-lg text-sm focus:border-blue-500 focus:outline-none"
                        />
                      </div>
                      <div className="flex items-center gap-4">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            checked={editForm.isWinner}
                            onChange={() => setEditForm({ ...editForm, isWinner: true })}
                            className="text-blue-500"
                          />
                          <span className="text-sm text-blue-600">당첨 조</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            checked={!editForm.isWinner}
                            onChange={() => setEditForm({ ...editForm, isWinner: false })}
                            className="text-gray-500"
                          />
                          <span className="text-sm text-gray-600">일반 조</span>
                        </label>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setEditingDate(null)}
                          className="flex-1 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm hover:bg-gray-200 transition-colors"
                        >
                          취소
                        </button>
                        {record && (
                          <button
                            onClick={() => handleDelete(date)}
                            className="py-2 px-3 bg-red-100 text-red-600 rounded-lg text-sm hover:bg-red-200 transition-colors"
                          >
                            삭제
                          </button>
                        )}
                        <button
                          onClick={handleSave}
                          className="flex-1 py-2 bg-blue-500 text-white rounded-lg text-sm hover:bg-blue-600 transition-colors"
                        >
                          저장
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* 보기 모드 */
                    <>
                      {record ? (
                        <>
                          {/* 멤버 + 식당 (가로 배치) */}
                          <div className="flex flex-col sm:flex-row sm:items-start gap-3">
                            {/* 멤버 목록 */}
                            <div className="flex-1 flex flex-wrap gap-2 content-start">
                              {Array.isArray(record.memberNames) && record.memberNames.length > 0 ? (
                                record.memberNames.map((name, idx) => (
                                  <span
                                    key={idx}
                                    className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
                                      record.isWinner
                                        ? 'bg-blue-100 text-blue-700'
                                        : 'bg-gray-200 text-gray-700'
                                    }`}
                                  >
                                    {String(name)}
                                  </span>
                                ))
                              ) : (
                                <span className="text-xs text-gray-400">멤버 정보 없음</span>
                              )}
                            </div>
                            {/* 식당 (오른쪽) */}
                            {record.restaurant && (
                              <div className="sm:w-32 flex-shrink-0 bg-white/70 rounded-lg px-3 py-2 border border-gray-200">
                                <p className="text-xs text-gray-500">식당</p>
                                <p className="text-sm font-medium text-gray-700">🍽️ {record.restaurant}</p>
                              </div>
                            )}
                          </div>

                          {record.note && (
                            <p className="text-xs text-gray-400 mt-2">📝 {record.note}</p>
                          )}

                          {/* 한줄평 섹션 */}
                          <div className="mt-3 pt-3 border-t border-gray-200/50">
                            <p className="text-xs font-medium text-gray-500 mb-2">💬 한줄평</p>

                            {/* 기존 한줄평 목록 */}
                            {(record.reviews || []).length > 0 ? (
                              <div className="space-y-2 mb-3">
                                {(record.reviews || []).map((review) => (
                                  <div
                                    key={review.id}
                                    className="flex items-start gap-2 p-2 bg-white/50 rounded-lg"
                                  >
                                    <div className="flex-1">
                                      <span className="text-xs font-medium text-gray-700">{review.author}</span>
                                      <p className="text-sm text-gray-600">{review.content}</p>
                                    </div>
                                    {isAdmin && (
                                      <button
                                        onClick={() => handleDeleteReview(record.id, review.id)}
                                        className="text-xs text-red-400 hover:text-red-600"
                                      >
                                        삭제
                                      </button>
                                    )}
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className="text-xs text-gray-400 mb-3">아직 한줄평이 없습니다</p>
                            )}

                            {/* 한줄평 입력 */}
                            <div className="flex gap-2">
                              <input
                                type="text"
                                value={reviewInputs[record.id]?.author || ''}
                                onChange={(e) =>
                                  setReviewInputs((prev) => ({
                                    ...prev,
                                    [record.id]: { ...prev[record.id], author: e.target.value },
                                  }))
                                }
                                placeholder="이름"
                                className="w-16 p-1.5 border border-gray-200 rounded text-xs focus:border-blue-500 focus:outline-none"
                              />
                              <input
                                type="text"
                                value={reviewInputs[record.id]?.content || ''}
                                onChange={(e) =>
                                  setReviewInputs((prev) => ({
                                    ...prev,
                                    [record.id]: { ...prev[record.id], content: e.target.value },
                                  }))
                                }
                                placeholder="한줄평을 남겨주세요"
                                className="flex-1 p-1.5 border border-gray-200 rounded text-xs focus:border-blue-500 focus:outline-none"
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    e.preventDefault();
                                    handleAddReview(record.id);
                                  }
                                }}
                              />
                              <button
                                onClick={() => handleAddReview(record.id)}
                                className="px-3 py-1.5 bg-blue-500 text-white rounded text-xs hover:bg-blue-600 transition-colors"
                              >
                                등록
                              </button>
                            </div>
                          </div>
                        </>
                      ) : (
                        <p className="text-sm text-gray-400">기록 없음</p>
                      )}
                    </>
                  )}
                </div>
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
        description="기록을 편집하려면 관리자 비밀번호를 입력하세요"
      />
    </div>
  );
}
