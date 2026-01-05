/**
 * WelcomeModal Component
 *
 * Displays author information and privacy policy on first visit.
 * Uses localStorage to remember dismissal.
 * Automatically detects browser language for Chinese/English content.
 */

import styles from './WelcomeModal.module.css';

interface WelcomeModalProps {
  onClose: () => void;
}

const isChineseLocale = (): boolean => {
  const lang = navigator.language || (navigator.languages?.[0]) || 'en';
  return lang.toLowerCase().startsWith('zh');
};

export function WelcomeModal({ onClose }: WelcomeModalProps) {
  const isChinese = isChineseLocale();

  const content = isChinese ? {
    title: '歡迎使用 Pedigree Draw',
    aboutTitle: '關於本專案',
    aboutContent: [
      '本專案由一位患有 Usher syndrome 的作者所建立。',
      '建立此工具的動機是為了支援遺傳學、系譜學和 Bioinformatics 領域的研究，並探索視覺化工具如何幫助理解遺傳性疾病。',
      '作者明確支持與 Usher syndrome 及其他遺傳疾病相關的研究，並希望此專案能以某種方式為 Bioinformatics 研究社群做出貢獻。',
    ],
    privacyTitle: '隱私政策',
    privacyContent: '本網站不搜集任何使用者資料，也不儲存任何資料。所有操作僅在您的瀏覽器中進行，關閉頁面後資料即消失。',
    supportTitle: '☕ 支持這個專案',
    supportContent: '如果您覺得這個工具對您的研究、教學或臨床工作有幫助，歡迎支持它的開發。',
    buttonText: '我了解，開始使用',
  } : {
    title: 'Welcome to Pedigree Draw',
    aboutTitle: 'About This Project',
    aboutContent: [
      'This project is created by an author with Usher syndrome.',
      'The motivation behind this work is to support research in genetics, genealogy, and bioinformatics, and to explore how visualization tools may assist in understanding hereditary conditions.',
      'The author explicitly supports research related to Usher syndrome and other genetic disorders, and hopes this project may contribute, even in a small way, to the bioinformatics research community.',
    ],
    privacyTitle: 'Privacy Policy',
    privacyContent: 'This website does not collect any user data or store any information. All operations are performed locally in your browser. Data will be lost when you close the page.',
    supportTitle: '☕ Support This Project',
    supportContent: 'If you find this tool helpful for research, teaching, or clinical work, consider supporting its development.',
    buttonText: 'I Understand, Let\'s Start',
  };

  const handleClose = () => {
    localStorage.setItem('pedigree-draw-welcome-dismissed', 'true');
    onClose();
  };

  return (
    <div className={styles.overlay} onClick={handleClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <h1 className={styles.title}>{content.title}</h1>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>{content.aboutTitle}</h2>
          {content.aboutContent.map((paragraph, index) => (
            <p key={index} className={styles.paragraph}>{paragraph}</p>
          ))}
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>{content.privacyTitle}</h2>
          <p className={styles.paragraph}>{content.privacyContent}</p>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>{content.supportTitle}</h2>
          <p className={styles.paragraph}>{content.supportContent}</p>
          <div style={{ textAlign: 'center', marginTop: '12px' }}>
            <a href="https://buymeacoffee.com/gbanyan" target="_blank" rel="noopener noreferrer">
              <img
                src="https://cdn.buymeacoffee.com/buttons/v2/default-yellow.png"
                alt="Buy Me A Coffee"
                style={{ height: '50px', width: 'auto', borderRadius: '8px' }}
              />
            </a>
          </div>
        </section>

        <button className={styles.button} onClick={handleClose}>
          {content.buttonText}
        </button>
      </div>
    </div>
  );
}
