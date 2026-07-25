import React from 'react';

type IconProps = {
    className?: string;
};

const baseStroke = {
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 2.4,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
};

export function SvgIconFrame({ children, className = '', tone = 'bg-white' }: { children: React.ReactNode; className?: string; tone?: string }) {
    return (
        <span className={`inline-flex items-center justify-center brutal-border brutal-radius-sm brutal-shadow-sm ${tone} ${className}`}>
            {children}
        </span>
    );
}

export function HomeIcon({ className = 'w-6 h-6' }: IconProps) {
    return (
        <svg className={className} viewBox="0 0 24 24" {...baseStroke}>
            <path d="m3 11 9-8 9 8" />
            <path d="M5 10v10h14V10" />
            <path d="M9 20v-6h6v6" />
        </svg>
    );
}

export function BookOpenIcon({ className = 'w-6 h-6' }: IconProps) {
    return (
        <svg className={className} viewBox="0 0 24 24" {...baseStroke}>
            <path d="M12 6.5A5.5 5.5 0 0 0 6.5 1H4v17h2.5A5.5 5.5 0 0 1 12 23V6.5Z" />
            <path d="M12 6.5A5.5 5.5 0 0 1 17.5 1H20v17h-2.5A5.5 5.5 0 0 0 12 23V6.5Z" />
            <path d="M7 6h2M15 6h2M7 10h2M15 10h2" />
        </svg>
    );
}

export function LibraryIcon({ className = 'w-6 h-6' }: IconProps) {
    return (
        <svg className={className} viewBox="0 0 24 24" {...baseStroke}>
            <path d="M4 4h4v16H4zM10 4h4v16h-4z" />
            <path d="m16 5 3.5-1 4 15-3.5 1-4-15Z" />
            <path d="M4 16h4M10 8h4M10 16h4" />
        </svg>
    );
}

export function MentorIcon({ className = 'w-6 h-6' }: IconProps) {
    return (
        <svg className={className} viewBox="0 0 24 24" {...baseStroke}>
            <circle cx="12" cy="7" r="4" />
            <path d="M4 22a8 8 0 0 1 16 0" />
            <path d="m16 4 3-2 3 2v5a4 4 0 0 1-3 3.8A4 4 0 0 1 16 9V4Z" />
        </svg>
    );
}

export function ForumIcon({ className = 'w-6 h-6' }: IconProps) {
    return (
        <svg className={className} viewBox="0 0 24 24" {...baseStroke}>
            <path d="M5 5h14a3 3 0 0 1 3 3v5a3 3 0 0 1-3 3h-5l-5 4v-4H5a3 3 0 0 1-3-3V8a3 3 0 0 1 3-3Z" />
            <path d="M7 9h10M7 12h6" />
        </svg>
    );
}

export function HelpIcon({ className = 'w-6 h-6' }: IconProps) {
    return (
        <svg className={className} viewBox="0 0 24 24" {...baseStroke}>
            <circle cx="12" cy="12" r="9" />
            <path d="M9.5 9a2.8 2.8 0 1 1 4.8 2c-1.1 1-2.3 1.5-2.3 3" />
            <path d="M12 18h.01" />
        </svg>
    );
}

export function UserIcon({ className = 'w-6 h-6' }: IconProps) {
    return (
        <svg className={className} viewBox="0 0 24 24" {...baseStroke}>
            <circle cx="12" cy="8" r="4" />
            <path d="M4 21a8 8 0 0 1 16 0" />
        </svg>
    );
}

export function ShieldIcon({ className = 'w-6 h-6' }: IconProps) {
    return (
        <svg className={className} viewBox="0 0 24 24" {...baseStroke}>
            <path d="M12 2 4 5v6c0 5 3.4 9.4 8 11 4.6-1.6 8-6 8-11V5l-8-3Z" />
            <path d="m9 12 2 2 4-5" />
        </svg>
    );
}

export function LogOutIcon({ className = 'w-6 h-6' }: IconProps) {
    return (
        <svg className={className} viewBox="0 0 24 24" {...baseStroke}>
            <path d="M10 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h4" />
            <path d="M15 8l4 4-4 4" />
            <path d="M19 12H9" />
        </svg>
    );
}

export function MenuIcon({ className = 'w-6 h-6' }: IconProps) {
    return (
        <svg className={className} viewBox="0 0 24 24" {...baseStroke}>
            <path d="M4 7h16M4 12h16M4 17h10" />
        </svg>
    );
}

export function CloseIcon({ className = 'w-6 h-6' }: IconProps) {
    return (
        <svg className={className} viewBox="0 0 24 24" {...baseStroke}>
            <path d="M6 6l12 12M18 6 6 18" />
        </svg>
    );
}

export function RobotIcon({ className = 'w-6 h-6' }: IconProps) {
    return (
        <svg className={className} viewBox="0 0 24 24" {...baseStroke}>
            <path d="M12 3v3" />
            <path d="M8 6h8a4 4 0 0 1 4 4v6a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4v-6a4 4 0 0 1 4-4Z" />
            <path d="M9 12h.01M15 12h.01M9 16h6" />
            <path d="M6 10H4M20 10h-2" />
        </svg>
    );
}

export function BookIcon({ className = 'w-6 h-6' }: IconProps) {
    return (
        <svg className={className} viewBox="0 0 24 24" {...baseStroke}>
            <path d="M5 5.5A3.5 3.5 0 0 1 8.5 2H20v17H8.5A3.5 3.5 0 0 0 5 22V5.5Z" />
            <path d="M5 5.5A3.5 3.5 0 0 0 1.5 2H4" />
            <path d="M8 7h8M8 11h7" />
        </svg>
    );
}

export function MathIcon({ className = 'w-6 h-6' }: IconProps) {
    return (
        <svg className={className} viewBox="0 0 24 24" {...baseStroke}>
            <path d="M4 6h7M7.5 3v6" />
            <path d="M15 5h5M15 9h5" />
            <path d="M4 17h7M15 14l5 6M20 14l-5 6" />
        </svg>
    );
}

export function ChemistryIcon({ className = 'w-6 h-6' }: IconProps) {
    return (
        <svg className={className} viewBox="0 0 24 24" {...baseStroke}>
            <path d="M10 2v6l-5.5 9.5A3 3 0 0 0 7.1 22h9.8a3 3 0 0 0 2.6-4.5L14 8V2" />
            <path d="M8 2h8M7 16h10M9 19h6" />
        </svg>
    );
}

export function LightningIcon({ className = 'w-6 h-6' }: IconProps) {
    return (
        <svg className={className} viewBox="0 0 24 24" fill="currentColor" stroke="black" strokeWidth="1.8">
            <path d="M13 2 4 14h7l-1 8 10-13h-7l0-7Z" />
        </svg>
    );
}

export function FlameIcon({ className = 'w-6 h-6' }: IconProps) {
    return (
        <svg className={className} viewBox="0 0 24 24" fill="currentColor" stroke="black" strokeWidth="1.8">
            <path d="M12 22c4.2 0 7-2.9 7-6.8 0-3.4-2-5.5-4.7-8.2-.2 2.1-1.2 3.6-2.8 4.7.3-3.4-1.2-6.5-4-8.7.2 4-2.5 6.2-2.5 10.7C5 18.6 8.1 22 12 22Z" />
        </svg>
    );
}

export function CalendarIcon({ className = 'w-6 h-6' }: IconProps) {
    return (
        <svg className={className} viewBox="0 0 24 24" {...baseStroke}>
            <path d="M7 2v4M17 2v4M4 9h16" />
            <path d="M5 5h14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z" />
            <path d="M8 13h3M14 13h2M8 17h3M14 17h2" />
        </svg>
    );
}

export function CardsIcon({ className = 'w-6 h-6' }: IconProps) {
    return (
        <svg className={className} viewBox="0 0 24 24" {...baseStroke}>
            <path d="M7 4h10a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z" />
            <path d="M9 8h6M9 12h6M9 16h4" />
            <path d="M3 8v10a4 4 0 0 0 4 4h8" />
        </svg>
    );
}

export function ChartIcon({ className = 'w-6 h-6' }: IconProps) {
    return (
        <svg className={className} viewBox="0 0 24 24" {...baseStroke}>
            <path d="M4 19V5" />
            <path d="M4 19h17" />
            <path d="m7 15 4-4 3 3 5-7" />
            <path d="M17 7h2v2" />
        </svg>
    );
}

export function BookmarkIcon({ className = 'w-6 h-6' }: IconProps) {
    return (
        <svg className={className} viewBox="0 0 24 24" fill="currentColor" stroke="black" strokeWidth="2">
            <path d="M6 3h12a1 1 0 0 1 1 1v18l-7-4-7 4V4a1 1 0 0 1 1-1Z" />
        </svg>
    );
}

export function ClockIcon({ className = 'w-6 h-6' }: IconProps) {
    return (
        <svg className={className} viewBox="0 0 24 24" {...baseStroke}>
            <circle cx="12" cy="12" r="9" />
            <path d="M12 7v5l4 2" />
        </svg>
    );
}

export function TargetIcon({ className = 'w-6 h-6' }: IconProps) {
    return (
        <svg className={className} viewBox="0 0 24 24" {...baseStroke}>
            <circle cx="12" cy="12" r="9" />
            <circle cx="12" cy="12" r="5" />
            <circle cx="12" cy="12" r="1.5" fill="currentColor" />
        </svg>
    );
}

export function TrophyIcon({ className = 'w-6 h-6' }: IconProps) {
    return (
        <svg className={className} viewBox="0 0 24 24" {...baseStroke}>
            <path d="M8 4h8v4a4 4 0 0 1-8 0V4Z" />
            <path d="M8 6H4a3 3 0 0 0 4 4M16 6h4a3 3 0 0 1-4 4" />
            <path d="M12 12v5M9 21h6M8 17h8" />
        </svg>
    );
}

export function CheckIcon({ className = 'w-6 h-6' }: IconProps) {
    return (
        <svg className={className} viewBox="0 0 24 24" {...baseStroke}>
            <path d="m5 13 4 4L19 7" />
        </svg>
    );
}

export function ChatIcon({ className = 'w-6 h-6' }: IconProps) {
    return (
        <svg className={className} viewBox="0 0 24 24" {...baseStroke}>
            <path d="M5 6h14a3 3 0 0 1 3 3v5a3 3 0 0 1-3 3h-7l-5 4v-4H5a3 3 0 0 1-3-3V9a3 3 0 0 1 3-3Z" />
            <path d="M8 11h8M8 14h5" />
        </svg>
    );
}

export function ScienceIcon({ className = 'w-6 h-6' }: IconProps) {
    return (
        <svg className={className} viewBox="0 0 24 24" {...baseStroke}>
            <circle cx="12" cy="12" r="2" fill="currentColor" />
            <path d="M4 12c2-4 5-6 8-6s6 2 8 6c-2 4-5 6-8 6s-6-2-8-6Z" />
            <path d="M12 3v3M12 18v3M3 12h3M18 12h3" />
        </svg>
    );
}

export function SparkIcon({ className = 'w-6 h-6' }: IconProps) {
    return (
        <svg className={className} viewBox="0 0 24 24" fill="currentColor" stroke="black" strokeWidth="1.8">
            <path d="M12 2 9.5 8.5 3 11l6.5 2.5L12 20l2.5-6.5L21 11l-6.5-2.5L12 2Z" />
        </svg>
    );
}

export function FileIcon({ className = 'w-6 h-6' }: IconProps) {
    return (
        <svg className={className} viewBox="0 0 24 24" {...baseStroke}>
            <path d="M7 3h7l5 5v13H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z" />
            <path d="M14 3v6h5M8 13h8M8 17h6" />
        </svg>
    );
}
