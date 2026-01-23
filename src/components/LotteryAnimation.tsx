'use client';

import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Member, Round } from '@/types';

interface LotteryAnimationProps {
  round: Round;
  members: Member[];
  onComplete: (selectedNumbers: number[]) => void;
}

export default function LotteryAnimation({
  round,
  members,
  onComplete,
}: LotteryAnimationProps) {
  const [phase, setPhase] = useState<'mixing' | 'selecting' | 'revealing' | 'complete'>('mixing');
  const [selectedNumbers, setSelectedNumbers] = useState<number[]>([]);
  const [currentBall, setCurrentBall] = useState<number | null>(null);
  const [isSpinning, setIsSpinning] = useState(false);

  const selections = round.numberSelections || {};
  const allNumbers = useMemo(() => Object.keys(selections).map(Number), [selections]);
  const remainingNumbers = useMemo(
    () => allNumbers.filter((n) => !selectedNumbers.includes(n)),
    [allNumbers, selectedNumbers]
  );

  const getMemberName = (memberId: string) => {
    const member = members.find((m) => m.id === memberId);
    return member?.name || '알 수 없음';
  };

  // Phase 1: Mixing
  useEffect(() => {
    const timer = setTimeout(() => {
      setPhase('selecting');
    }, 2000);
    return () => clearTimeout(timer);
  }, []);

  // Phase 2: Selecting
  useEffect(() => {
    if (phase !== 'selecting') return;
    if (selectedNumbers.length >= round.drawCount) {
      setPhase('revealing');
      setTimeout(() => {
        setPhase('complete');
        onComplete(selectedNumbers);
      }, 1500);
      return;
    }

    const startSelection = () => {
      setIsSpinning(true);
      let count = 0;
      const maxCount = 15;

      const spin = () => {
        if (count >= maxCount) {
          // Final selection
          const finalIndex = Math.floor(Math.random() * remainingNumbers.length);
          const selected = remainingNumbers[finalIndex];
          setCurrentBall(selected);
          setIsSpinning(false);

          setTimeout(() => {
            setSelectedNumbers((prev) => [...prev, selected]);
            setCurrentBall(null);
          }, 1000);
          return;
        }

        const randomIndex = Math.floor(Math.random() * remainingNumbers.length);
        setCurrentBall(remainingNumbers[randomIndex]);
        count++;

        // Gradually slow down
        const delay = 50 + count * 15;
        setTimeout(spin, delay);
      };

      spin();
    };

    const timer = setTimeout(startSelection, 500);
    return () => clearTimeout(timer);
  }, [phase, selectedNumbers, round.drawCount, remainingNumbers, onComplete]);

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-blue-500 via-cyan-500 to-sky-400 flex flex-col items-center justify-center z-50 overflow-hidden">
      {/* 배경 빛 효과 */}
      <div className="absolute inset-0 overflow-hidden">
        <motion.div
          className="absolute top-1/2 left-1/2 w-96 h-96 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/20 blur-3xl"
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.3, 0.5, 0.3],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      </div>

      {/* 타이틀 */}
      <motion.h2
        initial={{ opacity: 0, y: -30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-3xl font-bold text-white mb-8 drop-shadow-lg z-10"
      >
        {phase === 'mixing' && '🎰 추첨 준비 중...'}
        {phase === 'selecting' && `🎯 ${selectedNumbers.length + 1}번째 추첨!`}
        {phase === 'revealing' && '✨ 결과 확인 중...'}
        {phase === 'complete' && '🎊 추첨 완료!'}
      </motion.h2>

      {/* 추첨 통 */}
      <motion.div
        className="relative w-72 h-72 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center mb-8 border-4 border-white/30 shadow-2xl z-10"
        animate={phase === 'mixing' ? {
          rotate: [0, 5, -5, 3, -3, 0],
        } : {}}
        transition={{
          duration: 0.4,
          repeat: phase === 'mixing' ? Infinity : 0,
          ease: 'easeInOut',
        }}
      >
        {/* 믹싱 단계 - 공들이 튀어다님 */}
        {phase === 'mixing' && (
          <div className="flex flex-wrap gap-2 p-6 justify-center">
            {allNumbers.map((num, index) => (
              <motion.div
                key={num}
                className="w-11 h-11 rounded-full bg-white flex items-center justify-center font-bold text-blue-600 shadow-md text-sm"
                animate={{
                  y: [0, -15, 0],
                  x: [0, (index % 2 === 0 ? 5 : -5), 0],
                }}
                transition={{
                  duration: 0.3,
                  repeat: Infinity,
                  delay: index * 0.08,
                  ease: 'easeInOut',
                }}
              >
                {num}
              </motion.div>
            ))}
          </div>
        )}

        {/* 선택 단계 - 현재 번호 표시 */}
        {(phase === 'selecting' || phase === 'revealing') && (
          <AnimatePresence mode="wait">
            {currentBall !== null ? (
              <motion.div
                key={`ball-${currentBall}`}
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{
                  scale: isSpinning ? 1 : 1.3,
                  opacity: 1,
                }}
                exit={{ scale: 0.5, opacity: 0, y: -50 }}
                transition={{
                  duration: isSpinning ? 0.05 : 0.3,
                  ease: 'easeOut',
                }}
                className={`w-28 h-28 rounded-full flex items-center justify-center text-5xl font-bold shadow-xl ${
                  isSpinning
                    ? 'bg-white text-blue-500'
                    : 'bg-gradient-to-br from-cyan-400 to-blue-500 text-white'
                }`}
                style={!isSpinning ? {
                  boxShadow: '0 0 30px rgba(0, 180, 255, 0.8)',
                } : {}}
              >
                {currentBall}
              </motion.div>
            ) : (
              <motion.div
                key="waiting"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-white/60 text-lg"
              >
                다음 추첨 준비 중...
              </motion.div>
            )}
          </AnimatePresence>
        )}

        {/* 완료 단계 */}
        {phase === 'complete' && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{
              type: 'spring',
              stiffness: 200,
              damping: 15,
            }}
            className="text-7xl"
          >
            🎉
          </motion.div>
        )}
      </motion.div>

      {/* 선택된 번호들 */}
      <motion.div
        className="bg-white/20 backdrop-blur-sm rounded-2xl p-5 min-w-80 max-w-md border border-white/30 z-10"
        initial={{ y: 30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2 }}
      >
        <p className="text-white text-sm mb-4 text-center font-medium">
          🍱 이번 주 점심 조 ({selectedNumbers.length}/{round.drawCount})
        </p>
        <div className="flex flex-wrap gap-3 justify-center min-h-16">
          {selectedNumbers.map((num, index) => (
            <motion.div
              key={`selected-${num}`}
              initial={{ scale: 0, y: -20 }}
              animate={{ scale: 1, y: 0 }}
              transition={{
                type: 'spring',
                stiffness: 300,
                damping: 20,
                delay: 0.05,
              }}
              className="flex flex-col items-center"
            >
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center text-lg font-bold text-white shadow-lg">
                {num}
              </div>
              <span className="text-white text-xs mt-1 font-medium">
                {getMemberName(selections[num])}
              </span>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* 진행 표시 */}
      {phase === 'selecting' && (
        <motion.div
          className="mt-6 flex gap-2 z-10"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          {Array.from({ length: round.drawCount }, (_, i) => (
            <motion.div
              key={i}
              className={`w-3 h-3 rounded-full ${
                i < selectedNumbers.length
                  ? 'bg-cyan-300'
                  : i === selectedNumbers.length
                    ? 'bg-white'
                    : 'bg-white/40'
              }`}
              animate={i === selectedNumbers.length ? {
                scale: [1, 1.3, 1],
              } : {}}
              transition={{
                duration: 0.6,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
            />
          ))}
        </motion.div>
      )}
    </div>
  );
}
