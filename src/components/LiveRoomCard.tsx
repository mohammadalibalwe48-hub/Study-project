'use client';

import React from 'react';
import Link from 'next/link';
import { Users, Radio, GraduationCap, Video, Mic, ArrowLeft, Tag } from 'lucide-react';
import { LiveRoom } from '@/data/liveRoomsData';

export default function LiveRoomCard({ room }: { room: LiveRoom }) {
  return (
    <article className="rounded-2xl border-2 border-[#282825] bg-white p-6 text-right shadow-[4px_4px_0_#282825] hover:shadow-[6px_6px_0_#282825] transition-all space-y-4 flex flex-col justify-between">
      <div className="space-y-3">
        
        {/* Header Badges */}
        <div className="flex items-center justify-between gap-2">
          <span className="flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-black border-2 border-[#282825] bg-[#ff5636] text-white shadow-[1.5px_1.5px_0_#282825]">
            <Radio className="w-3.5 h-3.5 animate-pulse" />
            <span>بث مباشر</span>
          </span>

          <span className="flex items-center gap-1.5 text-xs font-bold text-[#5f5f59] bg-[#fafaf7] px-3 py-1 rounded-xl border border-[#282825]/20">
            <Users className="w-3.5 h-3.5 text-[#ff5636]" />
            <span>{room.activeCount} / {room.maxCount} طالب</span>
          </span>
        </div>

        {/* Room Title & Subject */}
        <div>
          <span className="inline-block text-[11px] font-black px-2.5 py-0.5 rounded-lg bg-[#ffd64d] text-[#282825] border border-[#282825] mb-2">
            مادة {room.subject}
          </span>
          <h3 className="text-lg font-black text-[#282825] leading-snug">
            {room.title}
          </h3>
        </div>

        {/* Description */}
        <p className="text-xs font-semibold text-[#5f5f59] leading-relaxed line-clamp-2">
          {room.description}
        </p>

        {/* Host Info */}
        <div className="flex items-center gap-2 pt-2 border-t border-[#282825]/10 text-xs font-bold">
          <span className="flex h-7 w-7 items-center justify-center rounded-full border border-[#282825] bg-[#dcbcff] text-[10px] font-black">
            {room.hostName.charAt(0)}
          </span>
          <span className="text-[#282825]">{room.hostName}</span>
          {room.isTutorSession && (
            <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-[#cce6b4] text-[#15803d] border border-[#282825] flex items-center gap-1">
              <GraduationCap className="w-3 h-3" /> مدرس معتمد
            </span>
          )}
        </div>
      </div>

      {/* Join Action Button */}
      <Link
        href={`/live-rooms/${room.id}`}
        className="app-button border-2 border-[#282825] bg-[#ff5636] text-white w-full py-3 text-xs font-black shadow-[2px_2px_0_#282825] hover:shadow-[4px_4px_0_#282825] hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2 cursor-pointer mt-4"
      >
        <div className="flex items-center gap-1">
          <Mic className="w-4 h-4" />
          <Video className="w-4 h-4" />
        </div>
        <span>انضم للغرفة الصوتية والمرئية</span>
        <ArrowLeft className="w-4 h-4" />
      </Link>
    </article>
  );
}
