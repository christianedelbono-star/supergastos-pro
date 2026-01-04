import React, { useState, useEffect, useMemo, useRef } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, doc, setDoc, collection, onSnapshot, deleteDoc } from 'firebase/firestore';
import { Camera, LayoutDashboard, History, TrendingUp, ChevronDown, Loader2, BarChart3, Store, Plus, Tag, BrainCircuit } from 'lucide-react';

const firebaseConfig = {
  apiKey: "AIzaSyDKkQANWKusdHwHBM2GWKtuEnqX6nyYMDA",
  authDomain: "supergastospro-ee07c.firebaseapp.com",
  projectId: "supergastospro-ee07c",
  storageBucket: "supergastospro-ee07c.firebasestorage.app",
  messagingSenderId: "751737648890",
  appId: "1:751737648890:web:be5ea154d582d070d83b43"
};

const GEMINI_KEY = "AIzaSyDo2xJTP5D355ZR8xXKwPLd1ErhXc6xn2Y";

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
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      if (u) setUser(u);
      else await signInAnonymously(auth);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;
    const ticketsCol = collection(db, 'users', user.uid, 'tickets');
    return onSnapshot(ticketsCol, (snap) => {
      setTickets(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
  }, [user]);

  const analyzeTicket = async (base64) => {
    setIsScanning(true);
    try {
      const resp = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: "Extrae: store, items: [{name, quantity, price}]. Devuelve solo JSON." }, { inlineData: { mimeType: "image/jpeg", data: base64.split(',')[1] } }] }]
        })
      });
      const res = await resp.json();
      const data = JSON.parse(res.candidates[0].content.parts[0].text.replace(/```json|```/g, ''));
      
      const total = data.items.reduce((acc, i) => acc + (i.price * i.quantity), 0);
      await setDoc(doc(collection(db, 'users', user.uid, 'tickets')), {
        date: new Date().toISOString(),
        store: data.store,
        items: data.items,
        total
      });
      setView('history');
    } catch (e) {
      alert("Error leyendo ticket");
    } finally {
      setIsScanning(false);
    }
  };

  const totalSpent = useMemo(() => tickets.reduce((acc, t) => acc + t.total, 0), [tickets]);

  return (
    <div className="min-h-screen bg-slate-50 pb-24 font-sans">
      <input type="file" ref={fileInputRef} className="hidden" onChange={(e) => {
        const reader = new FileReader();
        reader.onload = () => analyzeTicket(reader.result);
        reader.readAsDataURL(e.target.files[0]);
      }} />

      <header className="p-6 bg-white border-b flex justify-between items-center">
        <h1 className="font-black text-xl text-blue-600">SUPERGASTOS PRO</h1>
        <button onClick={() => fileInputRef.current.click()} className="bg-blue-600 text-white p-2 rounded-lg"><Camera size={20}/></button>
      </header>

      <main className="p-6">
        {view === 'dashboard' && (
          <div className="space-y-4">
            <div className="bg-slate-900 text-white p-8 rounded-3xl text-center">
              <p className="text-xs opacity-50 uppercase mb-1">Gasto Total</p>
              <h2 className="text-5xl font-black">${totalSpent.toFixed(2)}</h2>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white p-6 rounded-2xl border shadow-sm">
                <p className="text-xs text-slate-400 uppercase">Tickets</p>
                <p className="text-2xl font-black">{tickets.length}</p>
              </div>
              <div className="bg-white p-6 rounded-2xl border shadow-sm">
                <p className="text-xs text-slate-400 uppercase">Tiendas</p>
                <p className="text-2xl font-black">{new Set(tickets.map(t => t.store)).size}</p>
              </div>
            </div>
          </div>
        )}

        {view === 'history' && (
          <div className="space-y-4">
            {tickets.map(t => (
              <div key={t.id} className="bg-white p-4 rounded-xl border flex justify-between items-center">
                <div>
                  <p className="font-bold uppercase text-sm">{t.store}</p>
                  <p className="text-[10px] text-slate-400">{new Date(t.date).toLocaleDateString()}</p>
                </div>
                <p className="font-black text-blue-600">${t.total.toFixed(2)}</p>
              </div>
            ))}
          </div>
        )}
      </main>

      {isScanning && (
        <div className="fixed inset-0 bg-white/90 z-50 flex flex-col items-center justify-center">
          <Loader2 className="animate-spin text-blue-600 mb-4" size={48} />
          <p className="font-black text-blue-600">LA IA ESTÁ LEYENDO TU TICKET...</p>
        </div>
      )}

      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t p-4 flex justify-around items-center">
        <button onClick={() => setView('dashboard')}><LayoutDashboard className={view === 'dashboard' ? 'text-blue-600' : 'text-slate-300'} /></button>
        <button onClick={() => setView('history')}><History className={view === 'history' ? 'text-blue-600' : 'text-slate-300'} /></button>
        <button onClick={() => setView('stats')}><BarChart3 className={view === 'stats' ? 'text-blue-600' : 'text-slate-300'} /></button>
      </nav>
    </div>
  );
              }
    
