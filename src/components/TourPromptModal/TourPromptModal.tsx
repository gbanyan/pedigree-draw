/**
 * TourPromptModal Component
 *
 * Prompts user to start the guided tour after welcome modal is dismissed.
 * Only shown on first visit.
 */

import styles from './TourPromptModal.module.css';

interface TourPromptModalProps {
  onStartTour: () => void;
  onSkip: () => void;
}

const isChineseLocale = (): boolean => {
  const lang = navigator.language || (navigator.languages?.[0]) || 'en';
  return lang.toLowerCase().startsWith('zh');
};

export function TourPromptModal({ onStartTour, onSkip }: TourPromptModalProps) {
  const isChinese = isChineseLocale();

  const content = isChinese ? {
    title: '需要導覽嗎？',
    description: '我們可以帶您快速了解如何使用 Pedigree Draw 的主要功能。導覽大約需要 1 分鐘。',
    startButton: '開始導覽',
    skipButton: '跳過，我自己探索',
  } : {
    title: 'Would you like a tour?',
    description: 'We can show you how to use the main features of Pedigree Draw. The tour takes about 1 minute.',
    startButton: 'Start Tour',
    skipButton: 'Skip, I\'ll explore myself',
  };

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <h2 className={styles.title}>{content.title}</h2>
        <p className={styles.description}>{content.description}</p>

        <div className={styles.buttons}>
          <button className={styles.primaryButton} onClick={onStartTour}>
            {content.startButton}
          </button>
          <button className={styles.secondaryButton} onClick={onSkip}>
            {content.skipButton}
          </button>
        </div>
      </div>
    </div>
  );
}
