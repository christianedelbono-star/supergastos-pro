import React, { useState, useEffect, useMemo, useRef } from 'react';
import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  signInAnonymously, 
  onAuthStateChanged, 
  signInWithCustomToken 
} from 'firebase/auth';
import { 
  getFirestore, 
  doc, 
  setDoc, 
  getDoc, 
  collection, 
  onSnapshot, 
  updateDoc,
  deleteDoc,
  writeBatch,
  query
} from 'firebase/firestore';
import { 
  Camera, 
  LayoutDashboard, 
  History, 
  TrendingUp, 
  ChevronDown,
  Loader2, 
  Sparkles,
  BarChart3,
  Store,
  Plus,
  X,
  Edit2,
  BrainCircuit,
  Trash2,
  LineChart as LineChartIcon,
  CheckCircle2,
  Calendar,
  AlertCircle,
  Filter,
  Download,
  Upload,
  Database,
  Info,
  ChevronLeft,
  ChevronRight,
  Table as TableIcon,
  Maximize2,
  FileUp,
  FileDown,
  Tag
} from 'lucide-react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Legend,
  Cell
} from 'recharts';

// Configuración de Firebase y constantes globales
const firebaseConfig = JSON.parse(__firebase_config);
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = typeof __app_id !== 'undefined' ? __app_id : 'supergastos-ultimate-v1';
const apiKey = ""; 

const CATEGORIES = [
  'Lácteos', 'Panadería', 'Frutas y Verduras', 'Carnicería', 
  'Limpieza y Hogar', 'Higiene', 'Bebidas', 'Congelados y Preparados', 
  'Despensa y Secos', 'Snacks', 'Especias y Condimentos', 'Mascotas', 'Postres', 'Dulce' ,  'Otros'
];

const MONTHS = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
];

const CustomTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    const isMultiple = data.compras && data.compras.length > 1;

    return (
      <div className="bg-slate-900 text-white p-4 rounded-2xl shadow-2xl border border-slate-700 min-w-[220px]">
        <div className="flex justify-between items-center mb-3 border-b border-slate-700 pb-2">
           <p className="font-bold text-[10px] opacity-70 uppercase tracking-widest">{data.fecha}</p>
           {isMultiple && <span className="bg-orange-500 text-[8px] px-2 py-0.5 rounded-full font-black uppercase">Múltiple</span>}
        </div>
        
        <div className="space-y-4">
          {data.compras.map((compra, idx) => (
            <div key={idx} className={idx !== 0 ? "pt-3 border-t border-slate-800" : ""}>
              <div className="flex items-center gap-2 mb-1">
                <Store size={10} className="text-blue-400" />
                <p className="font-black uppercase text-[10px] text-blue-400 leading-tight">{compra.tienda}</p>
              </div>
              <div className="flex items-start gap-2 mb-1 opacity-80">
                <Tag size={10} className="text-slate-400 shrink-0 mt-0.5" />
                <p className="text-[9px] font-bold text-slate-300 leading-tight italic break-words">{compra.nombreOriginal}</p>
              </div>
              <p className="text-sm font-black text-emerald-400">${compra.precio.toFixed(2)}</p>
            </div>
          ))}
        </div>
      </div>
    );
  }
  return null;
};

const CustomizedDot = (props) => {
  const { cx, cy, payload } = props;
  const isMultiple = payload.compras && payload.compras.length > 1;
  return (
    <circle 
      cx={cx} 
      cy={cy} 
      r={isMultiple ? 7 : 5} 
      fill={isMultiple ? "#f97316" : "#2563eb"} 
      stroke="#fff" 
      strokeWidth={2} 
    />
  );
};

export default function App() {
  const [user, setUser] = useState(null);
  const [view, setView] = useState('dashboard');
  const [statsSubView, setStatsSubView] = useState('categories'); 
  const [timeFilterMode, setTimeFilterMode] = useState('month'); 
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [tickets, setTickets] = useState([]);
  const [dictionary, setDictionary] = useState({}); 
  const [isScanning, setIsScanning] = useState(false);
  const [scanStep, setScanStep] = useState(0); 
  const [expandedTicketId, setExpandedTicketId] = useState(null);
  const [expandedCategories, setExpandedCategories] = useState({});
  const [editingDictItem, setEditingDictItem] = useState(null); 
  const [feedback, setFeedback] = useState(null);
  const [selectedAliasForTrend, setSelectedAliasForTrend] = useState(null);
  const [expandedYearlyCat, setExpandedYearlyCat] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const fileInputRef = useRef(null);
  const importInputRef = useRef(null);

  // EFECTO 1: Autenticación (REGLA 3)
  useEffect(() => {
    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
      } catch (err) {
        console.error("Error en auth:", err);
      }
    };
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      if (u) setIsLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // EFECTO 2: Sincronización con Firestore (REGLAS 1 y 2)
  useEffect(() => {
    if (!user) return;

    // Recuperar tickets de la nube (Ruta específica según REGLA 1)
    const ticketsCol = collection(db, 'artifacts', appId, 'users', user.uid, 'tickets');
    const unsubscribeTickets = onSnapshot(ticketsCol, (snap) => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setTickets(data);
    }, (err) => {
      console.error("Error recuperando tickets:", err);
      showFeedback("Error al conectar con la nube");
    });

    // Recuperar diccionario/configuración
    const dictDoc = doc(db, 'artifacts', appId, 'users', user.uid, 'settings', 'dictionary');
    const unsubscribeDict = onSnapshot(dictDoc, (docSnap) => {
      if (docSnap.exists()) setDictionary(docSnap.data());
    }, (err) => console.error("Error dict:", err));

    return () => { 
      unsubscribeTickets(); 
      unsubscribeDict(); 
    };
  }, [user]);

  // Lógica de visualización y cálculos
  const getDisplayName = (originalName) => dictionary[originalName]?.alias || originalName;
  const getCategory = (originalName) => dictionary[originalName]?.category || 'Otros';
  
  const totalSpent = useMemo(() => tickets.reduce((acc, t) => acc + t.total, 0), [tickets]);

  const uniqueAliases = useMemo(() => {
    const aliases = new Set();
    Object.values(dictionary).forEach(val => aliases.add(val.alias));
    return Array.from(aliases).sort();
  }, [dictionary]);

  const availableYears = useMemo(() => {
    const years = new Set([new Date().getFullYear()]);
    tickets.forEach(t => years.add(new Date(t.date).getFullYear()));
    return Array.from(years).sort((a,b) => b - a);
  }, [tickets]);

  const filteredTickets = useMemo(() => {
    return tickets.filter(t => {
      const ticketDate = new Date(t.date);
      if (timeFilterMode === 'month') {
        return ticketDate.getMonth() === selectedMonth && ticketDate.getFullYear() === selectedYear;
      }
      if (timeFilterMode === 'year') {
        return ticketDate.getFullYear() === selectedYear;
      }
      return true;
    });
  }, [tickets, timeFilterMode, selectedMonth, selectedYear]);

  const statsByCategory = useMemo(() => {
    const categories = {};
    filteredTickets.forEach(t => {
      t.items.forEach(item => {
        const cat = getCategory(item.name);
        const alias = getDisplayName(item.name);
        if (!categories[cat]) categories[cat] = { total: 0, items: {} };
        const itemTotal = (item.price * item.quantity);
        categories[cat].total += itemTotal;
        if (!categories[cat].items[alias]) categories[cat].items[alias] = 0;
        categories[cat].items[alias] += itemTotal;
      });
    });
    return Object.entries(categories).sort((a, b) => b[1].total - a[1].total);
  }, [filteredTickets, dictionary]);

  const yearlyAnalysis = useMemo(() => {
    const data = { matrix: {}, details: {} };
    tickets.forEach(t => {
      const date = new Date(t.date);
      if (date.getFullYear() !== selectedYear) return;
      const monthIdx = date.getMonth();
      t.items.forEach(item => {
        const cat = getCategory(item.name);
        const alias = getDisplayName(item.name);
        const itemTotal = (item.price * item.quantity);
        if (!data.matrix[cat]) data.matrix[cat] = new Array(12).fill(0);
        data.matrix[cat][monthIdx] += itemTotal;
        if (!data.details[cat]) data.details[cat] = {};
        if (!data.details[cat][alias]) data.details[cat][alias] = new Array(12).fill(0);
        data.details[cat][alias][monthIdx] += itemTotal;
      });
    });
    return data;
  }, [tickets, selectedYear, dictionary]);

  const priceTrendData = useMemo(() => {
    if (!selectedAliasForTrend) return [];
    const rawPoints = [];
    tickets.forEach(t => {
      t.items.forEach(item => {
        if (getDisplayName(item.name) === selectedAliasForTrend) {
          rawPoints.push({
            fecha: new Date(t.date).toLocaleDateString(),
            timestamp: new Date(t.date).setHours(0,0,0,0),
            precio: item.price,
            tienda: t.store,
            nombreOriginal: item.name
          });
        }
      });
    });
    const groupedMap = rawPoints.reduce((acc, point) => {
      if (!acc[point.timestamp]) {
        acc[point.timestamp] = { fecha: point.fecha, timestamp: point.timestamp, totalPrecio: 0, compras: [] };
      }
      acc[point.timestamp].totalPrecio += point.precio;
      acc[point.timestamp].compras.push({ 
        tienda: point.tienda, 
        precio: point.precio, 
        nombreOriginal: point.nombreOriginal 
      });
      return acc;
    }, {});
    return Object.values(groupedMap)
      .map(group => ({ ...group, precio: group.totalPrecio / group.compras.length }))
      .sort((a, b) => a.timestamp - b.timestamp);
  }, [tickets, selectedAliasForTrend, dictionary]);

  const showFeedback = (msg) => {
    setFeedback(msg);
    setTimeout(() => setFeedback(null), 3000);
  };

  const toggleCategory = (cat) => {
    setExpandedCategories(prev => ({ ...prev, [cat]: !prev[cat] }));
  };

  const exportData = () => {
    const data = {
      tickets,
      dictionary,
      exportedAt: new Date().toISOString(),
      appId
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `supergastos_backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    showFeedback("Backup generado con éxito");
  };

  const importData = async (e) => {
    const file = e.target.files[0];
    if (!file || !user) return;
    
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const imported = JSON.parse(event.target.result);
        if (!imported.tickets || !imported.dictionary) throw new Error("Formato inválido");

        const dictDocRef = doc(db, 'artifacts', appId, 'users', user.uid, 'settings', 'dictionary');
        await setDoc(dictDocRef, imported.dictionary);

        const batch = writeBatch(db);
        imported.tickets.forEach(t => {
          const { id, ...ticketData } = t;
          const ref = doc(collection(db, 'artifacts', appId, 'users', user.uid, 'tickets'), id || undefined);
          batch.set(ref, ticketData);
        });
        await batch.commit();

        showFeedback("Base de datos importada con éxito");
        setView('dashboard');
      } catch (err) {
        showFeedback("Error al importar el archivo");
        console.error(err);
      }
    };
    reader.readAsText(file);
    e.target.value = ''; 
  };

  const updateDictionaryItem = async (originalName, newData) => {
    if (!user) return;
    const dictDocRef = doc(db, 'artifacts', appId, 'users', user.uid, 'settings', 'dictionary');
    await setDoc(dictDocRef, { [originalName]: newData }, { merge: true });
    setEditingDictItem(null);
    showFeedback("Diccionario actualizado");
  };

  const deleteTicket = async (id) => {
    if (!user || !confirm("¿Eliminar este ticket permanentemente?")) return;
    await deleteDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'tickets', id));
    showFeedback("Ticket eliminado");
  };

  const analyzeTicket = async (base64) => {
    setScanStep(2);
    try {
      const systemPrompt = `Eres un experto en tickets de supermercado. Extrae la información estructurada: 1. store, 2. items: [{originalName, quantity, unitPrice, lineTotal, suggestedAlias, suggestedCategory}]. Devuelve SOLO JSON. Categorías válidas: ${CATEGORIES.join(', ')}`;
      const resp = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: systemPrompt }, { inlineData: { mimeType: "image/jpeg", data: base64.split(',')[1] } }] }],
          generationConfig: { responseMimeType: "application/json" }
        })
      });
      const res = await resp.json();
      const text = res.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) throw new Error("No se pudo procesar");
      const data = JSON.parse(text);
      
      // Actualizar diccionario
      const newDictEntries = {};
      data.items.forEach(item => {
        if (!dictionary[item.originalName]) {
          newDictEntries[item.originalName] = { 
            alias: item.suggestedAlias || item.originalName, 
            category: item.suggestedCategory || 'Otros' 
          };
        }
      });
      
      if (Object.keys(newDictEntries).length > 0) {
        const dictDocRef = doc(db, 'artifacts', appId, 'users', user.uid, 'settings', 'dictionary');
        await setDoc(dictDocRef, newDictEntries, { merge: true });
      }

      const sanitizedItems = data.items.map(item => ({
        name: item.originalName,
        quantity: parseFloat(item.quantity) || 1,
        price: parseFloat(item.unitPrice) || 0
      }));

      const total = sanitizedItems.reduce((acc, i) => acc + (i.price * i.quantity), 0);
      const ticketRef = doc(collection(db, 'artifacts', appId, 'users', user.uid, 'tickets'));
      await setDoc(ticketRef, { 
        date: new Date().toISOString(), 
        store: data.store || "Supermercado", 
        items: sanitizedItems, 
        total 
      });
      
      setView('history');
      showFeedback("Ticket guardado en la nube");
    } catch (e) {
      showFeedback("Error procesando imagen");
    } finally {
      setIsScanning(false);
      setScanStep(0);
    }
  };

  const handleFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setIsScanning(true);
    setScanStep(1);
    const r = new FileReader();
    r.onload = () => analyzeTicket(r.result);
    r.readAsDataURL(file);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center space-y-4">
        <Loader2 size={48} className="text-blue-600 animate-spin" />
        <p className="text-xs font-black uppercase text-slate-400 tracking-widest">Conectando con la nube...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 pb-32 font-sans overflow-x-hidden transition-all">
      <input type="file" ref={fileInputRef} onChange={handleFile} className="hidden" accept="image/*" />
      <input type="file" ref={importInputRef} onChange={importData} className="hidden" accept=".json" />

      {feedback && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[100] bg-slate-900 text-white px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top-4">
          <CheckCircle2 size={18} className="text-emerald-400" />
          <span className="text-xs font-black uppercase tracking-widest">{feedback}</span>
        </div>
      )}

      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-xl border-b border-slate-100 px-4 md:px-8 py-4">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 p-2 rounded-xl shadow-lg">
              <TrendingUp className="text-white" size={20} />
            </div>
            <h1 className="text-lg md:text-xl font-black tracking-tighter uppercase">SuperGastos <span className="hidden sm:inline text-blue-600">AI PRO</span></h1>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden md:flex flex-col items-end">
              <p className="text-[8px] font-black text-slate-400 uppercase">Usuario Cloud</p>
              <p className="text-[10px] font-bold text-blue-600 truncate max-w-[120px]">{user?.uid}</p>
            </div>
            <button onClick={() => setView('scan')} className="hidden md:flex bg-slate-900 text-white px-5 py-2 rounded-xl text-xs font-black uppercase items-center gap-2 hover:bg-slate-800 transition-all shadow-md">
              <Camera size={16}/> Escanear
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-4 md:p-8">
        
        {view === 'dashboard' && (
          <div className="space-y-6 animate-in fade-in max-w-4xl mx-auto">
            <div className="bg-white p-8 md:p-12 rounded-[2.5rem] shadow-xl shadow-slate-200 border border-white text-center">
              <p className="text-[10px] md:text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Gasto Total Acumulado</p>
              <h2 className="text-5xl md:text-7xl font-black text-slate-800 tracking-tighter">${totalSpent.toLocaleString(undefined, {minimumFractionDigits: 2})}</h2>
              {tickets.length === 0 && (
                <div className="mt-6 flex flex-col items-center gap-2 text-slate-400">
                  <AlertCircle size={20} />
                  <p className="text-[10px] font-bold uppercase">No hay tickets cargados aún</p>
                </div>
              )}
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="bg-slate-900 p-8 rounded-[2rem] text-white shadow-lg">
                <p className="text-xs font-black uppercase opacity-60 mb-3">Tickets Guardados</p>
                <div className="flex justify-between items-center">
                  <span className="text-4xl font-black">{tickets.length}</span>
                  <div className="p-3 bg-white/10 rounded-2xl"><History size={24} className="text-blue-400" /></div>
                </div>
              </div>
              <div className="bg-blue-600 p-8 rounded-[2rem] text-white shadow-lg">
                <p className="text-xs font-black uppercase opacity-60 mb-3">Items Únicos</p>
                <div className="flex justify-between items-center">
                  <span className="text-4xl font-black">{uniqueAliases.length}</span>
                  <div className="p-3 bg-white/10 rounded-2xl"><LineChartIcon size={24} className="text-blue-200" /></div>
                </div>
              </div>
              <div className="bg-emerald-500 p-8 rounded-[2rem] text-white shadow-lg sm:col-span-2 lg:col-span-1">
                <p className="text-xs font-black uppercase opacity-60 mb-3">Categorías Usadas</p>
                <div className="flex justify-between items-center">
                  <span className="text-4xl font-black">{Object.keys(statsByCategory).length}</span>
                  <div className="p-3 bg-white/10 rounded-2xl"><LayoutDashboard size={24} className="text-emerald-100" /></div>
                </div>
              </div>
            </div>
          </div>
        )}

        {view === 'history' && (
          <div className="max-w-5xl mx-auto space-y-4 animate-in fade-in">
            <h2 className="text-2xl font-black uppercase tracking-tight mb-6 px-2">Historial de Compras</h2>
            {tickets.length === 0 ? (
               <div className="bg-white rounded-[2.5rem] p-12 text-center border border-slate-100 shadow-sm">
                  <History size={48} className="text-slate-200 mx-auto mb-4" />
                  <p className="text-sm font-black text-slate-400 uppercase tracking-widest">Tu historial está vacío</p>
                  <button onClick={() => setView('scan')} className="mt-6 text-blue-600 font-black uppercase text-xs hover:underline">Escanear mi primer ticket</button>
               </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {tickets.sort((a,b) => new Date(b.date) - new Date(a.date)).map(t => (
                  <div key={t.id} className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden h-fit">
                    <div className="p-5 flex justify-between items-center group cursor-pointer" onClick={() => setExpandedTicketId(expandedTicketId === t.id ? null : t.id)}>
                      <div className="flex items-center gap-4">
                        <div className="bg-slate-50 p-3 rounded-xl text-slate-400 group-hover:bg-blue-50 group-hover:text-blue-600 transition-all"><Store size={20} /></div>
                        <div>
                          <p className="font-black text-sm text-slate-800 uppercase">{t.store}</p>
                          <p className="text-[10px] text-slate-400 font-bold uppercase">{new Date(t.date).toLocaleDateString()}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <p className="text-lg font-black text-blue-600">${t.total.toFixed(2)}</p>
                        <ChevronDown size={18} className={`text-slate-300 transition-transform ${expandedTicketId === t.id ? 'rotate-180' : ''}`} />
                      </div>
                    </div>
                    {expandedTicketId === t.id && (
                      <div className="px-5 pb-5 pt-2 border-t border-slate-50 space-y-3">
                        {t.items.map((item, idx) => (
                          <div key={idx} className="flex justify-between items-center p-3 bg-slate-50 rounded-2xl">
                            <div className="flex-1">
                              <p className="text-xs font-black text-blue-600 uppercase">{getDisplayName(item.name)}</p>
                              <p className="text-[9px] font-bold text-slate-400 uppercase">x{item.quantity} @ ${item.price.toFixed(2)}</p>
                            </div>
                            <p className="text-xs font-black text-slate-900">${(item.price * item.quantity).toFixed(2)}</p>
                          </div>
                        ))}
                        <button onClick={() => deleteTicket(t.id)} className="w-full mt-4 py-3 bg-red-50 text-red-500 rounded-xl text-[10px] font-black uppercase flex items-center justify-center gap-2 hover:bg-red-100 transition-all">
                          <Trash2 size={14} /> Eliminar Ticket
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {view === 'stats' && (
          <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in">
            <div className="bg-white p-2 rounded-[1.5rem] flex gap-2 shadow-sm border border-slate-100 max-w-2xl mx-auto">
              {['categories', 'prices', 'yearly'].map((sub) => (
                <button 
                  key={sub}
                  onClick={() => setStatsSubView(sub)} 
                  className={`flex-1 py-3 text-[10px] md:text-xs font-black uppercase rounded-xl transition-all ${statsSubView === sub ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-50'}`}
                >
                  {sub === 'categories' ? 'Categorías' : sub === 'prices' ? 'Tendencias' : 'Análisis Anual'}
                </button>
              ))}
            </div>

            {statsSubView === 'categories' && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                <div className="lg:col-span-4 space-y-6">
                  <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm space-y-6">
                    <h3 className="text-xs font-black uppercase text-slate-400 tracking-widest border-b pb-4">Filtros de Tiempo</h3>
                    <div className="flex flex-col gap-3">
                      {['month', 'year', 'all'].map(mode => (
                        <button key={mode} onClick={() => setTimeFilterMode(mode)} className={`w-full py-3 px-4 rounded-xl text-xs font-black uppercase transition-all flex justify-between items-center ${timeFilterMode === mode ? 'bg-blue-600 text-white' : 'bg-slate-50 text-slate-500'}`}>
                          {mode === 'month' ? 'Mensual' : mode === 'year' ? 'Anual' : 'Todo el Tiempo'}
                          {timeFilterMode === mode && <CheckCircle2 size={14}/>}
                        </button>
                      ))}
                    </div>

                    {timeFilterMode !== 'all' && (
                      <div className="space-y-4 pt-4 border-t">
                        {timeFilterMode === 'month' && (
                          <select value={selectedMonth} onChange={(e) => setSelectedMonth(parseInt(e.target.value))} className="w-full bg-slate-50 border-none rounded-xl text-xs font-black uppercase text-blue-600 py-3">
                            {MONTHS.map((m, i) => <option key={m} value={i}>{m}</option>)}
                          </select>
                        )}
                        <select value={selectedYear} onChange={(e) => setSelectedYear(parseInt(e.target.value))} className="w-full bg-slate-50 border-none rounded-xl text-xs font-black uppercase text-blue-600 py-3">
                          {availableYears.map(y => <option key={y} value={y}>{y}</option>)}
                        </select>
                      </div>
                    )}
                  </div>
                </div>

                <div className="lg:col-span-8 space-y-4">
                  <div className="bg-blue-600 p-8 rounded-[2.5rem] text-white shadow-xl flex justify-between items-center">
                    <div>
                      <p className="text-[10px] font-black uppercase opacity-60">Gasto en Selección</p>
                      <h3 className="text-4xl font-black">${statsByCategory.reduce((a,b) => a + b[1].total, 0).toFixed(2)}</h3>
                    </div>
                    <BarChart3 size={40} className="opacity-20" />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {statsByCategory.map(([cat, data]) => (
                      <div key={cat} className="bg-white rounded-[2rem] border border-slate-100 overflow-hidden shadow-sm hover:border-blue-200 transition-all group">
                        <div onClick={() => toggleCategory(cat)} className="p-6 flex justify-between items-center cursor-pointer">
                          <span className="text-[11px] font-black uppercase tracking-widest text-slate-500 group-hover:text-blue-600">{cat}</span>
                          <span className="text-lg font-black text-slate-800">${data.total.toFixed(0)}</span>
                        </div>
                        {expandedCategories[cat] && (
                          <div className="px-6 pb-6 space-y-2 animate-in slide-in-from-top-2">
                            {Object.entries(data.items).sort((a,b) => b[1] - a[1]).slice(0, 5).map(([alias, total]) => (
                              <div key={alias} className="flex justify-between items-center text-[10px] font-bold text-slate-400">
                                <span className="uppercase">{alias}</span>
                                <span className="text-slate-600">${total.toFixed(2)}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {statsSubView === 'prices' && (
              <div className="max-w-4xl mx-auto space-y-8">
                <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
                  <p className="text-[10px] font-black uppercase text-slate-400 mb-4 px-2">Seleccionar Producto</p>
                  <select className="w-full p-4 bg-slate-50 border-none rounded-2xl text-sm font-black uppercase text-blue-600 focus:ring-2 focus:ring-blue-100 transition-all" value={selectedAliasForTrend || ""} onChange={(e) => setSelectedAliasForTrend(e.target.value)}>
                    <option value="">Buscar en el catálogo...</option>
                    {uniqueAliases.map(alias => <option key={alias} value={alias}>{alias}</option>)}
                  </select>
                </div>

                {selectedAliasForTrend && (
                  <div className="bg-white p-8 rounded-[3rem] border border-slate-100 shadow-xl h-[400px] md:h-[500px]">
                    <h4 className="text-xs font-black uppercase text-slate-400 mb-8 flex items-center gap-2">
                      <TrendingUp size={16} className="text-blue-600"/> Evolución Histórica: {selectedAliasForTrend}
                    </h4>
                    <ResponsiveContainer width="100%" height="85%">
                      <LineChart data={priceTrendData}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="fecha" fontSize={10} tick={{fill: '#94a3b8', fontWeight: 700}} axisLine={false} tickLine={false} dy={10} />
                        <YAxis fontSize={10} tick={{fill: '#94a3b8', fontWeight: 700}} axisLine={false} tickLine={false} tickFormatter={(v) => `$${v}`} />
                        <Tooltip content={<CustomTooltip />} />
                        <Line type="monotone" dataKey="precio" stroke="#2563eb" strokeWidth={5} dot={<CustomizedDot />} animationDuration={1500} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>
            )}

            {statsSubView === 'yearly' && (
              <div className="space-y-12 animate-in zoom-in-95">
                <div className="bg-slate-900 rounded-[2.5rem] p-8 text-white flex flex-col md:flex-row items-center justify-between gap-6 shadow-2xl">
                  <div className="flex items-center gap-4">
                    <div className="bg-blue-600 p-4 rounded-2xl"><Calendar size={32}/></div>
                    <div>
                      <h3 className="text-2xl font-black uppercase tracking-tighter">Resumen Anual</h3>
                      <p className="text-xs font-bold text-blue-400 uppercase tracking-widest">Balance y evolución por meses</p>
                    </div>
                  </div>
                  <select value={selectedYear} onChange={(e) => setSelectedYear(parseInt(e.target.value))} className="w-full md:w-48 bg-white/10 border-white/20 rounded-2xl text-xl font-black uppercase text-white py-3 px-6 hover:bg-white/20 transition-all">
                    {availableYears.map(y => <option key={y} value={y} className="text-slate-900">{y}</option>)}
                  </select>
                </div>

                <div className="space-y-6">
                  <div className="flex items-center justify-between px-4">
                    <div className="flex items-center gap-3">
                      <TableIcon size={20} className="text-blue-500" />
                      <h3 className="text-sm font-black uppercase tracking-widest text-slate-800">Matriz de Gasto Mensual</h3>
                    </div>
                  </div>

                  <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-xl overflow-hidden group">
                    <div className="overflow-x-auto custom-scrollbar">
                      <table className="w-full text-left border-collapse min-w-[1000px]">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-100">
                            <th className="p-6 text-[10px] font-black text-slate-400 uppercase sticky left-0 bg-slate-50 z-20 border-r border-slate-100">Categoría</th>
                            {MONTHS.map(m => (
                              <th key={m} className="p-4 text-[10px] font-black text-slate-400 uppercase text-center border-r border-slate-100 last:border-0">{m}</th>
                            ))}
                            <th className="p-6 text-[10px] font-black text-blue-600 uppercase text-right sticky right-0 bg-slate-50 z-20 border-l border-slate-100">Total</th>
                          </tr>
                        </thead>
                        <tbody>
                          {Object.entries(yearlyAnalysis.matrix).sort((a,b) => b[1].reduce((x,y)=>x+y, 0) - a[1].reduce((x,y)=>x+y, 0)).map(([cat, monthlyVals]) => (
                            <tr key={cat} className="border-b border-slate-50 hover:bg-blue-50/30 transition-colors group">
                              <td className="p-6 text-xs font-black text-slate-700 uppercase sticky left-0 bg-white group-hover:bg-blue-50/50 transition-colors z-10 border-r border-slate-100 shadow-[2px_0_5px_rgba(0,0,0,0.02)]">{cat}</td>
                              {monthlyVals.map((val, idx) => (
                                <td key={idx} className={`p-4 text-xs font-bold text-center border-r border-slate-50 last:border-0 ${val > 0 ? 'text-slate-900 bg-white/30' : 'text-slate-200'}`}>
                                  {val > 0 ? `$${val.toLocaleString(undefined, {maximumFractionDigits: 0})}` : '-'}
                                </td>
                              ))}
                              <td className="p-6 text-xs font-black text-blue-600 text-right bg-blue-50/20 sticky right-0 z-10 border-l border-slate-100 shadow-[-2px_0_5px_rgba(0,0,0,0.02)]">
                                ${monthlyVals.reduce((a,b)=>a+b, 0).toLocaleString(undefined, {maximumFractionDigits: 0})}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {view === 'dictionary' && (
          <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in">
             <div className="flex flex-col md:flex-row justify-between items-start md:items-end px-2 gap-4">
                <div>
                  <h2 className="text-2xl font-black uppercase tracking-tight">Catálogo y Datos</h2>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Gestión de productos y base de datos</p>
                </div>
                <div className="flex gap-2 w-full md:w-auto">
                  <button 
                    onClick={exportData}
                    className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-slate-900 text-white px-4 py-2.5 rounded-xl text-[10px] font-black uppercase hover:bg-slate-800 transition-all shadow-md"
                  >
                    <FileDown size={14} /> Exportar
                  </button>
                  <button 
                    onClick={() => importInputRef.current.click()}
                    className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-blue-600 text-white px-4 py-2.5 rounded-xl text-[10px] font-black uppercase hover:bg-blue-500 transition-all shadow-md"
                  >
                    <FileUp size={14} /> Importar
                  </button>
                </div>
            </div>

            <div className="bg-blue-50/50 border border-blue-100 p-4 rounded-2xl flex items-start gap-3 mb-4">
              <Info size={18} className="text-blue-500 shrink-0 mt-0.5" />
              <div className="text-[10px] font-bold text-blue-700 leading-relaxed uppercase">
                <p>Sesión activa como: <span className="font-black underline">{user?.uid}</span></p>
                <p className="mt-1">Tus datos están sincronizados en la nube de Google Cloud.</p>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Object.entries(dictionary).map(([original, data]) => (
                <div key={original} className={`p-6 rounded-[2rem] border transition-all ${editingDictItem === original ? 'bg-white border-blue-600 ring-4 ring-blue-50 shadow-2xl' : 'bg-white border-slate-100 shadow-sm'}`}>
                  {editingDictItem === original ? (
                    <div className="space-y-4">
                      <div className="flex justify-between items-start mb-2">
                        <p className="text-[10px] font-black text-slate-400 uppercase italic">Editando: {original}</p>
                        <button onClick={() => setEditingDictItem(null)} className="text-slate-300 hover:text-red-500"><X size={20}/></button>
                      </div>
                      <input 
                        type="text" 
                        autoFocus
                        defaultValue={data.alias} 
                        onBlur={(e) => updateDictionaryItem(original, { ...data, alias: e.target.value })}
                        className="w-full p-4 bg-slate-50 rounded-2xl text-sm font-black border-none ring-2 ring-transparent focus:ring-blue-600 transition-all uppercase"
                        placeholder="Nombre Amigable"
                      />
                      <div className="flex flex-wrap gap-2 pt-2">
                        {CATEGORIES.map(c => (
                          <button 
                            key={c}
                            onClick={() => updateDictionaryItem(original, { ...data, category: c })}
                            className={`px-3 py-2 rounded-xl text-[9px] font-black uppercase transition-all ${data.category === c ? 'bg-blue-600 text-white shadow-lg' : 'bg-slate-50 text-slate-400 hover:bg-slate-100'}`}
                          >
                            {c}
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="flex justify-between items-center">
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] font-black text-slate-400 uppercase opacity-60 truncate">{original}</p>
                        <div className="flex items-center gap-3 mt-1">
                          <p className="text-sm font-black text-slate-800 uppercase truncate">{data.alias}</p>
                          <span className="bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full text-[8px] font-black uppercase whitespace-nowrap">{data.category}</span>
                        </div>
                      </div>
                      <div className="flex gap-2 shrink-0 ml-4">
                        <button onClick={() => setEditingDictItem(original)} className="p-3 text-slate-300 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all">
                            <Edit2 size={16} />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {view === 'scan' && (
          <div className="max-w-xl mx-auto flex flex-col items-center justify-center py-12 md:py-24 space-y-8 animate-in zoom-in-95">
             <div 
               onClick={() => !isScanning && fileInputRef.current.click()}
               className={`w-full aspect-square max-w-[400px] rounded-[4rem] border-4 border-dashed flex flex-col items-center justify-center transition-all cursor-pointer ${isScanning ? 'border-blue-500 bg-blue-50' : 'border-slate-200 hover:border-blue-500 hover:bg-blue-50 shadow-inner'}`}
             >
                {isScanning ? (
                  <div className="text-center p-8">
                    <Loader2 className="animate-spin text-blue-600 mx-auto mb-6" size={64} />
                    <p className="text-sm font-black uppercase text-blue-600 tracking-widest animate-pulse">{scanStep === 1 ? 'Subiendo Imagen...' : 'Analizando con IA...'}</p>
                    <p className="text-[10px] text-slate-400 uppercase mt-4">Esto puede tardar unos segundos</p>
                  </div>
                ) : (
                  <div className="text-center space-y-6 p-8">
                    <div className="bg-blue-600 p-10 rounded-[3rem] text-white shadow-2xl mx-auto w-fit transform hover:scale-105 transition-transform">
                      <Camera size={56} />
                    </div>
                    <div>
                      <h3 className="text-xl font-black uppercase text-slate-800">Cargar Ticket</h3>
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-2">Sube una foto clara del recibo</p>
                    </div>
                  </div>
                )}
             </div>
          </div>
        )}

      </main>

      <nav className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[90%] max-w-lg bg-white/90 backdrop-blur-2xl border border-white/40 shadow-2xl rounded-[2.5rem] p-4 flex justify-between items-center z-50">
        <button onClick={() => setView('dashboard')} className={`p-3 transition-all rounded-2xl ${view === 'dashboard' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-300 hover:text-slate-600'}`}><LayoutDashboard size={24} /></button>
        <button onClick={() => setView('history')} className={`p-3 transition-all rounded-2xl ${view === 'history' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-300 hover:text-slate-600'}`}><History size={24} /></button>
        <button onClick={() => setView('scan')} className="bg-slate-900 text-white w-16 h-16 rounded-3xl flex items-center justify-center -mt-16 border-[8px] border-[#F8FAFC] shadow-xl hover:bg-blue-600 transition-colors transform hover:rotate-90"><Plus size={32} /></button>
        <button onClick={() => setView('stats')} className={`p-3 transition-all rounded-2xl ${view === 'stats' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-300 hover:text-slate-600'}`}><BarChart3 size={24} /></button>
        <button onClick={() => setView('dictionary')} className={`p-3 transition-all rounded-2xl ${view === 'dictionary' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-300 hover:text-slate-600'}`}><BrainCircuit size={24} /></button>
      </nav>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          height: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #f8fafc;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #e2e8f0;
          border-radius: 20px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #cbd5e1;
        }
      `}</style>
    </div>
  );
}

