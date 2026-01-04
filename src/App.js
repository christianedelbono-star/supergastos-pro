import React, { useState, useEffect, useMemo, useRef } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, doc, setDoc, getDoc, collection, onSnapshot, updateDoc, deleteDoc, writeBatch } from 'firebase/firestore';
import { Camera, LayoutDashboard, History, TrendingUp, ChevronDown, Loader2, Sparkles, BarChart3, Store, Plus, X, Edit2, BrainCircuit, Trash2, LineChart as LineChartIcon, CheckCircle2, Calendar, AlertCircle, Filter, Download, Upload, Database, Info, ChevronLeft, ChevronRight, Table as TableIcon, FileUp, FileDown, Tag } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

// CONFIGURACIÓN DE SEGURIDAD PARA VERCEL
const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const apiKey = process.env.REACT_APP_GEMINI_KEY; 
const appId = 'supergastos-pro-v1';

// ... RESTO DEL CÓDIGO DEL COMPONENTE APP QUE TE PASÉ ANTES ...
