import { useEffect } from 'react';

const VIEWPORT_HEIGHT = '--app-viewport-height';
const VIEWPORT_TOP = '--app-viewport-top';

function hasEditableFocus(): boolean {
  const element = document.activeElement;
  if (!(element instanceof HTMLElement)) return false;
  if (element.isContentEditable) return true;
  if (element instanceof HTMLTextAreaElement) return !element.disabled && !element.readOnly;
  if (!(element instanceof HTMLInputElement) || element.disabled || element.readOnly) return false;
  return !['button', 'checkbox', 'color', 'file', 'hidden', 'image', 'radio', 'range', 'reset', 'submit'].includes(element.type);
}

/** Track available screen space without disabling pinch zoom or starting data listeners. */
export function useMobileViewport(): void {
  useEffect(() => {
    const root = document.documentElement;
    const viewport = window.visualViewport;
    const mobile = window.matchMedia('(max-width: 640px), (pointer: coarse)');
    const previousHeight = root.style.getPropertyValue(VIEWPORT_HEIGHT);
    const previousTop = root.style.getPropertyValue(VIEWPORT_TOP);
    const previousKeyboard = root.getAttribute('data-keyboard-open');
    let baselineHeight = Math.max(window.innerHeight, root.clientHeight);
    let layoutWidth = window.innerWidth;
    let frame = 0;

    const update = () => {
      frame = 0;
      const editable = hasEditableFocus();
      // Pinch zoom also shrinks visualViewport: preserve the user's zoomed layout.
      if (viewport && Math.abs(viewport.scale - 1) > 0.05) {
        if (!editable) root.removeAttribute('data-keyboard-open');
        return;
      }
      const height = Math.max(1, viewport?.height || window.innerHeight);
      const top = Math.max(0, viewport?.offsetTop || 0);
      const currentLayoutHeight = Math.max(window.innerHeight, root.clientHeight, height + top);
      if (Math.abs(window.innerWidth - layoutWidth) > 80) {
        baselineHeight = currentLayoutHeight;
        layoutWidth = window.innerWidth;
      } else if (!editable) {
        baselineHeight = currentLayoutHeight;
      } else {
        baselineHeight = Math.max(baselineHeight, currentLayoutHeight);
      }
      const keyboardOpen = mobile.matches && editable && baselineHeight - height > 120;
      root.style.setProperty(VIEWPORT_HEIGHT, `${Math.round(height)}px`);
      root.style.setProperty(VIEWPORT_TOP, `${Math.round(top)}px`);
      if (keyboardOpen) root.setAttribute('data-keyboard-open', 'true');
      else root.removeAttribute('data-keyboard-open');
    };
    const scheduleUpdate = () => {
      if (!frame) frame = window.requestAnimationFrame(update);
    };

    update();
    viewport?.addEventListener('resize', scheduleUpdate, { passive: true });
    viewport?.addEventListener('scroll', scheduleUpdate, { passive: true });
    window.addEventListener('resize', scheduleUpdate, { passive: true });
    document.addEventListener('focusin', scheduleUpdate);
    document.addEventListener('focusout', scheduleUpdate);
    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      viewport?.removeEventListener('resize', scheduleUpdate);
      viewport?.removeEventListener('scroll', scheduleUpdate);
      window.removeEventListener('resize', scheduleUpdate);
      document.removeEventListener('focusin', scheduleUpdate);
      document.removeEventListener('focusout', scheduleUpdate);
      if (previousHeight) root.style.setProperty(VIEWPORT_HEIGHT, previousHeight);
      else root.style.removeProperty(VIEWPORT_HEIGHT);
      if (previousTop) root.style.setProperty(VIEWPORT_TOP, previousTop);
      else root.style.removeProperty(VIEWPORT_TOP);
      if (previousKeyboard !== null) root.setAttribute('data-keyboard-open', previousKeyboard);
      else root.removeAttribute('data-keyboard-open');
    };
  }, []);
}
