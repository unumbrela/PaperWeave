export interface SearchQuery {
  field?: string;
  subField?: string;
  keywords?: string;
  mustHaveKeywords?: string;
  excludeKeywords?: string;
  researchGoal?: string;
  methodHints?: string;
  startYear?: number;
  endYear?: number;
  venues?: string[];
  maxResults?: number;
  sortBy?: 'relevance' | 'citations' | 'year';
}

export interface ResearchSubField {
  id: string;
  label: string;
  keywords: string;
}

export interface ResearchField {
  id: string;
  label: string;
  subFields: ResearchSubField[];
}

export interface PaperResult {
  id: string;
  title: string;
  authors: string[];
  year?: number;
  venue?: string;
  url: string;
  pdfUrl?: string;
  abstract?: string;
  citations?: number;
  source: 'semantic-scholar' | 'openalex' | 'arxiv' | 'crossref';
}

export interface APIConfig {
  semanticScholarApiKey?: string;
  ieeeApiKey?: string;
  scopusApiKey?: string;
}

export interface SearchSource {
  id: string;
  name: string;
  requiresKey: boolean;
  description: string;
  coverage: string;
  fields: string[];
}

export const SEARCH_SOURCES: SearchSource[] = [
  {
    id: 'openalex',
    name: 'OpenAlex',
    requiresKey: false,
    description: '2.5亿+学术作品，覆盖面最广，完全免费',
    coverage: '全学科',
    fields: ['computer-science', 'computer-systems', 'information-systems', 'theory', 'biology-health', 'engineering', 'physics', 'chemistry', 'biology', 'environmental', 'social-sciences', 'mathematics', 'interdisciplinary'],
  },
  {
    id: 'semantic-scholar',
    name: 'Semantic Scholar',
    requiresKey: true,
    description: '2亿+论文，偏计算机/生物医学，数据质量高',
    coverage: '计算机/生物医学',
    fields: ['computer-science', 'computer-systems', 'information-systems', 'theory', 'biology-health'],
  },
  {
    id: 'arxiv',
    name: 'arXiv',
    requiresKey: false,
    description: '预印本平台，更新快，计算机科学为主',
    coverage: '计算机/物理/数学',
    fields: ['computer-science', 'computer-systems', 'information-systems', 'theory', 'physics', 'mathematics', 'interdisciplinary'],
  },
  {
    id: 'crossref',
    name: 'Crossref',
    requiresKey: false,
    description: '1.5亿+ DOI 元数据，覆盖正式出版的期刊/会议论文，免费',
    coverage: '全学科（正式出版）',
    fields: ['computer-science', 'computer-systems', 'information-systems', 'theory', 'biology-health', 'engineering', 'physics', 'chemistry', 'biology', 'environmental', 'social-sciences', 'mathematics', 'interdisciplinary'],
  },
  {
    id: 'ieee',
    name: 'IEEE Xplore',
    requiresKey: true,
    description: 'IEEE论文库，涵盖电气电子工程、计算机科学',
    coverage: '工程/计算机',
    fields: ['computer-science', 'computer-systems', 'engineering', 'physics', 'information-systems'],
  },
  {
    id: 'scopus',
    name: 'Scopus',
    requiresKey: true,
    description: 'Elsevier学术数据库，覆盖多学科，数据全面',
    coverage: '全学科',
    fields: ['computer-science', 'computer-systems', 'information-systems', 'theory', 'biology-health', 'engineering', 'physics', 'chemistry', 'biology', 'environmental', 'social-sciences', 'mathematics', 'interdisciplinary'],
  },
  {
    id: 'pubmed',
    name: 'PubMed',
    requiresKey: false,
    description: 'NCBI医学文献库，专注生物医学领域',
    coverage: '生物医学',
    fields: ['biology-health', 'biology', 'chemistry'],
  },
  {
    id: 'acm',
    name: 'ACM Digital Library',
    requiresKey: true,
    description: 'ACM计算机科学数字图书馆',
    coverage: '计算机科学',
    fields: ['computer-science', 'computer-systems', 'information-systems', 'theory'],
  },
  {
    id: 'webofscience',
    name: 'Web of Science',
    requiresKey: true,
    description: '科睿唯安学术索引，涵盖核心期刊',
    coverage: '全学科',
    fields: ['computer-science', 'computer-systems', 'information-systems', 'theory', 'biology-health', 'engineering', 'physics', 'chemistry', 'biology', 'environmental', 'social-sciences', 'mathematics', 'interdisciplinary'],
  },
];

export const VENUE_MAP: Record<string, string[]> = {
  'computer-science': [
    'CVPR', 'NeurIPS', 'ICLR', 'ICML', 'ECCV', 'AAAI', 'ACL', 'EMNLP', 'KDD', 'WWW',
    'SIGGRAPH', 'CHI', 'UIST', 'ACM MM', 'INTERSPEECH', 'NAACL', 'EMBC', 'MICCAI', 'ISBI',
    'NIPS', 'IJCAI', 'COLT', 'SODA', 'FOCS', 'STOC', 'PODC', 'SPAA', 'PPS', 'SP',
    'SC', 'IPDPS', 'ICS', 'PPoPP', 'HPCA', 'ISCA', 'MICRO', 'ASPLOS', 'OSDI', 'SOSP',
  ],
  'computer-systems': [
    'SOSP', 'OSDI', 'NSDI', 'SIGCOMM', 'NSDI', 'SIGMETRICS', 'SIGMOD', 'VLDB', 'ICDE',
    'SIGKDD', 'USENIX', 'EuroSys', 'HotOS', 'HotCloud', 'SOSR', 'SP', 'SC', 'HPC',
    'ISCA', 'MICRO', 'HPCA', 'ASPLOS', 'VEE', 'PLDI', 'POPL', 'ICSE', 'FSE',
  ],
  'information-systems': [
    'SIGIR', 'WWW', 'CIKM', 'RecSys', 'SIGKDD', 'SIGMOD', 'VLDB', 'ICDE', 'TKDE', 'TOIS',
    'S&P', 'USENIX', 'NDSS', 'CCS', 'SAC', 'CHI', 'UIST', 'DIS', 'Ubicomp', 'CSCW',
  ],
  'theory': [
    'STOC', 'FOCS', 'SODA', 'COLT', 'PODC', 'SPAA', 'ICALP', 'IPCO', 'LICS', 'CSL',
    'TCS', 'CCC', 'CRYPTO', 'EUROCRYPT', 'ASIACRYPT', 'CAV', 'POPL', 'LICS', 'CSF',
  ],
  'biology-health': [
    'Nature', 'Science', 'Cell', 'NEJM', 'Lancet', 'JAMA', 'BMJ', 'Nature Medicine', 'Cell Research',
    'Cancer Cell', 'Neuron', 'Immunity', 'Cell Stem Cell', 'Nature Biotechnology',
    'Nature Methods', 'Nature Genetics', 'Genome Research', 'PLOS Biology', 'PNAS',
    'MICCAI', 'ISBI', 'EMBC', 'Nature Medicine', 'Nature Biomedical Engineering',
  ],
  'engineering': [
    'IEEE Transactions', 'ASME', 'ASCE', 'AIAA', 'IEEE Spectrum', 'Nature Materials',
    'Advanced Materials', 'ACS Nano', 'Nano Letters', 'IEEE Transactions on Robotics',
    'IEEE Transactions on Signal Processing', 'IEEE Transactions on Power Systems',
    'IEEE Transactions on Automatic Control', 'IEEE Transactions on Neural Networks',
    'ASME Journal of Mechanical Design', 'ASME Journal of Engineering Materials',
  ],
  'physics': [
    'Physical Review Letters', 'Nature Physics', 'Nature', 'Science', 'Physical Review A',
    'Physical Review B', 'Physical Review C', 'Physical Review D', 'Physical Review E',
    'Physical Review X', 'Reviews of Modern Physics', 'Nature Nanotechnology',
    'Nature Materials', 'Science Advances', 'Nuclear Physics B', 'Journal of High Energy Physics',
  ],
  'chemistry': [
    'Journal of the American Chemical Society', 'Angewandte Chemie', 'Nature Chemistry',
    'Chemical Reviews', 'Chemical Society Reviews', 'Advanced Materials', 'Advanced Functional Materials',
    'ACS Central Science', 'Journal of Organic Chemistry', 'Journal of Physical Chemistry Letters',
    'Organic Letters', 'Inorganic Chemistry', 'Analytical Chemistry', 'Biochemistry',
  ],
  'biology': [
    'Nature', 'Science', 'Cell', 'Molecular Cell', 'Developmental Cell', 'Current Biology',
    'PLOS Biology', 'Genes & Development', 'Development', 'Cell Reports',
    'Nature Genetics', 'Nature Communications', 'eLife', 'PNAS', 'Cell Metabolism',
  ],
  'environmental': [
    'Nature Climate Change', 'Science', 'Nature', 'Environmental Science & Technology',
    'Environmental Health Perspectives', 'Journal of Environmental Management',
    'Global Environmental Change', 'Environmental Pollution', 'Atmospheric Environment',
    'Environmental Science & Technology Letters', 'Nature Sustainability',
    'Science of the Total Environment', 'Water Research',
  ],
  'social-sciences': [
    'American Economic Review', 'Journal of Political Economy', 'Econometrica',
    'Quarterly Journal of Economics', 'Journal of Finance', 'Journal of Financial Economics',
    'American Political Science Review', 'American Journal of Sociology',
    'Psychological Review', 'Journal of Personality and Social Psychology',
    'Nature Human Behaviour', 'Science', 'PNAS',
  ],
  'mathematics': [
    'Annals of Mathematics', 'Journal of the AMS', 'Acta Mathematica',
    'Inventiones mathematicae', 'Duke Mathematical Journal', 'Journal of Number Theory',
    'Mathematische Annalen', 'Compositio Mathematica', 'Advances in Mathematics',
    'Transactions of the AMS', 'Annals of Statistics', 'Journal of the Royal Statistical Society',
  ],
  'interdisciplinary': [
    'Nature', 'Science', 'PNAS', 'Nature Communications', 'Science Advances',
    'Proceedings of the National Academy of Sciences', 'Cell Reports Methods',
    'iScience', 'Nature Reviews Methods Primers', 'Nature Methods',
  ],
};

export const VENUES = [
  'CVPR', 'NeurIPS', 'ICLR', 'ICML', 'ECCV', 'AAAI', 'ACL', 'EMNLP', 'KDD', 'WWW',
  'SIGGRAPH', 'CHI', 'UIST', 'ACM MM', 'INTERSPEECH', 'NAACL', 'EMBC', 'MICCAI', 'ISBI',
];

export function getVenuesForField(fieldId: string | null): string[] {
  if (!fieldId) {
    return VENUES;
  }
  return VENUE_MAP[fieldId] || VENUES;
}

export const RESEARCH_FIELDS: ResearchField[] = [
  {
    id: 'computer-science',
    label: '计算机科学',
    subFields: [
      { id: 'ai-ml-dl', label: '人工智能/机器学习/深度学习', keywords: 'artificial intelligence machine learning deep learning' },
      { id: 'cv', label: '计算机视觉', keywords: 'computer vision image processing' },
      { id: 'nlp', label: '自然语言处理', keywords: 'natural language processing NLP computational linguistics' },
      { id: 'multimodal', label: '多模态学习', keywords: 'multimodal vision language cross-modal' },
      { id: 'robotics', label: '机器人学', keywords: 'robotics autonomous navigation manipulation' },
      { id: 'knowledge-graph', label: '知识图谱', keywords: 'knowledge graph entity linking knowledge base' },
      { id: 'reinforcement-learning', label: '强化学习', keywords: 'reinforcement learning deep RL policy gradient' },
      { id: 'data-mining', label: '数据挖掘', keywords: 'data mining pattern recognition classification clustering' },
    ],
  },
  {
    id: 'computer-systems',
    label: '计算机系统',
    subFields: [
      { id: 'distributed-systems', label: '分布式系统', keywords: 'distributed systems cloud computing microservices' },
      { id: 'database', label: '数据库', keywords: 'database management systems query optimization' },
      { id: 'operating-systems', label: '操作系统', keywords: 'operating systems kernel virtualization' },
      { id: 'networking', label: '计算机网络', keywords: 'computer networks protocols cybersecurity' },
      { id: 'computer-architecture', label: '计算机体系结构', keywords: 'computer architecture hardware accelerators FPGA GPU' },
      { id: 'software-engineering', label: '软件工程', keywords: 'software engineering testing verification refactoring' },
    ],
  },
  {
    id: 'information-systems',
    label: '信息系统',
    subFields: [
      { id: 'information-retrieval', label: '信息检索', keywords: 'information retrieval search engines recommendation systems' },
      { id: 'information-security', label: '信息安全', keywords: 'information security cryptography privacy blockchain' },
      { id: 'hci', label: '人机交互', keywords: 'human-computer interaction UX design interaction' },
      { id: 'ir', label: '智能推理', keywords: 'knowledge representation reasoning expert systems' },
    ],
  },
  {
    id: 'theory',
    label: '计算机理论',
    subFields: [
      { id: 'algorithms', label: '算法与复杂性', keywords: 'algorithms computational complexity graph theory' },
      { id: ' cryptography-security-theory', label: '密码学与安全理论', keywords: 'cryptography security protocols zero-knowledge' },
      { id: 'logic', label: '逻辑与形式方法', keywords: 'formal methods verification model checking' },
      { id: 'automata', label: '自动机与形式语言', keywords: 'automata theory formal languages computability' },
    ],
  },
  {
    id: 'biology-health',
    label: '生物与健康',
    subFields: [
      { id: 'bioinformatics', label: '生物信息学', keywords: 'bioinformatics genomics proteomics computational biology' },
      { id: 'medical-imaging', label: '医学影像', keywords: 'medical imaging MRI CT X-ray segmentation detection' },
      { id: 'healthcare-ai', label: '医疗健康AI', keywords: 'medical AI clinical decision support electronic health records' },
      { id: 'drug-discovery', label: '药物发现', keywords: 'drug discovery molecular docking QSAR virtual screening' },
      { id: 'neuroscience', label: '神经科学', keywords: 'neuroscience brain imaging cognitive neuroscience' },
      { id: 'genomics', label: '基因组学', keywords: 'genomics gene expression sequencing variant calling' },
    ],
  },
  {
    id: 'engineering',
    label: '工程学',
    subFields: [
      { id: 'electrical-engineering', label: '电气工程', keywords: 'electrical engineering signal processing control systems' },
      { id: 'mechanical-engineering', label: '机械工程', keywords: 'mechanical engineering CAD CAM simulation' },
      { id: 'civil-engineering', label: '土木工程', keywords: 'civil engineering structural analysis construction management' },
      { id: 'materials-science', label: '材料科学', keywords: 'materials science nanotechnology semiconductors' },
      { id: 'aerospace', label: '航空航天', keywords: 'aerospace aerodynamics propulsion guidance control' },
    ],
  },
  {
    id: 'physics',
    label: '物理学',
    subFields: [
      { id: 'particle-physics', label: '粒子物理', keywords: 'particle physics high energy physics CERN' },
      { id: 'condensed-matter', label: '凝聚态物理', keywords: 'condensed matter physics superconductivity topological materials' },
      { id: 'quantum', label: '量子物理', keywords: 'quantum physics quantum computing quantum information' },
      { id: 'astrophysics', label: '天体物理', keywords: 'astrophysics cosmology gravitational waves' },
      { id: 'optics-photonics', label: '光学与光子学', keywords: 'optics photonics lasers imaging spectroscopy' },
    ],
  },
  {
    id: 'chemistry',
    label: '化学',
    subFields: [
      { id: 'organic-chemistry', label: '有机化学', keywords: 'organic chemistry synthesis catalysis' },
      { id: 'inorganic-chemistry', label: '无机化学', keywords: 'inorganic chemistry coordination compounds materials' },
      { id: 'physical-chemistry', label: '物理化学', keywords: 'physical chemistry thermodynamics kinetics quantum chemistry' },
      { id: 'analytical-chemistry', label: '分析化学', keywords: 'analytical chemistry spectroscopy chromatography' },
      { id: 'computational-chemistry', label: '计算化学', keywords: 'computational chemistry molecular modeling DFT simulation' },
    ],
  },
  {
    id: 'biology',
    label: '生物学',
    subFields: [
      { id: 'molecular-biology', label: '分子生物学', keywords: 'molecular biology DNA RNA protein synthesis' },
      { id: 'cell-biology', label: '细胞生物学', keywords: 'cell biology microscopy signaling apoptosis' },
      { id: 'ecology', label: '生态学', keywords: 'ecology biodiversity conservation climate change' },
      { id: 'evolution', label: '进化生物学', keywords: 'evolutionary biology phylogenetics speciation' },
      { id: 'microbiology', label: '微生物学', keywords: 'microbiology bacteria viruses microbiome' },
    ],
  },
  {
    id: 'environmental',
    label: '环境科学',
    subFields: [
      { id: 'climate-science', label: '气候科学', keywords: 'climate science global warming atmospheric science' },
      { id: 'environmental-chemistry', label: '环境化学', keywords: 'environmental chemistry pollution remediation green chemistry' },
      { id: 'sustainability', label: '可持续发展', keywords: 'sustainability renewable energy circular economy' },
      { id: 'oceanography', label: '海洋学', keywords: 'oceanography marine biology ocean dynamics' },
    ],
  },
  {
    id: 'social-sciences',
    label: '社会科学',
    subFields: [
      { id: 'economics', label: '经济学', keywords: 'economics econometrics game theory macroeconomics microeconomics' },
      { id: 'psychology', label: '心理学', keywords: 'psychology cognitive behavioral neuroscience social psychology' },
      { id: 'sociology', label: '社会学', keywords: 'sociology social networks inequality culture' },
      { id: 'political-science', label: '政治学', keywords: 'political science international relations public policy' },
      { id: 'education', label: '教育学', keywords: 'education learning analytics educational technology' },
      { id: 'linguistics', label: '语言学', keywords: 'linguistics phonetics syntax semantics sociolinguistics' },
    ],
  },
  {
    id: 'mathematics',
    label: '数学',
    subFields: [
      { id: 'pure-math', label: '纯数学', keywords: 'algebra geometry topology analysis number theory' },
      { id: 'applied-math', label: '应用数学', keywords: 'applied mathematics differential equations modeling' },
      { id: 'statistics', label: '统计学', keywords: 'statistics probability Bayesian inference statistical learning' },
      { id: 'optimization', label: '优化', keywords: 'optimization convex optimization combinatorial optimization' },
      { id: 'probability', label: '概率论', keywords: 'probability theory stochastic processes random matrices' },
    ],
  },
  {
    id: 'interdisciplinary',
    label: '交叉学科',
    subFields: [
      { id: 'quantum-computing', label: '量子计算', keywords: 'quantum computing quantum algorithms quantum machine learning' },
      { id: 'computational-social-science', label: '计算社会科学', keywords: 'computational social science digital humanities social computing' },
      { id: 'neuroeconomics', label: '神经经济学', keywords: 'neuroeconomics decision making cognitive neuroscience' },
      { id: 'biomechanics', label: '生物力学', keywords: 'biomechanics biomaterials tissue engineering' },
      { id: 'econophysics', label: '经济物理学', keywords: 'econophysics financial physics market dynamics' },
      { id: 'sociophysics', label: '社会物理学', keywords: 'sociophysics collective behavior social dynamics' },
    ],
  },
];

export function getFieldById(fieldId: string): ResearchField | undefined {
  return RESEARCH_FIELDS.find(field => field.id === fieldId);
}

export function getSubFieldById(fieldId: string, subFieldId: string): ResearchSubField | undefined {
  const field = getFieldById(fieldId);
  return field?.subFields.find(subField => subField.id === subFieldId);
}
