import React, { useState, useEffect, useMemo } from 'react';
import { 
  FileSpreadsheet, Image as ImageIcon, TrendingUp, DollarSign, List, 
  Trash2, Upload, Database, Loader2, AlertCircle, Search, Camera, FileUp, Save, RotateCcw, CheckCircle2, RefreshCw, Layers, Eye, X, Calendar, Activity, History, ClipboardCheck, ChevronDown, ChevronUp, Download, PlayCircle, Maximize2, FileText, Plus, User, Building2, MapPin, Zap, Info, Settings2, ShieldCheck, Bookmark, Link
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { parseRVUDatabase, parseWorklistSpreadsheet } from './excelService';
import { analyzeWorklistImage } from './geminiService';
import { RVUEntry, WorklistItem, WorklistLog, MoonlightingTier } from './types';

// Hardcoded Master RVU Database synchronized with 'Radiology RVU Master.gsheet'
const INITIAL_FALLBACK_DB: RVUEntry[] = [
  { cpt: '77067, G0279', description: 'MAMMOGRAM SCREENING DIGITAL BILAT 3D TOMO', rvu: 9.36 },
  { cpt: '77066, G0279', description: 'MAMMO DIAGNOSTIC BILATERAL DIGITAL 3D TOMO', rvu: 2.2 },
  { cpt: '77065, G0279', description: 'MAMMO DIAGNOSTIC UNILATERAL DIGITAL 3D TOMO', rvu: 1.98 },
  { cpt: '76641', description: 'US BREAST BILATERAL COMPLETE', rvu: 2.06 },
  { cpt: '76642', description: 'US BREAST BILATERAL LIMITED', rvu: 1.92 },
  { cpt: '76642', description: 'US BREAST FOLLOW-UP (LT or RT)', rvu: 0.96 },
  { cpt: '76642', description: 'US BREAST LTD (LT or RT)', rvu: 0.96 },
  { cpt: '77049', description: 'MRI BREAST BILATERAL WITH AND WITHOUT CONTRAST', rvu: 2.24 },
  { cpt: '19081', description: 'US GUIDE BREAST BX PLACE/ASPIRATE', rvu: 4.53 },
  { cpt: '76942', description: 'US GUIDANCE FOR NEEDLE PLACEMENT BIO', rvu: 4.53 },
  { cpt: '19081', description: 'WM BREAST STEREOTACTIC BX UPRIGHT', rvu: 4.79 },
  { cpt: '77065', description: 'WM MAMMO DIAG TOMO FOLLOW-UP (LT or RT)', rvu: 1.98 },
  { cpt: '19081', description: 'WM MAMMO POST BX IMAGING (LT or RT)', rvu: 0 },
  { cpt: '70498', description: 'CT Angio Neck w/ or wo + w/ Cont', rvu: 1.75 },
  { cpt: '72126', description: 'CT Cervical Spine wo Cont', rvu: 1.22 },
  { cpt: '75571', description: 'CT Cardiac Calcium Scoring wo Cont', rvu: 0.58 },
  { cpt: '71250', description: 'CT Chest wo Cont', rvu: 1 },
  { cpt: '71260', description: 'CT Chest w/ Cont', rvu: 1.22 },
  { cpt: '71270', description: 'CT Chest wo + w/ Cont', rvu: 1.27 },
  { cpt: '70491', description: 'CT Neck w/ Cont', rvu: 1.38 },
  { cpt: '70492', description: 'CT Neck wo + w/ Cont', rvu: 1.62 },
  { cpt: '70486', description: 'CT Sinus Maxillofacial wo Cont', rvu: 0.85 },
  { cpt: '70486, 76377', description: 'CT Sinus Landmark wo Cont', rvu: 1.64 },
  { cpt: '71260, 74177', description: 'CT Chest Abdomen Pelvis w/ Cont', rvu: 2.98 },
  { cpt: '71250, 74176', description: 'CT Chest/Abdomen/Pelvis wo Cont', rvu: 2.82 },
  { cpt: '71270, 74178', description: 'CT Chest/Abdomen/Pelvis wo + w/ Cont', rvu: 3.26 },
  { cpt: '70551', description: 'MRI Head Brain wo Cont', rvu: 1.48 },
  { cpt: '70552', description: 'MRI Head Brain w/ Cont', rvu: 1.78 },
  { cpt: '70553', description: 'MRI Head Brain wo + w/ Cont', rvu: 2.29 },
  { cpt: '70553', description: 'MRI Head Brain w/ IACS wo + w/ Cont', rvu: 2.29 },
  { cpt: '70544', description: 'MRI Angio Head wo Cont', rvu: 1.2 },
  { cpt: '70545', description: 'MRI Angio Head w/ Cont', rvu: 1.2 },
  { cpt: '70546', description: 'MRI Angio Head wo + w/ Cont', rvu: 1.48 },
  { cpt: '70551, 70544', description: 'MR ANGIO HEAD AND MRI HEAD WITHOUT', rvu: 2.68 },
  { cpt: '70546', description: 'MRI Angio Head Venous MRV wo + w/ Cont', rvu: 1.48 },
  { cpt: '72148', description: 'MRI Lumbar Spine wo Cont', rvu: 1.48 },
  { cpt: '72149', description: 'MRI Lumbar Spine w/ Cont', rvu: 1.78 },
  { cpt: '72158', description: 'MRI Lumbar Spine wo + w/ Cont', rvu: 2.29 },
  { cpt: '72141', description: 'MRI Cervical Spine wo Cont', rvu: 1.48 },
  { cpt: '72142', description: 'MRI Cervical Spine w/ Cont', rvu: 1.78 },
  { cpt: '72156', description: 'MRI Cervical Spine wo + w/ Cont', rvu: 2.29 },
  { cpt: '72146', description: 'MRI Thoracic Spine wo Cont', rvu: 1.48 },
  { cpt: '72157', description: 'MRI Thoracic Spine Wo + w/ Cont', rvu: 2.29 },
  { cpt: '7050', description: 'MRI Orbits wo Cont', rvu: 1.35 },
  { cpt: '93880', description: 'Ultrasound Carotids', rvu: 0.8 }
];

const DEFAULT_MOONLIGHTING_TIERS: MoonlightingTier[] = [
  { minDays: 11, multiplier: 1.5 },
  { minDays: 5, multiplier: 1.25 }
];

export default function App() {
  const [rvuDatabase, setRvuDatabase] = useState<RVUEntry[]>(() => {
    const saved = localStorage.getItem('radrvu_db');
    if (saved) return JSON.parse(saved);
    const userDefault = localStorage.getItem('radrvu_user_default');
    return userDefault ? JSON.parse(userDefault) : INITIAL_FALLBACK_DB;
  });

  const [conversionFactor, setConversionFactor] = useState<number>(() => {
    const saved = localStorage.getItem('radrvu_cf');
    return saved ? parseFloat(saved) : 45.00;
  });

  const [physicianName, setPhysicianName] = useState<string>(() => {
    return localStorage.getItem('radrvu_physician_name') || '';
  });

  const [radiologyGroup, setRadiologyGroup] = useState<string>(() => {
    return localStorage.getItem('radrvu_radiology_group') || '';
  });

  const [location, setLocation] = useState<string>(() => {
    return localStorage.getItem('radrvu_location') || '';
  });

  const [worklistDate, setWorklistDate] = useState<string>(new Date().toISOString().split('T')[0]);

  const [isMoonlighting, setIsMoonlighting] = useState<boolean>(() => {
    return localStorage.getItem('radrvu_moonlighting') === 'true';
  });

  const [moonlightingTiers, setMoonlightingTiers] = useState<MoonlightingTier[]>(() => {
    const saved = localStorage.getItem('radrvu_moonlighting_tiers');
    return saved ? JSON.parse(saved) : DEFAULT_MOONLIGHTING_TIERS;
  });

  const [showTiersConfig, setShowTiersConfig] = useState(false);

  const [logs, setLogs] = useState<WorklistLog[]>(() => {
    const saved = localStorage.getItem('radrvu_logs');
    return saved ? JSON.parse(saved) : [];
  });

  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [showImageModal, setShowImageModal] = useState(false);
  const [modalImage, setModalImage] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'calc' | 'db' | 'logs'>('calc');
  const [dbSearch, setDbSearch] = useState('');
  const [showLogFeedback, setShowLogFeedback] = useState(false);
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

  const calculateMultiplier = (examDate?: string, readDate?: string) => {
    if (!isMoonlighting || !examDate || !readDate) return 1.0;
    
    const exam = new Date(examDate);
    const read = new Date(readDate);
    const diffTime = Math.abs(read.getTime() - exam.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    const sortedTiers = [...moonlightingTiers].sort((a, b) => b.minDays - a.minDays);
    const matchingTier = sortedTiers.find(tier => diffDays >= tier.minDays);
    
    return matchingTier ? matchingTier.multiplier : 1.0;
  };

  const getEnrichedWorklist = (items: WorklistItem[], db: RVUEntry[]) => {
    const SYNONYMS: Record<string, string> = {
      'without': 'wo', 'with': 'w', 'abdomen': 'abd', 'abdominal': 'abd',
      'pelvis': 'pelv', 'pelvic': 'pelv', 'contrast': 'con', 'extremity': 'ext',
      'bilateral': 'bilat', 'unilateral': 'unilat', 'ultrasound': 'us',
      'sonogram': 'us', 'radiograph': 'xr', 'x-ray': 'xr', 'xray': 'xr',
      'thoracic': 'chest', 'thorax': 'chest', 'thor': 'chest', 'lumbar': 'lumb',
      'cervical': 'cerv', 'brain': 'head', 'spine': 'sp', 'joint': 'jt',
      'angiography': 'angio', 'arteriogram': 'angio', 'venogram': 'angio',
      'arterial': 'art', 'venous': 'ven', 'extremities': 'ext',
      'computed tomography': 'ct', 'magnetic resonance': 'mr', 'cta': 'ct angio',
      'mra': 'mr angio', 'kub': 'abd xr', 'cxr': 'chest xr', 'dx': 'diag',
      'diagnostic': 'diag', 'sc': 'scr', 'screen': 'scr', 'screening': 'scr',
      'mammography': 'mammo', 'mammogram': 'mammo', 'tomosynthesis': 'tomo',
      'tomogram': 'tomo', 'complete': 'comp', 'limited': 'ltd'
    };

    const normalizeText = (s: string) => {
      let result = s.toLowerCase();
      result = result.replace(/\b(w\/and\/wo|w\/ & wo\/|w\/ & wo|w\/&wo|w & wo|with and without|wwcon|wo\+w|w\+wo|wo\/w|w\/wo|wo & w|w & wo|w\/wo|wo\/w)\b/g, 'ww');
      result = result.replace(/\bw\/o\b/g, 'wo');
      result = result.replace(/\bw\/\b/g, 'w');
      result = result.replace(/\babdomen and pelvis\b/g, 'abd pelv');
      result = result.replace(/\babdomen\/pelvis\b/g, 'abd pelv');
      result = result.replace(/\b(a\/p|ap)\b/g, 'abd pelv');
      
      Object.entries(SYNONYMS).forEach(([long, short]) => {
        result = result.replace(new RegExp(`\\b${long}\\b`, 'g'), short);
      });
      return result.replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ').trim();
    };

    const cleanCPT = (c: any) => String(c || '').replace(/[^a-z0-9]/g, '').trim();

    const normalizedDb = db.flatMap(d => {
      const cptList = String(d.cpt || '').split(',').map(c => cleanCPT(c)).filter(Boolean);
      const normDesc = normalizeText(d.description);
      const tokens = normDesc.split(' ').filter(t => t.length > 1);
      return [{ ...d, cleanCpts: cptList, normDesc, tokens, tokenSet: new Set(tokens) }];
    });

    return items.map(item => {
      let match: any | undefined;
      const worklistCptClean = cleanCPT(item.cpt);

      if (worklistCptClean) {
        match = normalizedDb.find(d => d.cleanCpts.includes(worklistCptClean));
      }

      if (!match && worklistCptClean && worklistCptClean.length >= 5) {
        const baseCpt = worklistCptClean.substring(0, 5);
        match = normalizedDb.find(d => d.cleanCpts.some(c => c.startsWith(baseCpt)));
      }
      
      const normItemDesc = normalizeText(item.description || '');

      if (!match && normItemDesc) {
        match = normalizedDb.find(d => d.normDesc === normItemDesc);
      }

      if (!match && normItemDesc) {
        const itemTokens = normItemDesc.split(' ').filter(t => t.length > 1);
        if (itemTokens.length > 0) {
          let bestScore = 0;
          let bestMatch: any | undefined;
          normalizedDb.forEach(d => {
            if (d.tokens.length === 0) return;
            const intersection = itemTokens.filter(t => d.tokenSet.has(t));
            const score = (2 * intersection.length) / (itemTokens.length + d.tokens.length);
            if (score > bestScore && score > 0.65) {
              bestScore = score;
              bestMatch = d;
            }
          });
          match = bestMatch;
        }
      }

      const baseRVU = match?.rvu || item.rvuPerStudy || 0;
      const mult = calculateMultiplier(item.examDate, worklistDate);
      const rvuPerStudy = baseRVU * mult;

      return {
        ...item,
        cpt: item.cpt || match?.cpt,
        description: match?.description || item.description || 'Unknown Study',
        rvuPerStudy: rvuPerStudy,
        totalRVU: rvuPerStudy * (item.count || 1)
      };
    });
  };

  const [currentWorklist, setCurrentWorklist] = useState<WorklistItem[]>(() => {
    const saved = localStorage.getItem('radrvu_current_worklist');
    return saved ? JSON.parse(saved) : []; 
  });

  const [rawWorklist, setRawWorklist] = useState<WorklistItem[]>(() => {
    const saved = localStorage.getItem('radrvu_raw_worklist');
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    localStorage.setItem('radrvu_db', JSON.stringify(rvuDatabase));
    localStorage.setItem('radrvu_cf', conversionFactor.toString());
    localStorage.setItem('radrvu_physician_name', physicianName);
    localStorage.setItem('radrvu_radiology_group', radiologyGroup);
    localStorage.setItem('radrvu_location', location);
    localStorage.setItem('radrvu_moonlighting', isMoonlighting.toString());
    localStorage.setItem('radrvu_moonlighting_tiers', JSON.stringify(moonlightingTiers));
    localStorage.setItem('radrvu_current_worklist', JSON.stringify(currentWorklist));
    localStorage.setItem('radrvu_raw_worklist', JSON.stringify(rawWorklist));
    localStorage.setItem('radrvu_logs', JSON.stringify(logs));
  }, [rvuDatabase, conversionFactor, physicianName, radiologyGroup, location, currentWorklist, rawWorklist, logs, isMoonlighting, moonlightingTiers]);

  useEffect(() => {
    if (currentWorklist.length > 0) {
      setCurrentWorklist(prev => prev.map(item => {
        const cleanCPT = (c: any) => String(c || '').replace(/[^a-z0-9]/g, '').trim();
        const itemCpt = cleanCPT(item.cpt);
        const match = rvuDatabase.find(d => {
            const dbCpts = String(d.cpt || '').split(',').map(c => cleanCPT(c));
            return dbCpts.includes(itemCpt);
        });
        const baseRVU = match?.rvu || (item.rvuPerStudy || 0);
        const mult = calculateMultiplier(item.examDate, worklistDate);
        const rvuPerStudy = baseRVU * mult;
        return { ...item, rvuPerStudy, totalRVU: rvuPerStudy * (item.count || 1) };
      }));
    }
  }, [isMoonlighting, worklistDate, moonlightingTiers]);

  const handleUpdateWorklistItem = (index: number, changes: Partial<WorklistItem>) => {
    setCurrentWorklist(prev => prev.map((item, i) => {
      if (i === index) {
        const updated = { ...item, ...changes };
        updated.totalRVU = (updated.count || 0) * (updated.rvuPerStudy || 0);
        return updated;
      }
      return item;
    }));
  };

  const handleRvuDbUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const db = await parseRVUDatabase(file);
      setRvuDatabase(db);
      setError(null);
    } catch (err) {
      setError("Failed to parse RVU Database.");
    }
  };

  const handleDeleteWorklistItem = (index: number) => {
    const newList = currentWorklist.filter((_, i) => i !== index);
    setCurrentWorklist(newList);
    setRawWorklist(newList);
  };

  const handleAddStudy = () => {
    setCurrentWorklist(prev => [...prev, { description: 'New Study', count: 1, rvuPerStudy: 0, totalRVU: 0, examDate: worklistDate }]);
  };

  const saveToLog = () => {
    if (currentWorklist.length === 0) return;
    const newLog: WorklistLog = {
      id: crypto.randomUUID(),
      date: worklistDate,
      timestamp: Date.now(),
      items: [...currentWorklist],
      totalRVUs: totalRVUs,
      totalEarnings: totalEarnings,
      conversionFactor: conversionFactor,
      physicianName: physicianName,
      radiologyGroup: radiologyGroup,
      location: location,
      imageUrl: uploadedImage,
      isMoonlighting,
      moonlightingTiers: isMoonlighting ? [...moonlightingTiers] : undefined
    };
    setLogs(prev => [newLog, ...prev]);
    setShowLogFeedback(true);
    setTimeout(() => setShowLogFeedback(false), 3000);
  };

  const restoreFromLog = (log: WorklistLog) => {
    if (window.confirm("Restore this log?")) {
      setWorklistDate(log.date);
      setConversionFactor(log.conversionFactor);
      if (log.physicianName) setPhysicianName(log.physicianName);
      if (log.radiologyGroup) setRadiologyGroup(log.radiologyGroup);
      if (log.location) setLocation(log.location);
      if (log.isMoonlighting !== undefined) setIsMoonlighting(log.isMoonlighting);
      if (log.moonlightingTiers) setMoonlightingTiers(log.moonlightingTiers);
      setCurrentWorklist(log.items);
      setRawWorklist(log.items);
      setUploadedImage(log.imageUrl || null);
      setActiveTab('calc');
    }
  };

  const deleteLogEntry = (id: string) => {
    if (window.confirm("Delete this log?")) {
      setLogs(prev => prev.filter(log => log.id !== id));
    }
  };

  const resetToDefault = () => {
    const userDefault = localStorage.getItem('radrvu_user_default');
    setRvuDatabase(userDefault ? JSON.parse(userDefault) : INITIAL_FALLBACK_DB);
  };

  const processFile = async (file: File) => {
    setIsAnalyzing(true);
    setError(null);
    setUploadedImage(null);
    try {
      if (file.type.includes('image')) {
        const reader = new FileReader();
        reader.onloadend = async () => {
          const dataUrl = reader.result as string;
          setUploadedImage(dataUrl);
          const base64String = dataUrl.split(',')[1];
          try {
            const items = await analyzeWorklistImage(base64String);
            setRawWorklist(items);
            setCurrentWorklist(getEnrichedWorklist(items, rvuDatabase));
            setIsAnalyzing(false);
          } catch (err) {
            setError("Analysis failed.");
            setIsAnalyzing(false);
          }
        };
        reader.readAsDataURL(file);
      } else {
        const items = await parseWorklistSpreadsheet(file);
        setRawWorklist(items);
        setCurrentWorklist(getEnrichedWorklist(items, rvuDatabase));
        setIsAnalyzing(false);
      }
    } catch (err) {
      setError("Process failed.");
      setIsAnalyzing(false);
    }
  };

  const generatePDFInstance = async (log: WorklistLog) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const totalLogStudies = log.items.reduce((acc, item) => acc + (item.count || 0), 0);

    doc.setFontSize(22); doc.setTextColor(30, 64, 175); doc.text('RadRVU Pro Report', 14, 22);
    doc.setFontSize(10); doc.setTextColor(100, 116, 139); doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 28); doc.text(`Studies Read On: ${log.date}`, 14, 34);
    if (log.isMoonlighting) { doc.setTextColor(194, 65, 12); doc.text(`Moonlighting Mode Enabled`, pageWidth - 60, 22); }
    let nextLineY = 42;
    if (log.physicianName) { doc.setTextColor(15, 23, 42); doc.text(`Physician: ${log.physicianName}`, 14, nextLineY); nextLineY += 6; }
    if (log.radiologyGroup) { doc.text(`Radiology Group: ${log.radiologyGroup}`, 14, nextLineY); nextLineY += 6; }

    const summaryStartY = nextLineY + 2;
    doc.setDrawColor(226, 232, 240); doc.setFillColor(248, 250, 252); doc.roundedRect(14, summaryStartY, pageWidth - 28, 30, 2, 2, 'FD');
    doc.setFontSize(10); doc.setTextColor(100, 116, 139); doc.text('TOTAL RVUs', 20, summaryStartY + 10); doc.text('TOTAL STUDIES', 70, summaryStartY + 10); doc.text('ESTIMATED EARNINGS', 120, summaryStartY + 10);
    doc.setFontSize(14); doc.setTextColor(37, 99, 235); doc.text(log.totalRVUs.toFixed(2), 20, summaryStartY + 22);
    doc.setTextColor(15, 23, 42); doc.text(totalLogStudies.toString(), 70, summaryStartY + 22);
    doc.setTextColor(22, 163, 74); doc.text(`$${log.totalEarnings.toLocaleString(undefined, { minimumFractionDigits: 2 })}`, 120, summaryStartY + 22);

    const tableData = log.items.map(item => [item.cpt || 'N/A', item.description || 'Unknown Study', item.examDate || '-', (item.count || 1).toString(), item.rvuPerStudy?.toFixed(2) || '0.00', (item.totalRVU || 0).toFixed(2)]);
    autoTable(doc, {
      startY: summaryStartY + 40,
      head: [['CPT', 'Description', 'Exam Date', 'Qty', 'Unit RVU', 'Total RVUs']],
      body: tableData, theme: 'striped',
      headStyles: { fillColor: [30, 64, 175], textColor: [255, 255, 255], fontStyle: 'bold' },
      styles: { fontSize: 8, cellPadding: 2 },
    });

    if (log.imageUrl) {
      doc.addPage(); doc.setFontSize(14); doc.setTextColor(30, 64, 175); doc.text('Source Worklist Image', 14, 20);
      const dimensions = await new Promise<{w:number,h:number}>(res => { const i = new Image(); i.onload = () => res({w:i.width,h:i.height}); i.src = log.imageUrl!; });
      doc.addImage(log.imageUrl, 'JPEG', 14, 30, pageWidth - 28, (pageWidth - 28) * (dimensions.h / dimensions.w), undefined, 'FAST');
    }
    return doc;
  };

  const exportToPDF = async (log: WorklistLog) => { (await generatePDFInstance(log)).save(`RadRVU_${log.date}.pdf`); };
  const viewPDFOnScreen = async (log: WorklistLog) => { window.open((await generatePDFInstance(log)).output('bloburl'), '_blank'); };

  const totalRVUs = currentWorklist.reduce((acc, item) => acc + (item.totalRVU || 0), 0);
  const totalStudies = currentWorklist.reduce((acc, item) => acc + (item.count || 0), 0);
  const totalEarnings = totalRVUs * conversionFactor;

  const handleClear = () => { if (window.confirm("Clear current worklist?")) { setCurrentWorklist([]); setRawWorklist([]); setUploadedImage(null); setError(null); } };

  const mammoVerification = rvuDatabase.find(item => (item.cpt || '').includes('77067'));
  const ctNeckVerification = rvuDatabase.find(item => (item.cpt || '').includes('70498'));

  return (
    <div className="min-h-screen pb-12 bg-slate-50 text-slate-900 selection:bg-blue-100">
      {showImageModal && modalImage && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/90 backdrop-blur-sm" onClick={() => setShowImageModal(false)}>
          <div className="relative max-w-full max-h-full overflow-auto bg-white rounded-2xl shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setShowImageModal(false)} className="absolute top-4 right-4 z-10 p-2 bg-black/50 text-white rounded-full hover:bg-black/70 shadow-lg"><X size={24} /></button>
            <img src={modalImage} alt="Full view" className="max-w-none w-auto h-auto cursor-zoom-out" onClick={() => setShowImageModal(false)} />
          </div>
        </div>
      )}

      <header className="bg-white border-b sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-200"><TrendingUp size={24} /></div>
            <div className="flex flex-col">
              <h1 className="text-lg font-bold text-slate-900 tracking-tight leading-none">RadRVU <span className="text-blue-600">Pro</span></h1>
              <div className="flex items-center gap-1 mt-1">
                <Link size={10} className="text-emerald-500" />
                <span className="text-[9px] font-black text-emerald-600 uppercase tracking-tighter">Radiology Master GS Synced</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
            <TabButton active={activeTab === 'calc'} onClick={() => setActiveTab('calc')} icon={<List size={18}/>} label="Calculator" />
            <TabButton active={activeTab === 'logs'} onClick={() => setActiveTab('logs')} icon={<History size={18}/>} label="Logs" />
            <TabButton active={activeTab === 'db'} onClick={() => setActiveTab('db')} icon={<Database size={18}/>} label="Database" />
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 mt-8">
        {activeTab === 'calc' && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100 grid grid-cols-1 md:grid-cols-3 gap-4">
               <div className="flex flex-col gap-1">
                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5"><User size={12}/> Physician</label>
                 <input type="text" placeholder="Physician Name" value={physicianName} onChange={(e) => setPhysicianName(e.target.value)} className="bg-slate-50 border border-slate-100 rounded-lg text-xs font-bold px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
               </div>
               <div className="flex flex-col gap-1">
                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5"><Building2 size={12}/> Radiology Group</label>
                 <input type="text" placeholder="Group Name" value={radiologyGroup} onChange={(e) => setRadiologyGroup(e.target.value)} className="bg-slate-50 border border-slate-100 rounded-lg text-xs font-bold px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
               </div>
               <div className="flex flex-col gap-1">
                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5"><MapPin size={12}/> Location</label>
                 <input type="text" placeholder="Location Name" value={location} onChange={(e) => setLocation(e.target.value)} className="bg-slate-50 border border-slate-100 rounded-lg text-xs font-bold px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
               </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-1 space-y-4">
                <div onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }} onDragLeave={() => setIsDragging(false)} onDrop={(e) => { e.preventDefault(); setIsDragging(false); const file = e.dataTransfer.files?.[0]; if (file) processFile(file); }} className={`relative overflow-hidden transition-all duration-300 rounded-xl border-2 border-dashed flex flex-col items-center justify-center p-5 text-center bg-white shadow-sm ${isDragging ? 'border-blue-500 bg-blue-50' : 'border-slate-200'}`}>
                  {isAnalyzing ? (
                    <div className="space-y-3 py-4"><Loader2 className="animate-spin text-blue-600 mx-auto" size={32} /><p className="text-xs font-bold">Analyzing Worklist...</p></div>
                  ) : (
                    <>
                      <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center mb-3 text-blue-600"><FileUp size={24} /></div>
                      <h3 className="text-sm font-bold mb-0.5">Worklist Upload</h3>
                      <div className="grid grid-cols-2 gap-2 w-full max-w-[220px]">
                        <label className="flex flex-col items-center p-2 rounded-lg bg-slate-50 border cursor-pointer hover:bg-slate-100"><FileSpreadsheet size={16} className="text-emerald-600 mb-1" /><span className="text-[9px] font-black uppercase">Excel</span><input type="file" className="hidden" accept=".xlsx,.xls,.csv" onChange={(e) => e.target.files?.[0] && processFile(e.target.files[0])} /></label>
                        <label className="flex flex-col items-center p-2 rounded-lg bg-slate-50 border cursor-pointer hover:bg-slate-100"><ImageIcon size={16} className="text-blue-600 mb-1" /><span className="text-[9px] font-black uppercase">Image</span><input type="file" className="hidden" accept="image/*" onChange={(e) => e.target.files?.[0] && processFile(e.target.files[0])} /></label>
                      </div>
                      <div className="mt-4 w-full pt-3 border-t"><label className="flex items-center justify-center gap-1.5 text-[10px] font-bold text-blue-600 cursor-pointer uppercase"><Camera size={14} />Capture Photo<input type="file" className="hidden" accept="image/*" capture="environment" onChange={(e) => e.target.files?.[0] && processFile(e.target.files[0])} /></label></div>
                    </>
                  )}
                </div>
                {uploadedImage && (
                  <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
                    <div className="p-3 border-b bg-slate-50/30 flex items-center justify-between"><span className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5"><ImageIcon size={12} className="text-blue-500" /> Source Image</span><div className="flex items-center gap-2"><button onClick={() => setUploadedImage(null)} className="text-slate-400 hover:text-red-500 p-1"><X size={14} /></button></div></div>
                    <div className="p-2"><img src={uploadedImage} alt="Uploaded" className="w-full h-auto max-h-[400px] object-contain rounded-lg cursor-zoom-in" onClick={() => { setModalImage(uploadedImage); setShowImageModal(true); }} /></div>
                  </div>
                )}
              </div>

              <div className="lg:col-span-2 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <MetricCard label="Productivity (RVUs)" value={totalRVUs.toFixed(2)} subValue={<div className="flex flex-col gap-2 mt-2"><div className="flex items-center gap-1.5 bg-blue-50/50 p-2 rounded-lg border border-blue-100/50"><Calendar size={12} className="text-blue-400" /><span className="text-[10px] text-blue-500 font-bold uppercase">Read on</span><input type="date" value={worklistDate} onChange={(e) => setWorklistDate(e.target.value)} className="flex-1 bg-white border rounded text-[11px] font-black text-blue-900 px-1.5 py-0.5" /></div><div className="flex items-center gap-2 px-2 py-1 bg-blue-50/50 border border-blue-100/50 rounded-lg w-fit"><Layers size={12} className="text-blue-400" /><span className="font-black text-blue-800 text-[11px] uppercase tracking-tighter">{totalStudies} Studies</span></div></div>} icon={<TrendingUp className="text-blue-600" />} color="blue" />
                  <MetricCard label="Estimated Income" value={`$${totalEarnings.toLocaleString(undefined, { minimumFractionDigits: 2 })}`} subValue={<div className="flex flex-col gap-3 mt-2"><div className="flex items-center gap-1.5 bg-emerald-50/50 p-2 rounded-lg border border-emerald-100/50"><span className="text-[11px] font-bold text-emerald-700/70 uppercase">AT</span><div className="relative w-24"><span className="absolute left-2 top-1/2 -translate-y-1/2 text-emerald-600 text-xs font-black">$</span><input type="number" step="0.01" value={conversionFactor} onChange={(e) => setConversionFactor(parseFloat(e.target.value) || 0)} className="w-full pl-5 pr-2 py-1 bg-white border border-emerald-200 rounded-md text-sm font-black text-emerald-900 focus:outline-none" /></div><span className="text-[11px] font-bold text-emerald-700/70 uppercase">/ RVU</span></div><div className="flex items-center gap-2"><button onClick={() => setIsMoonlighting(!isMoonlighting)} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-[10px] font-black uppercase transition-all shadow-sm ${isMoonlighting ? 'bg-orange-500 border-orange-600 text-white' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'}`}><Zap size={14} className={isMoonlighting ? "fill-current" : ""} />Moonlighting</button>{isMoonlighting && <button onClick={() => setShowTiersConfig(!showTiersConfig)} className="p-1.5 rounded-lg border border-orange-200 bg-white"><Settings2 size={14} className="text-orange-600" /></button>}</div></div>} icon={<DollarSign className="text-emerald-600" />} color="emerald" />
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
                  <div className="p-4 border-b bg-slate-50/50 flex items-center justify-between"><div className="flex items-center gap-2"><h3 className="text-sm font-bold text-slate-800">Current Worklist</h3>{isMoonlighting && <div className="bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-tight flex items-center gap-1"><Zap size={10} className="fill-current" /> Auto-Multiplier</div>}</div><div className="flex items-center gap-2"><button onClick={handleAddStudy} className="text-[10px] font-black text-blue-600 px-2.5 py-1.5 rounded-lg border border-blue-100 uppercase flex items-center gap-1.5"><Plus size={12} />Add Study</button><button onClick={saveToLog} className={`text-[10px] font-black flex items-center gap-1 uppercase px-2 py-1 rounded-md shadow-sm border ${showLogFeedback ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-blue-600 border-blue-100'}`}>{showLogFeedback ? <ClipboardCheck size={12} /> : <Save size={12} />}{showLogFeedback ? 'Logged!' : 'Save Log'}</button><button onClick={handleClear} className="text-[10px] font-black text-red-500 px-2.5 py-1.5 rounded-lg border border-red-100 uppercase"><Trash2 size={12} /></button></div></div>
                  <div className="overflow-x-auto"><table className="w-full text-left"><thead><tr className="text-slate-400 text-[10px] uppercase tracking-widest font-black border-b border-slate-50"><th className="px-5 py-3">CPT</th><th className="px-5 py-3">Description</th><th className="px-5 py-3">Exam Date</th><th className="px-5 py-3 w-16 text-center">Qty</th><th className="px-5 py-3 w-24">Unit RVU</th><th className="px-5 py-3 text-right">Total</th><th className="px-5 py-3"></th></tr></thead><tbody className="divide-y divide-slate-50">{currentWorklist.length === 0 ? <tr><td colSpan={7} className="px-5 py-12 text-center text-slate-400 text-xs italic">Worklist empty.</td></tr> : currentWorklist.map((item, idx) => { const mult = calculateMultiplier(item.examDate, worklistDate); return <tr key={idx} className="hover:bg-slate-50/80 group"><td className="px-5 py-3 font-mono text-[11px] text-blue-600 font-bold"><input type="text" value={item.cpt || ''} onChange={(e) => handleUpdateWorklistItem(idx, { cpt: e.target.value })} className="w-16 bg-transparent border-none focus:ring-0 p-0" /></td><td className="px-5 py-3 text-xs font-semibold text-slate-700"><input type="text" value={item.description || ''} onChange={(e) => handleUpdateWorklistItem(idx, { description: e.target.value })} className="w-full bg-transparent border-none focus:ring-0 p-0" /></td><td className="px-5 py-3"><input type="date" value={item.examDate || ''} onChange={(e) => handleUpdateWorklistItem(idx, { examDate: e.target.value })} className="bg-white border border-slate-200 rounded text-[10px] font-bold px-1.5 py-0.5" /></td><td className="px-5 py-3 text-center"><input type="number" value={item.count} onChange={(e) => handleUpdateWorklistItem(idx, { count: parseInt(e.target.value) || 0 })} className="w-12 bg-white border border-slate-200 rounded px-1 py-0.5 text-center text-[11px] font-black" /></td><td className="px-5 py-3"><div className="flex flex-col"><span className="font-black text-[11px] text-slate-500">{item.rvuPerStudy?.toFixed(2)}</span>{mult > 1.0 && <span className="text-[8px] font-black text-orange-600 uppercase flex items-center gap-0.5"><Zap size={8} className="fill-current" /> {mult}x</span>}</div></td><td className="px-5 py-3 text-xs font-black text-slate-900 text-right">{item.totalRVU?.toFixed(2)}</td><td className="px-5 py-3 text-center"><button onClick={() => handleDeleteWorklistItem(idx)} className="text-slate-300 hover:text-red-500"><X size={14} /></button></td></tr>; })}</tbody>{currentWorklist.length > 0 && <tfoot className="bg-slate-50/50"><tr className="border-t"><td colSpan={5} className="px-5 py-4 font-black text-slate-500 text-right uppercase text-[10px]">Total RVUs</td><td className="px-5 py-4 font-black text-blue-600 text-lg text-right">{totalRVUs.toFixed(2)}</td><td></td></tr></tfoot>}</table></div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'logs' && (
          <div className="max-w-4xl mx-auto space-y-4">
            <h2 className="text-xl font-black text-slate-900 flex items-center gap-2 uppercase"><History className="text-blue-600" /> History</h2>
            <div className="space-y-3">
              {logs.length === 0 ? <div className="bg-white rounded-xl p-12 text-center border">No logs found.</div> : logs.map(log => (
                <div key={log.id} className="bg-white rounded-xl border shadow-sm overflow-hidden">
                  <div className="p-4 flex items-center justify-between cursor-pointer hover:bg-slate-50/50" onClick={() => setExpandedLogId(expandedLogId === log.id ? null : log.id)}>
                    <div className="flex gap-6"><div className="flex flex-col"><span className="text-[9px] font-black text-slate-400 uppercase">Read Date</span><span className="font-bold text-slate-800 text-xs">{log.date}</span></div><div className="flex flex-col"><span className="text-[9px] font-black text-slate-400 uppercase">RVUs</span><span className="font-black text-blue-600 text-xs">{log.totalRVUs.toFixed(2)}</span></div></div>
                    <div className="flex items-center gap-3"><button onClick={(e) => { e.stopPropagation(); viewPDFOnScreen(log); }} className="p-2 text-blue-400 hover:bg-blue-50 rounded-lg"><Eye size={18} /></button><button onClick={(e) => { e.stopPropagation(); exportToPDF(log); }} className="p-2 text-emerald-400 hover:bg-emerald-50 rounded-lg"><FileText size={18} /></button><button onClick={(e) => { e.stopPropagation(); restoreFromLog(log); }} className="p-2 text-blue-400 hover:bg-blue-50 rounded-lg"><PlayCircle size={18} /></button><button onClick={(e) => { e.stopPropagation(); deleteLogEntry(log.id); }} className="p-2 text-slate-300 hover:text-red-500"><Trash2 size={18} /></button></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'db' && (
          <div className="max-w-4xl mx-auto space-y-6">
            <div className="bg-white rounded-xl p-8 border shadow-sm text-center">
              <Database size={28} className="text-blue-600 mx-auto mb-4" />
              <h2 className="text-xl font-black uppercase tracking-tight">RVU Master Catalog</h2>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest -mt-3 mb-8">Source: Radiology RVU Master.gsheet</p>
              <div className="flex justify-center gap-3 mt-4">
                <label className="cursor-pointer bg-blue-600 text-white px-5 py-2.5 rounded-lg font-bold text-sm flex items-center gap-2">
                  <Upload size={18} /> Upload New Master
                  <input type="file" className="hidden" accept=".csv,.xlsx" onChange={handleRvuDbUpload} />
                </label>
                <button onClick={resetToDefault} className="px-5 py-2.5 rounded-lg border-2 text-slate-500 font-bold text-sm hover:bg-slate-50">Restore Master</button>
              </div>
            </div>

            <div className="bg-emerald-50/50 border border-emerald-100 rounded-xl p-6 shadow-sm">
               <div className="flex items-center gap-2 mb-4">
                 <Bookmark className="text-emerald-600" size={18} />
                 <h3 className="text-sm font-black text-emerald-800 uppercase tracking-widest">GS Verification Highlights</h3>
               </div>
               <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                 <div className="bg-white p-3 rounded-lg border border-emerald-200 flex items-center justify-between shadow-sm">
                   <div className="flex flex-col">
                     <span className="text-[10px] font-bold text-slate-400 uppercase leading-none mb-1">CPT 77067</span>
                     <span className="text-xs font-bold text-slate-700 truncate max-w-[180px]">{mammoVerification?.description || 'Mammo Screening'}</span>
                   </div>
                   <div className="bg-emerald-600 text-white px-3 py-1.5 rounded-md font-black text-sm shadow-sm">
                     {mammoVerification?.rvu.toFixed(2) || '0.00'}
                   </div>
                 </div>
                 <div className="bg-white p-3 rounded-lg border border-emerald-200 flex items-center justify-between shadow-sm">
                   <div className="flex flex-col">
                     <span className="text-[10px] font-bold text-slate-400 uppercase leading-none mb-1">CPT 70498</span>
                     <span className="text-xs font-bold text-slate-700 truncate max-w-[180px]">{ctNeckVerification?.description || 'CT Angio Neck'}</span>
                   </div>
                   <div className="bg-emerald-600 text-white px-3 py-1.5 rounded-md font-black text-sm shadow-sm">
                     {ctNeckVerification?.rvu.toFixed(2) || '0.00'}
                   </div>
                 </div>
               </div>
            </div>

            <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
              <div className="p-3 bg-slate-50 border-b flex justify-between"><span className="text-[10px] font-black text-slate-400 uppercase">{rvuDatabase.length} Catalogued Items</span><div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} /><input type="text" placeholder="Search Master..." value={dbSearch} onChange={(e) => setDbSearch(e.target.value)} className="pl-9 pr-3 py-1.5 border rounded-lg text-xs" /></div></div>
              <div className="max-h-[500px] overflow-y-auto"><table className="w-full text-left"><thead className="bg-white sticky top-0 border-b z-10"><tr className="text-slate-400 text-[9px] font-black uppercase"><th className="px-6 py-3">CPT</th><th className="px-6 py-3">Description</th><th className="px-6 py-3 text-right">RVU</th></tr></thead><tbody className="divide-y">{rvuDatabase.filter(item => (item.cpt || '').includes(dbSearch) || item.description.toLowerCase().includes(dbSearch.toLowerCase())).map((item, idx) => (<tr key={idx} className="hover:bg-slate-50/50"><td className="px-6 py-3 font-mono text-xs text-blue-600 font-bold">{item.cpt || '-'}</td><td className="px-6 py-3 text-xs font-semibold text-slate-700">{item.description}</td><td className="px-6 py-3 text-xs font-black text-slate-900 text-right">{item.rvu.toFixed(2)}</td></tr>))}</tbody></table></div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

function TabButton({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string }) {
  return (<button onClick={onClick} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${active ? 'bg-white text-blue-600 shadow-sm ring-1 ring-slate-100' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'}`}>{icon} {label}</button>);
}

function MetricCard({ label, value, subValue, icon, color }: { label: string, value: string, subValue: React.ReactNode, icon: React.ReactNode, color: 'blue' | 'emerald' }) {
  const textClass = color === 'blue' ? 'text-blue-600' : 'text-emerald-600';
  const iconBg = color === 'blue' ? 'bg-blue-50 text-blue-600' : 'bg-emerald-50 text-emerald-600';
  return (
    <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4 relative overflow-hidden group">
      <div className={`w-12 h-12 ${iconBg} rounded-xl flex items-center justify-center shadow-inner transition-transform group-hover:scale-110 duration-300`}>{icon}</div>
      <div className="relative z-10 flex-1"><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">{label}</p><p className={`text-2xl font-black tracking-tighter ${textClass}`}>{value}</p><div className="mt-1">{subValue}</div></div>
    </div>
  );
}
