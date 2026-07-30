'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

const REVEAL_SELECTOR = [
    '[data-reveal]',
    '.app-card',
    '.liquid-glass',
    '.liquid-glass-glow',
    '.motion-surface > section',
    '.motion-surface > article',
].join(',');

export default function MotionSystem() {
    const pathname = usePathname();

    useEffect(() => {
        const root = document.documentElement;
        const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
        let animationFrame = 0;

        const updatePointer = (event: PointerEvent) => {
            if (reduceMotion.matches || event.pointerType === 'touch') return;
            cancelAnimationFrame(animationFrame);
            animationFrame = requestAnimationFrame(() => {
                root.style.setProperty('--pointer-x', `${event.clientX}px`);
                root.style.setProperty('--pointer-y', `${event.clientY}px`);
            });
        };

        const updateProgress = () => {
            const scrollable = document.documentElement.scrollHeight - window.innerHeight;
            const progress = scrollable > 0 ? window.scrollY / scrollable : 0;
            root.style.setProperty('--scroll-progress', `${Math.min(1, Math.max(0, progress))}`);
        };

        window.addEventListener('pointermove', updatePointer, { passive: true });
        window.addEventListener('scroll', updateProgress, { passive: true });
        updateProgress();

        return () => {
            cancelAnimationFrame(animationFrame);
            window.removeEventListener('pointermove', updatePointer);
            window.removeEventListener('scroll', updateProgress);
        };
    }, []);

    useEffect(() => {
        const root = document.documentElement;
        const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

        root.dataset.motion = reduceMotion.matches ? 'reduced' : 'ready';
        root.classList.remove('route-enter');
        void root.offsetWidth;
        root.classList.add('route-enter');

        if (reduceMotion.matches) {
            document.querySelectorAll<HTMLElement>(REVEAL_SELECTOR).forEach((element) => {
                element.dataset.revealed = 'true';
            });
            return;
        }

        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (!entry.isIntersecting) return;
                    (entry.target as HTMLElement).dataset.revealed = 'true';
                    observer.unobserve(entry.target);
                });
            },
            { rootMargin: '0px 0px -7% 0px', threshold: 0.08 },
        );

        const observeElements = (scope: ParentNode = document) => {
            scope.querySelectorAll<HTMLElement>(REVEAL_SELECTOR).forEach((element, index) => {
                if (element.dataset.motionBound === 'true') return;
                element.dataset.motionBound = 'true';
                element.style.setProperty('--reveal-order', `${index % 6}`);
                observer.observe(element);
            });
        };

        observeElements();

        const mutationObserver = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                mutation.addedNodes.forEach((node) => {
                    if (node instanceof HTMLElement) {
                        if (node.matches(REVEAL_SELECTOR)) observeElements(node.parentElement ?? document);
                        else observeElements(node);
                    }
                });
            });
        });

        mutationObserver.observe(document.body, { childList: true, subtree: true });

        return () => {
            observer.disconnect();
            mutationObserver.disconnect();
        };
    }, [pathname]);

    return (
        <div className="motion-chrome" aria-hidden="true">
            <span className="motion-progress" />
            <span className="motion-pointer" />
        </div>
    );
}
