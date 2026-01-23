// 구성원 타입
export interface Member {
  id: string;
  name: string;
  profileImage: string | null;
  isActive: boolean;
  createdAt: number;
}

// 라운드 상태
export type RoundStatus = 'selecting' | 'ready' | 'drawing' | 'completed';

// 애니메이션 상태
export type AnimationPhase = 'mixing' | 'selecting' | 'revealing' | 'complete';

export interface AnimationState {
  phase: AnimationPhase;
  selectedNumbers: number[];
  currentBall: number | null;
  spinningIndex: number; // 현재 몇 번째 공을 뽑는 중인지 (0부터 시작)
  updatedAt: number;
}

// 라운드 타입
export interface Round {
  id: string;
  status: RoundStatus;
  participantIds: string[];
  absenteeIds: string[]; // 미참여 멤버 ID 목록
  numberSelections: Record<string, string>; // { "1": "memberId", "2": "memberId" }
  drawCount: number;
  nextWeekCount: number; // 다음 주 인원 수
  includeAbsentees: boolean; // 미참여 멤버 다음주 필수 배정 여부
  thisWeekGroup: string[];
  nextWeekGroup: string[];
  animationState?: AnimationState; // 추첨 애니메이션 동기화용
  preDrawSnapshot: {
    memberScores: Record<string, number>;
    pairCounts: Record<string, number>;
  } | null;
  resetHistory: {
    resetAt: number;
    resetBy?: string;
  }[];
  createdAt: number;
  updatedAt: number;
}

// 통계 타입
export interface Statistics {
  memberScores: Record<string, number>; // { memberId: 누적 당첨 횟수 }
  pairCounts: Record<string, number>; // { "memberId1_memberId2": 함께 식사 횟수 }
}

// 앱 설정 타입
export interface AppSettings {
  adminPassword: string; // 해시된 비밀번호
}

// 번호 선택 상태
export interface NumberSelection {
  number: number;
  memberId: string | null;
  memberName?: string;
}

// 한줄평 (댓글) 타입
export interface Review {
  id: string;
  author: string; // 작성자 이름
  content: string; // 한줄평 내용
  createdAt: number;
}

// 추첨 기록 타입
export interface HistoryRecord {
  id: string;
  date: string; // YYYY-MM-DD 형식
  memberNames: string[]; // 참여 멤버 이름들
  note: string; // 추가 메모
  isWinner: boolean; // 당첨 조 여부 (true: 파란색, false: 회색)
  restaurant: string; // 식당 이름
  reviews: Review[]; // 한줄평 목록
  createdAt: number;
  updatedAt: number;
}
