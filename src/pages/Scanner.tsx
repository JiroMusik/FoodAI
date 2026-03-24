import { useState, useRef, useCallback, useEffect } from 'react';
import Webcam from 'react-webcam';
import { Camera, X, Check, Loader2, RefreshCw, Barcode, Search, AlertCircle, ScanText, Plus } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { Html5Qrcode } from 'html5-qrcode';
import Tesseract from 'tesseract.js';

export default function Scanner() {
  const webcamRef = useRef<Webcam>(null);
  const [image, setImage] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [isScanning, setIsScanning] = useState(true);
  const [isScanningMhd, setIsScanningMhd] = useState(false);
  const [isPhotoMode, setIsPhotoMode] = useState(false);
  const [saved, setSaved] = useState(false);
  const [facingMode, setFacingMode] = useState<string>("environment");
  const [lastDetectedBarcode, setLastDetectedBarcode] = useState<string | null>(null);
  const scannerRef = useRef<HTMLDivElement>(null);
  const html5ScannerRef = useRef<Html5Qrcode | null>(null);
  const isProcessingRef = useRef(false);
  const navigate = useNavigate();

  // Barcode Detection with html5-qrcode
  useEffect(() => {
    if (!isScanning || isScanningMhd) return;

    const scannerElementId = "html5-barcode-scanner";
    let scanner: Html5Qrcode | null = null;

    const startScanner = async () => {
      try {
        scanner = new Html5Qrcode(scannerElementId);
        html5ScannerRef.current = scanner;

        await scanner.start(
          { facingMode: "environment" },
          {
            fps: 10,
            qrbox: { width: 280, height: 280 },
            aspectRatio: 1.0,
          },
          (decodedText) => {
            if (!isProcessingRef.current) {
              isProcessingRef.current = true;
              console.log("Barcode detected:", decodedText);
              handleBarcodeDetected(decodedText);
              scanner?.stop().catch(() => {});
            }
          },
          () => { /* ignore scan failures */ }
        );
      } catch (err) {
        console.error("html5-qrcode start error:", err);
        // Retry with user-facing camera
        try {
          await scanner?.start(
            { facingMode: "user" },
            { fps: 10, qrbox: { width: 280, height: 280 } },
            (decodedText) => {
              if (!isProcessingRef.current) {
                isProcessingRef.current = true;
                handleBarcodeDetected(decodedText);
                scanner?.stop().catch(() => {});
              }
            },
            () => {}
          );
        } catch (err2) {
          console.error("html5-qrcode fallback error:", err2);
        }
      }
    };

    // Small delay to ensure DOM element exists
    const timer = setTimeout(startScanner, 300);

    return () => {
      clearTimeout(timer);
      if (scanner && scanner.isScanning) {
        scanner.stop().catch(() => {});
      }
      html5ScannerRef.current = null;
    };
  }, [isScanning, isScanningMhd]);

  const [existingItem, setExistingItem] = useState<any>(null);

  const handleBarcodeDetected = async (barcode: string) => {
    setIsScanning(false);
    setAnalyzing(true);
    setLastDetectedBarcode(barcode);
    try {
      const res = await fetch(`/api/barcode/lookup/${barcode}`);
      if (res.ok) {
        const data = await res.json();
        const quantity = data.pieces_per_pack || data.default_quantity || 1;
        setResult({ ...data, quantity, barcode });
        
        // Check if item already exists in inventory
        const invRes = await fetch('/api/inventory');
        if (invRes.ok) {
          const invData = await invRes.json();
          const existing = invData.find((i: any) => i.barcode === barcode || i.name === data.name);
          if (existing && existing.quantity > 0) {
            setExistingItem(existing);
          }
        }

        toast.success('Produkt gefunden!');
      } else {
        toast.error('Barcode nicht gefunden. Mache ein Foto für die KI!');
        setIsScanning(true);
        isProcessingRef.current = false;
      }
    } catch (error) {
      console.error('Barcode lookup error:', error);
      setIsScanning(true);
      isProcessingRef.current = false;
    } finally {
      setAnalyzing(false);
    }
  };

  const capture = useCallback(() => {
    const imageSrc = webcamRef.current?.getScreenshot();
    if (imageSrc) {
      if (isScanningMhd) {
        setIsScanningMhd(false);
        analyzeMhd(imageSrc);
      } else {
        setImage(imageSrc);
        setIsScanning(false);
        analyzeImage(imageSrc);
      }
    }
  }, [webcamRef, isScanningMhd]);

  const analyzeMhd = async (base64: string) => {
    setAnalyzing(true);
    try {
      const { data: { text } } = await Tesseract.recognize(base64, 'deu');
      console.log("OCR Text:", text);
      
      // Improved date patterns: DD.MM.YYYY, DD/MM/YY, DD MM 2024, etc.
      // Also handles common OCR misreadings (e.g., 'O' for '0')
      const cleanText = text.replace(/[Oo]/g, '0').replace(/[IilL]/g, '1');
      const dateMatch = cleanText.match(/(\d{1,2})[.\/\s\-](\d{1,2})[.\/\s\-](\d{2,4})/);
      
      if (dateMatch) {
        let [_, day, month, year] = dateMatch;
        day = day.padStart(2, '0');
        month = month.padStart(2, '0');
        if (year.length === 2) year = '20' + year;
        const dateStr = `${year}-${month}-${day}`;
        setResult((prev: any) => ({ ...prev, expiry_date: dateStr }));
        toast.success(`MHD erkannt: ${day}.${month}.${year}`);
      } else {
        // Fallback to AI if local OCR fails
        console.log("Local OCR failed to find date, trying AI fallback...");
        const res = await fetch('/api/scan/mhd', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ imageBase64: base64 })
        });
        
        if (res.ok) {
          const data = await res.json();
          if (data.expiry_date) {
            setResult((prev: any) => ({ ...prev, expiry_date: data.expiry_date }));
            toast.success(`MHD via KI erkannt: ${data.expiry_date}`);
          } else {
            toast.error('MHD nicht erkannt. Bitte manuell eintragen.');
          }
        } else {
          toast.error('Kein Datum gefunden. Bitte manuell eintragen.');
        }
      }
    } catch (error) {
      toast.error('Fehler bei der Texterkennung.');
    } finally {
      setAnalyzing(false);
    }
  };

  const analyzeImage = async (base64: string) => {
    setAnalyzing(true);
    setResult(null);
    setExistingItem(null);
    try {
      const res = await fetch('/api/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: base64 })
      });
      
      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`Server-Fehler (${res.status}): ${errorText || 'Unbekannter Fehler'}`);
      }

      const data = await res.json();
      setResult({ ...data, barcode: lastDetectedBarcode });

      // Check if item already exists in inventory
      const invRes = await fetch('/api/inventory');
      if (invRes.ok) {
        const invData = await invRes.json();
        const existing = invData.find((i: any) => i.name === data.name);
        if (existing && existing.quantity > 0) {
          setExistingItem(existing);
        }
      }

    } catch (error: any) {
      console.error('Scan error:', error);
      toast.error(`Bildanalyse fehlgeschlagen: ${error.message}`);
      setResult({
        name: '',
        quantity: 1,
        unit: 'Stück',
        category: 'Sonstiges',
        expiry_date: null,
        barcode: lastDetectedBarcode
      });
    } finally {
      setAnalyzing(false);
    }
  };

  const handleSave = async () => {
    if (!result) return;
    try {
      const payload = { ...result };
      const res = await fetch('/api/inventory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error('Save failed');
      toast.success('Artikel gespeichert');
      setSaved(true);
    } catch (error) {
      toast.error('Fehler beim Speichern');
    }
  };

  const handleSaveAnother = async () => {
    if (!result) return;
    try {
      const res = await fetch('/api/inventory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...result })
      });
      if (!res.ok) throw new Error('Save failed');
      toast.success('Weitere Packung gespeichert');
    } catch (error) {
      toast.error('Fehler beim Speichern');
    }
  };

  const retake = () => {
    setImage(null);
    setResult(null);
    setExistingItem(null);
    setLastDetectedBarcode(null);
    setIsScanning(true);
    setIsScanningMhd(false);
    setIsPhotoMode(false);
    setSaved(false);
    isProcessingRef.current = false;
  };

  return (
    <div className="h-full flex flex-col bg-black overflow-hidden">
      {(!image && !result) || isScanningMhd || isPhotoMode ? (
        <div className="relative flex-1 flex flex-col">
          <div className="flex-1 relative overflow-hidden">
            {(isScanningMhd || isPhotoMode) ? (
              <Webcam
                audio={false}
                ref={webcamRef}
                screenshotFormat="image/jpeg"
                videoConstraints={{ facingMode }}
                onUserMediaError={() => setFacingMode("user")}
                className="w-full h-full object-cover"
              />
            ) : (
              <div id="html5-barcode-scanner" style={{width: '100%', height: '100%', minHeight: '100vh'}} />
            )}

            {/* Overlay controls */}
            <div className="absolute inset-0 flex flex-col items-center justify-between py-12 pointer-events-none" style={{zIndex: 10}}>
              <div className="bg-black/40 backdrop-blur-md px-6 py-3 rounded-full flex items-center space-x-3 border border-white/10">
                <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                <p className="text-white text-sm font-semibold tracking-wide">
                  {isScanningMhd ? 'MHD fotografieren' : isPhotoMode ? 'KI-Erkennung' : 'Barcode-Scan aktiv'}
                </p>
              </div>

              <div />

              <div className="flex flex-col items-center space-y-6 pointer-events-auto">
                <div className="text-center space-y-2">
                  <p className="text-white font-medium">
                    {isScanningMhd ? 'MHD im Rahmen platzieren' : isPhotoMode ? 'Produkt fotografieren' : 'Barcode im Rahmen platzieren'}
                  </p>
                </div>

                {/* Camera button — always visible */}
                <button
                  onClick={async () => {
                    if (isScanningMhd) {
                      capture();
                      return;
                    }
                    // Stop barcode scanner, grab frame directly from html5-qrcode
                    const scanner = html5ScannerRef.current;
                    if (scanner && scanner.isScanning) {
                      try {
                        // Capture current frame as base64 before stopping
                        const canvas = document.querySelector('#html5-barcode-scanner video') as HTMLVideoElement;
                        if (canvas) {
                          const c = document.createElement('canvas');
                          c.width = canvas.videoWidth;
                          c.height = canvas.videoHeight;
                          c.getContext('2d')!.drawImage(canvas, 0, 0);
                          const base64 = c.toDataURL('image/jpeg', 0.9);
                          await scanner.stop().catch(() => {});
                          setIsScanning(false);
                          setImage(base64);
                          analyzeImage(base64);
                          return;
                        }
                      } catch (e) { console.error('Frame capture error:', e); }
                    }
                    // Fallback: switch to webcam mode
                    if (scanner?.isScanning) await scanner.stop().catch(() => {});
                    setIsScanning(false);
                    setIsPhotoMode(true);
                  }}
                  className="group relative w-24 h-24 flex items-center justify-center active:scale-90 transition-transform"
                >
                  <div className="absolute inset-0 bg-white/10 rounded-full scale-110 group-hover:bg-white/20 transition-colors"></div>
                  <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-2xl">
                    <div className="w-16 h-16 border-4 border-emerald-500 rounded-full flex items-center justify-center">
                      <Camera className="text-emerald-500" size={32} />
                    </div>
                  </div>
                </button>

                {!isScanningMhd && (
                  <div className="flex flex-col items-center gap-2">
                    <p className="text-white/50 text-xs">Foto-Button = KI-Erkennung</p>
                    <button
                      onClick={() => {
                        const code = prompt('Barcode manuell eingeben:');
                        if (code) handleBarcodeDetected(code);
                      }}
                      className="text-emerald-400 text-xs font-bold hover:text-emerald-300 underline"
                    >
                      Barcode manuell eingeben
                    </button>
                  </div>
                )}

                {(isScanningMhd || isPhotoMode) && (
                  <button
                    onClick={() => { setIsScanningMhd(false); setIsPhotoMode(false); setIsScanning(true); }}
                    className="absolute top-6 right-6 w-12 h-12 bg-black/40 hover:bg-black/60 rounded-full flex items-center justify-center text-white backdrop-blur-md transition-colors"
                  >
                    <X size={24} />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col bg-gray-50 overflow-hidden">
          <div className="relative h-1/3 min-h-[240px] flex-shrink-0">
            {image ? (
              <img src={image} alt="Scanned" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-emerald-600 flex flex-col items-center justify-center text-white p-8 text-center">
                <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mb-6 backdrop-blur-sm">
                  <Barcode size={40} className="text-white" />
                </div>
                <h3 className="text-2xl font-bold mb-2">Produkt erkannt</h3>
                <p className="text-emerald-100 text-sm opacity-80">Daten wurden automatisch geladen</p>
              </div>
            )}
            <button 
              onClick={retake}
              className="absolute top-6 left-6 w-12 h-12 bg-black/40 hover:bg-black/60 rounded-full flex items-center justify-center text-white backdrop-blur-md transition-colors"
            >
              <X size={24} />
            </button>
          </div>
          
          <div className="flex-1 p-8 bg-white rounded-t-[40px] -mt-10 relative z-10 shadow-[0_-15px_40px_rgba(0,0,0,0.08)] overflow-y-auto">
            {analyzing ? (
              <div className="h-full flex flex-col items-center justify-center space-y-6">
                <div className="relative">
                  <Loader2 className="animate-spin text-emerald-600" size={48} />
                  <div className="absolute inset-0 bg-emerald-100 rounded-full blur-xl opacity-20 animate-pulse"></div>
                </div>
                <p className="text-gray-500 font-semibold text-lg">Analysiere Produkt...</p>
              </div>
            ) : result ? (
              <div className="space-y-8 pb-8">
                <div className="flex items-center justify-between border-b border-gray-100 pb-4">
                  <h2 className="text-2xl font-bold text-gray-900">Details</h2>
                  {result.barcode && (
                    <div className="flex items-center space-x-2 bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-100">
                      <Barcode size={14} className="text-gray-400" />
                      <span className="text-xs font-mono font-bold text-gray-500">
                        {result.barcode}
                      </span>
                    </div>
                  )}
                </div>
                
                <div className="space-y-6">
                  <div className="group">
                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 group-focus-within:text-emerald-500 transition-colors">Produktname</label>
                    <input 
                      type="text" 
                      value={result.name || ''} 
                      onChange={e => setResult({...result, name: e.target.value})}
                      className="w-full border-b-2 border-gray-100 py-3 focus:border-emerald-500 focus:outline-none text-xl font-semibold transition-colors"
                      placeholder="z.B. Iglo Fischstäbchen"
                    />
                    <p className="text-[10px] text-gray-400 mt-1 italic">Tipp: Identische Namen werden im Vorrat automatisch zusammengeführt.</p>
                  </div>
                  
                  <div className="flex space-x-6">
                    <div className="flex-1 group">
                      <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 group-focus-within:text-emerald-500 transition-colors">Menge</label>
                      <input 
                        type="number" 
                        value={result.quantity || ''} 
                        onChange={e => setResult({...result, quantity: Number(e.target.value)})}
                        className="w-full border-b-2 border-gray-100 py-3 focus:border-emerald-500 focus:outline-none text-xl font-semibold transition-colors"
                      />
                    </div>
                    <div className="flex-1 group">
                      <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 group-focus-within:text-emerald-500 transition-colors">Einheit</label>
                      <select 
                        value={result.unit || 'Stück'} 
                        onChange={e => setResult({...result, unit: e.target.value})}
                        className="w-full border-b-2 border-gray-100 py-3 focus:border-emerald-500 focus:outline-none text-xl font-semibold bg-transparent transition-colors"
                      >
                        <option value="Stück">Stück</option>
                        <option value="g">Gramm (g)</option>
                        <option value="kg">Kilogramm (kg)</option>
                        <option value="ml">Milliliter (ml)</option>
                        <option value="l">Liter (l)</option>
                        <option value="%">Füllstand (%)</option>
                      </select>
                    </div>
                  </div>

                  {result.unit === 'Packung' && (
                    <div className="group animate-in slide-in-from-top-2">
                      <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 group-focus-within:text-emerald-500 transition-colors">Stück pro Packung (optional)</label>
                      <input 
                        type="number" 
                        placeholder="z.B. 15"
                        value={result.pieces_per_pack || ''} 
                        onChange={e => setResult({...result, pieces_per_pack: Number(e.target.value)})}
                        className="w-full border-b-2 border-gray-100 py-3 focus:border-emerald-500 focus:outline-none text-xl font-semibold transition-colors"
                      />
                      <p className="text-[10px] text-gray-400 mt-1 italic">Hilft bei der genauen Bestandsführung von Einzelteilen.</p>
                    </div>
                  )}

                  <div className="group">
                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 group-focus-within:text-emerald-500 transition-colors">Kategorie</label>
                    <select 
                      value={result.category || 'Sonstiges'} 
                      onChange={e => setResult({...result, category: e.target.value})}
                      className="w-full border-b-2 border-gray-100 py-3 focus:border-emerald-500 focus:outline-none text-xl font-semibold bg-transparent transition-colors"
                    >
                      <option value="Obst & Gemüse">Obst & Gemüse</option>
                      <option value="Kühlregal">Kühlregal</option>
                      <option value="Tiefkühl">Tiefkühl</option>
                      <option value="Vorratsschrank">Vorratsschrank</option>
                      <option value="Getränke">Getränke</option>
                      <option value="Backwaren">Backwaren</option>
                      <option value="Fleisch & Fisch">Fleisch & Fisch</option>
                      <option value="Snacks & Süßigkeiten">Snacks & Süßigkeiten</option>
                      <option value="Gewürze & Saucen">Gewürze & Saucen</option>
                      <option value="Haushalt & Drogerie">Haushalt & Drogerie</option>
                      <option value="Sonstiges">Sonstiges</option>
                    </select>
                  </div>

                  <div className="group">
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest group-focus-within:text-emerald-500 transition-colors">Haltbarkeit</label>
                      {!result.expiry_date && (
                        <button 
                          onClick={() => setIsScanningMhd(true)}
                          className="flex items-center space-x-1 text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg hover:bg-emerald-100 transition-colors"
                        >
                          <ScanText size={14} />
                          <span>MHD scannen</span>
                        </button>
                      )}
                    </div>
                    <input 
                      type="date" 
                      value={result.expiry_date || ''} 
                      onChange={e => setResult({...result, expiry_date: e.target.value})}
                      className="w-full border-b-2 border-gray-100 py-3 focus:border-emerald-500 focus:outline-none text-xl font-semibold transition-colors"
                    />
                  </div>
                </div>

                {saved ? (
                  <div className="flex flex-col gap-3 pt-6">
                    <button
                      onClick={handleSaveAnother}
                      className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-bold flex items-center justify-center space-x-2 shadow-xl shadow-emerald-100 hover:bg-emerald-700 transition-all active:scale-95"
                    >
                      <Plus size={20} />
                      <span>Gleiche Packung nochmal</span>
                    </button>
                    <button
                      onClick={retake}
                      className="w-full py-4 bg-gray-100 text-gray-700 rounded-2xl font-bold flex items-center justify-center space-x-2 hover:bg-gray-200 transition-colors"
                    >
                      <Camera size={20} />
                      <span>Neuen Artikel scannen</span>
                    </button>
                    <button
                      onClick={() => navigate('/inventory')}
                      className="w-full py-3 text-emerald-600 font-bold text-sm hover:underline"
                    >
                      Zum Vorrat →
                    </button>
                  </div>
                ) : (
                  <div className="flex space-x-4 pt-6">
                    <button
                      onClick={retake}
                      className="flex-1 py-5 bg-gray-50 text-gray-600 rounded-2xl font-bold flex items-center justify-center space-x-2 hover:bg-gray-100 transition-colors"
                    >
                      <RefreshCw size={20} />
                      <span>Abbrechen</span>
                    </button>
                    <button
                      onClick={() => handleSave()}
                      className="flex-1 py-5 bg-emerald-600 text-white rounded-2xl font-bold flex items-center justify-center space-x-2 shadow-xl shadow-emerald-100 hover:bg-emerald-700 transition-all active:scale-95"
                    >
                      <Check size={20} />
                      <span>Speichern</span>
                    </button>
                  </div>
                )}
              </div>
            ) : null}
          </div>
        </div>
      )}
      
      <style>{`
        @keyframes scan {
          0% { top: 0; }
          100% { top: 100%; }
        }
        .animate-scan {
          animation: scan 2.5s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}
