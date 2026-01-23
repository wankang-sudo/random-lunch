'use client';

import { useState } from 'react';

interface AdminPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onVerify: (password: string) => boolean;
  onSuccess: () => void;
  title?: string;
  description?: string;
}

export default function AdminPasswordModal({
  isOpen,
  onClose,
  onVerify,
  onSuccess,
  title = '관리자 인증',
  description = '관리자 비밀번호 4자리를 입력하세요',
}: AdminPasswordModalProps) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password.length !== 4) {
      setError('비밀번호는 4자리입니다');
      return;
    }

    if (onVerify(password)) {
      setPassword('');
      onSuccess();
    } else {
      setError('비밀번호가 일치하지 않습니다');
      setPassword('');
    }
  };

  const handleClose = () => {
    setPassword('');
    setError('');
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-xl font-bold text-gray-800 mb-2">{title}</h2>
        <p className="text-gray-600 mb-4">{description}</p>

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <input
              type="password"
              maxLength={4}
              value={password}
              onChange={(e) => setPassword(e.target.value.replace(/\D/g, ''))}
              placeholder="••••"
              className="w-full text-center text-2xl tracking-widest py-3 px-4 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none"
              autoFocus
            />
            {error && (
              <p className="text-red-500 text-sm mt-2 text-center">{error}</p>
            )}
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={handleClose}
              className="flex-1 py-3 px-4 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-colors"
            >
              취소
            </button>
            <button
              type="submit"
              className="flex-1 py-3 px-4 bg-blue-500 text-white rounded-xl font-medium hover:bg-blue-600 transition-colors"
            >
              확인
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
