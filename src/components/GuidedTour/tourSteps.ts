import type { DriveStep } from 'driver.js';

const isChineseLocale = (): boolean => {
  const lang = navigator.language || (navigator.languages?.[0]) || 'en';
  return lang.toLowerCase().startsWith('zh');
};

interface StepContent {
  title: string;
  description: string;
}

interface BilingualStep {
  en: StepContent;
  zh: StepContent;
}

const stepContents: BilingualStep[] = [
  {
    en: {
      title: 'File Operations',
      description: 'Start by creating a new pedigree or importing an existing PED file. You can also drag and drop files here.',
    },
    zh: {
      title: '檔案操作',
      description: '從這裡開始建立新的家系圖或匯入現有的 PED 檔案。您也可以直接拖放檔案到此處。',
    },
  },
  {
    en: {
      title: 'Add Family Members',
      description: 'Use these buttons to add individuals to your pedigree. Choose Male (square), Female (circle), or Unknown (diamond).',
    },
    zh: {
      title: '新增家庭成員',
      description: '使用這些按鈕來新增家系圖中的個體。選擇男性（方形）、女性（圓形）或未知（菱形）。',
    },
  },
  {
    en: {
      title: 'Pedigree Canvas',
      description: 'This is your workspace. Click to select a person, drag to reposition. Use zoom controls to navigate large pedigrees.',
    },
    zh: {
      title: '家系圖畫布',
      description: '這是您的工作區域。點擊選擇個體，拖曳可以重新定位。使用縮放控制來瀏覽大型家系圖。',
    },
  },
  {
    en: {
      title: 'Add Relationships',
      description: 'After selecting a person, use these buttons to add a spouse, child, or parents. Relationships connect automatically.',
    },
    zh: {
      title: '新增關係',
      description: '選擇一個個體後，使用這些按鈕來新增配偶、子女或父母。關係會自動連接。',
    },
  },
  {
    en: {
      title: 'Edit Properties',
      description: 'When a person is selected, edit their properties here: labels, sex, phenotype (affected/unaffected/carrier), and statuses.',
    },
    zh: {
      title: '編輯屬性',
      description: '選擇個體後，在此編輯屬性：標籤、性別、表型狀態（患病/未患病/帶因者），以及特殊狀態。',
    },
  },
  {
    en: {
      title: 'Export Your Work',
      description: 'Export your pedigree as SVG (vector), PNG (image), or PED format (data). Ready for sharing or publications!',
    },
    zh: {
      title: '匯出您的作品',
      description: '將家系圖匯出為 SVG（向量圖）、PNG（圖片）或 PED 格式（資料檔）。可用於分享或出版！',
    },
  },
];

export const getTourSteps = (): DriveStep[] => {
  const isChinese = isChineseLocale();

  return [
    {
      element: '[data-tour="file-panel"]',
      popover: {
        title: isChinese ? stepContents[0].zh.title : stepContents[0].en.title,
        description: isChinese ? stepContents[0].zh.description : stepContents[0].en.description,
        side: 'right',
        align: 'start',
      },
    },
    {
      element: '[data-tour="person-buttons"]',
      popover: {
        title: isChinese ? stepContents[1].zh.title : stepContents[1].en.title,
        description: isChinese ? stepContents[1].zh.description : stepContents[1].en.description,
        side: 'bottom',
        align: 'start',
      },
    },
    {
      element: '[data-tour="canvas"]',
      popover: {
        title: isChinese ? stepContents[2].zh.title : stepContents[2].en.title,
        description: isChinese ? stepContents[2].zh.description : stepContents[2].en.description,
        side: 'left',
        align: 'center',
      },
    },
    {
      element: '[data-tour="relationship-buttons"]',
      popover: {
        title: isChinese ? stepContents[3].zh.title : stepContents[3].en.title,
        description: isChinese ? stepContents[3].zh.description : stepContents[3].en.description,
        side: 'bottom',
        align: 'start',
      },
    },
    {
      element: '[data-tour="property-panel"]',
      popover: {
        title: isChinese ? stepContents[4].zh.title : stepContents[4].en.title,
        description: isChinese ? stepContents[4].zh.description : stepContents[4].en.description,
        side: 'left',
        align: 'start',
      },
    },
    {
      element: '[data-tour="export-section"]',
      popover: {
        title: isChinese ? stepContents[5].zh.title : stepContents[5].en.title,
        description: isChinese ? stepContents[5].zh.description : stepContents[5].en.description,
        side: 'right',
        align: 'start',
      },
    },
  ];
};

export const getTourLocale = () => {
  const isChinese = isChineseLocale();

  return {
    nextBtnText: isChinese ? '下一步' : 'Next',
    prevBtnText: isChinese ? '上一步' : 'Previous',
    doneBtnText: isChinese ? '完成' : 'Done',
  };
};
