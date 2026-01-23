'use client';

import { useState, useEffect } from 'react';
import { ref, onValue, set, push, update, remove, DatabaseReference } from 'firebase/database';
import { getDb } from '@/lib/firebase';
import { Member } from '@/types';

export function useMembers() {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const db = getDb();
    if (!db) {
      setLoading(false);
      return;
    }

    const membersRef = ref(db, 'members');

    const unsubscribe = onValue(
      membersRef,
      (snapshot) => {
        const data = snapshot.val();
        if (data) {
          const membersList = Object.entries(data).map(([id, member]) => ({
            id,
            ...(member as Omit<Member, 'id'>),
          }));
          setMembers(membersList);
        } else {
          setMembers([]);
        }
        setLoading(false);
      },
      (err) => {
        setError(err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const addMember = async (name: string, profileImage: string | null = null) => {
    const db = getDb();
    if (!db) return null;

    const membersRef = ref(db, 'members');
    const newMemberRef = push(membersRef);
    const newMember: Omit<Member, 'id'> = {
      name,
      profileImage,
      isActive: true,
      createdAt: Date.now(),
    };
    await set(newMemberRef, newMember);
    return newMemberRef.key;
  };

  const updateMember = async (id: string, updates: Partial<Member>) => {
    const db = getDb();
    if (!db) return;

    const memberRef = ref(db, `members/${id}`);
    await update(memberRef, updates);
  };

  const deleteMember = async (id: string) => {
    const db = getDb();
    if (!db) return;

    const memberRef = ref(db, `members/${id}`);
    await remove(memberRef);
  };

  const getActiveMemberCount = () => members.filter((m) => m.isActive).length;

  return {
    members,
    loading,
    error,
    addMember,
    updateMember,
    deleteMember,
    getActiveMemberCount,
  };
}
