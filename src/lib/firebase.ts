import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getDatabase, Database } from 'firebase/database';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

let app: FirebaseApp | null = null;
let database: Database | null = null;

// Firebase 초기화 함수 (클라이언트 사이드에서만 실행)
function initFirebase() {
  if (typeof window === 'undefined') {
    return { app: null, database: null };
  }

  if (!firebaseConfig.databaseURL || !firebaseConfig.projectId) {
    console.warn('Firebase 환경변수가 설정되지 않았습니다. .env.local 파일을 확인하세요.');
    return { app: null, database: null };
  }

  if (!app) {
    app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
    database = getDatabase(app);
  }

  return { app, database };
}

// 데이터베이스 인스턴스 가져오기
export function getDb(): Database | null {
  const { database: db } = initFirebase();
  return db;
}

// 초기화 상태 확인
export function isFirebaseInitialized(): boolean {
  return !!getDb();
}

export { app, database };
export default initFirebase;
