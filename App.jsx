import React, { useState, useEffect, useRef } from 'react';
import { initializeApp } from "firebase/app";
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, signOut } from 'firebase/auth';
import { getFirestore, doc, setDoc, collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { Camera, LayoutDashboard, History, TrendingUp, Loader2, Plus, LogOut } from 'lucide-react';

const firebaseConfig = {
  apiKey: "AIzaSyDKkQANWKusdHwHBM2GWKtuEnqX6nyYMDA",
  authDomain: "supergastospro-ee07c.firebaseapp.com",
  projectId: "supergastospro-ee07c",
  storageBucket: "supergastospro-ee07c.firebasestorage.app",
  messagingSenderId: "751737648890",
  appId: "1:751737648890:web:be5ea154d582d070d83b43"
};

const GEMINI_API_KEY = "AIzaSyDo2xJTP5D355ZR8xXKwPLd1ErhXc6xn2Y";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

export default function App() {
  const [user, setUser] = useState(null);
  const [view, setView] = useState('dashboard');
  const [tickets, setTickets] = useState([]);
  const [isScanning, setIsScanning] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    return onAuthStateChanged(auth, (u) => setUser(u));
  }, []);

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'users', user.uid, 'tickets'), orderBy('date', 'desc'));
    return onSnapshot(q, (snap) => {
      setTickets(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
  }, [user]);

  const analyzeTicket = async (base64) => {
    setIsScanning(true);
    try {
      const prompt = "Analiza este ticket. Devuelve SOLO un JSON con: { \"store\": \"nombre\", \"items\": [{\"name\": \"producto\", \"quantity\": 1, \"price\": 0.0}] }";
      const resp = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }, { inlineData: { mimeType: "image/jpeg", data: base64.split(',')[1] } }] }]
        })
      });
      const data = await resp.json();
      const result = JSON.parse(data.candidates[0].content.parts[0].text.replace(/```json|```/g, ''));

      const newRef = doc(collection(db, 'users', user.uid, 'tickets'));
      const total = result.items.reduce((acc, i) => acc + (i.price * i.quantity), 0);
      await setDoc(newRef, { date: new Date().toISOString(), store: result.store, items: result.items, total });
      setView('history');
    } catch (err) {
      alert("Error procesando ticket. Asegúrate de que la foto sea clara.");
    } finally {
      setIsScanning(false);
    }
  };

  if (!user) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
      <div className="bg-white p-10 rounded-[2rem] shadow-xl text-center border border-slate-100 max-w-sm w-full">
        <TrendingUp className="text-blue-600 mx-auto mb-6" size={48} />
        <h1 className="text-2xl font-black mb-8 uppercase tracking-tighter text-slate-800">SuperGastos PRO</h1>
        <button onClick={() => signInWithPopup(auth, new GoogleAuthProvider())} className="w-full flex items-center justify-center gap-3 bg-slate-900 text-white px-6 py-4 rounded-xl font-bold text-xs uppercase hover:bg-slate-800 transition-all">
          <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-4" alt=""/>
          Entrar con Google
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-24 font-sans">
      <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={(e) => {
        const file = e.target.files[0];
        if(!file) return;
        const reader = new FileReader();
        reader.onload = () => analyzeTicket(reader.result);
        reader.readAsDataURL(file);
      }} />

      <header className="p-6 flex justify-between items-center bg-white border-b border-slate-100 shadow-sm sticky top-0 z-10">
        <div className="flex items-center gap-2">
          <TrendingUp className="text-blue-600" size={24} />
          <span className="font-black uppercase tracking-tighter">SuperGastos</span>
        </div>
        <button onClick={() => signOut(auth)} className="text-slate-400 hover:text-red-500"><LogOut size={20} /></button>
      </header>

      <main className="p-6 max-w-md mx-auto">
        {view === 'dashboard' && (
          <div className="space-y-6">
            <div className="bg-blue-600 p-10 rounded-[2.5rem] text-white shadow-xl shadow-blue-100">
              <p className="text-[10px] font-black uppercase opacity-60 mb-2">Total Gastado</p>
              <h2 className="text-5xl font-black">${tickets.reduce((a, b) => a + b.total, 0).toFixed(2)}</h2>
            </div>
            <div className="bg-white p-6 rounded-3xl border border-slate-100">
              <p className="text-[10px] font-black text-slate-400 uppercase mb-4">Últimos movimientos</p>
              {tickets.slice(0, 3).map(t => (
                <div key={t.id} className="flex justify-between py-2 border-b last:border-0">
                  <span className="text-xs font-bold uppercase">{t.store}</span>
                  <span className="text-xs font-black text-blue-600">${t.total.toFixed(2)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {view === 'history' && (
          <div className="space-y-4">
            {tickets.map(t => (
              <div key={t.id} className="bg-white p-5 rounded-3xl border border-slate-100 flex justify-between items-center shadow-sm">
                <div>
                  <p className="font-black text-xs uppercase text-slate-800">{t.store}</p>
                  <p className="text-[10px] text-slate-400 font-bold">{new Date(t.date).toLocaleDateString()}</p>
                </div>
                <p className="font-black text-blue-600">${t.total.toFixed(2)}</p>
              </div>
            ))}
          </div>
        )}

        {isScanning && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex flex-col items-center justify-center z-50 p-6 text-center">
            <div className="bg-white p-8 rounded-[2rem] shadow-2xl flex flex-col items-center">
              <Loader2 className="animate-spin text-blue-600 mb-4" size={48} />
              <p className="font-black text-xs uppercase tracking-widest text-slate-800">IA Analizando Ticket...</p>
              <p className="text-[10px] text-slate-400 mt-2">Estamos extrayendo los precios y productos</p>
            </div>
          </div>
        )}
      </main>

      <nav className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-white/90 backdrop-blur-xl shadow-2xl rounded-full p-2 flex items-center gap-2 border border-white">
        <button onClick={() => setView('dashboard')} className={`p-4 rounded-full transition-all ${view === 'dashboard' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-300'}`}><LayoutDashboard size={20}/></button>
        <button onClick={() => fileInputRef.current.click()} className="bg-slate-900 text-white p-5 rounded-full shadow-xl active:scale-90 transition-all -mt-4 border-4 border-[#F8FAFC]"><Plus size={24}/></button>
        <button onClick={() => setView('history')} className={`p-4 rounded-full transition-all ${view === 'history' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-300'}`}><History size={20}/></button>
      </nav>
    </div>
  );
}
