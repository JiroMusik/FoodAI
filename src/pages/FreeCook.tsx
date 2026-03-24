import { useState, useRef, useCallback } from 'react';
import Webcam from 'react-webcam';
import { Camera, X, Check, Loader2, RefreshCw, ChefHat, Sparkles, Minus, Plus } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import OpenedItemsModal from '../components/OpenedItemsModal';
import { useTranslation } from 'react-i18next';

interface DetectedIngredient {
  id: number;
  name: string;
  unit: string;
  estimated_deduction: number;
  reasoning: string;
  available?: number;
}

export default function FreeCook() {
  const { t } = useTranslation();
  const webcamRef = useRef<Webcam>(null);
  const [image, setImage] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [ingredients, setIngredients] = useState<DetectedIngredient[]>([]);
  const [portions, setPortions] = useState(2);
  const [askingAdvice, setAskingAdvice] = useState(false);
  const [advice, setAdvice] = useState<string | null>(null);
  const [showOpenedModal, setShowOpenedModal] = useState(false);
  const [openedItems, setOpenedItems] = useState<any[]>([]);
  const navigate = useNavigate();

  const capture = useCallback(() => {
    const imageSrc = webcamRef.current?.getScreenshot();
    if (imageSrc) {
      setImage(imageSrc);
      analyzeImage(imageSrc);
    }
  }, [webcamRef]);

  const analyzeImage = async (base64: string) => {
    setAnalyzing(true);
    try {
      const res = await fetch('/api/cook/analyze-photo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: base64 })
      });

      if (!res.ok) throw new Error(t('freecook.analysisFailed'));

      const data = await res.json();

      // Fetch current inventory to get available amounts
      const invRes = await fetch('/api/inventory');
      const invData = await invRes.json();

      const enrichedIngredients = data.ingredients.map((ing: any) => {
        const invItem = invData.find((i: any) => i.id === ing.id);
        return {
          ...ing,
          available: invItem ? invItem.quantity : 0
        };
      });

      setIngredients(enrichedIngredients);
      if (enrichedIngredients.length === 0) {
        toast.error(t('freecook.noIngredientsFromInventory'));
      }
    } catch (error: any) {
      toast.error(error.message);
      setImage(null);
    } finally {
      setAnalyzing(false);
    }
  };

  const askForAdvice = async () => {
    if (ingredients.length === 0) return;
    setAskingAdvice(true);
    try {
      const res = await fetch('/api/cook/ask-amounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ingredients, portions })
      });
      if (!res.ok) throw new Error(t('freecook.tipFailed'));

      const data = await res.json();
      setAdvice(data.advice);

      // Update amounts based on suggestion
      setIngredients(prev => prev.map(ing => {
        const suggestion = data.amounts.find((a: any) => a.id === ing.id);
        if (suggestion) {
          return { ...ing, estimated_deduction: suggestion.suggested_amount };
        }
        return ing;
      }));
      toast.success(t('freecook.amountsAdjustedByAi'));
    } catch (error) {
      toast.error(t('freecook.errorGettingTip'));
    } finally {
      setAskingAdvice(false);
    }
  };

  const updateAmount = (id: number, amount: number) => {
    setIngredients(prev => prev.map(ing =>
      ing.id === id ? { ...ing, estimated_deduction: Math.max(0, amount) } : ing
    ));
  };

  const performDeduction = async (deductions: any[], openedUpdates: any[]) => {
    try {
      const res = await fetch('/api/cook/deduct', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deductions, openedUpdates })
      });

      if (!res.ok) throw new Error(t('freecook.deductionFailed'));

      const data = await res.json();

      toast.success(t('freecook.ingredientsDeductedSuccess'));
      navigate('/calendar');
    } catch (error) {
      toast.error(t('freecook.errorDeductingIngredients'));
    }
  };

  const handleCook = async () => {
    const deductions = ingredients.map(ing => ({
      id: ing.id,
      amount: ing.estimated_deduction
    })).filter(d => d.amount > 0);

    if (deductions.length === 0) {
      toast.error(t('freecook.noAmountsSelected'));
      return;
    }

    // Check for opened items
    try {
      const checkRes = await fetch('/api/cook/check-opened', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deductions })
      });

      if (checkRes.ok) {
        const checkData = await checkRes.json();
        if (checkData.updates && checkData.updates.length > 0) {
          // Filter only those that need new expiry
          const riskyItems = checkData.updates.filter((u: any) => u.needs_new_expiry);
          if (riskyItems.length > 0) {
            // Enrich with names
            const enrichedUpdates = riskyItems.map((u: any) => {
               const ing = ingredients.find(i => i.id === u.id);
               return { ...u, name: ing?.name || t('common.unknown') };
            });
            setOpenedItems(enrichedUpdates);
            setShowOpenedModal(true);
            return;
          }
        }
      }
    } catch (e) {
      console.error("Failed to check opened items", e);
    }

    performDeduction(deductions, []);
  };

  const handleConfirmOpened = (updates: any[]) => {
    setShowOpenedModal(false);
    const deductions = ingredients.map(ing => ({
      id: ing.id,
      amount: ing.estimated_deduction
    })).filter(d => d.amount > 0);
    performDeduction(deductions, updates);
  };

  const retake = () => {
    setImage(null);
    setIngredients([]);
    setAdvice(null);
  };

  return (
    <div className="h-full flex flex-col bg-gray-50 overflow-hidden pb-20">
      <OpenedItemsModal
        isOpen={showOpenedModal}
        items={openedItems}
        onConfirm={handleConfirmOpened}
        onCancel={() => {
          setShowOpenedModal(false);
          const deductions = ingredients.map(ing => ({
            id: ing.id,
            amount: ing.estimated_deduction
          })).filter(d => d.amount > 0);
          performDeduction(deductions, []);
        }}
      />
      <header className="bg-white px-4 py-4 border-b border-gray-100 flex items-center justify-between shadow-sm z-10">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center text-emerald-600">
            <ChefHat size={24} />
          </div>
          <h1 className="text-xl font-bold tracking-wider text-gray-900">{t('freecook.title')}</h1>
        </div>
        <button onClick={() => navigate(-1)} className="p-2 text-gray-400 hover:bg-gray-100 rounded-full transition-colors">
          <X size={24} />
        </button>
      </header>

      {!image ? (
        <div className="flex-1 relative bg-black">
          <Webcam
            audio={false}
            ref={webcamRef}
            screenshotFormat="image/jpeg"
            videoConstraints={{ facingMode: "environment" }}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 flex flex-col items-center justify-between py-12 pointer-events-none">
            <div className="bg-black/40 backdrop-blur-md px-6 py-3 rounded-full flex items-center space-x-3 border border-white/10">
              <p className="text-white text-sm font-semibold tracking-wide">{t('freecook.photographIngredients')}</p>
            </div>

            <button
              onClick={capture}
              className="group relative w-20 h-20 flex items-center justify-center active:scale-90 transition-transform pointer-events-auto"
            >
              <div className="absolute inset-0 bg-white/20 rounded-full scale-110 group-hover:bg-white/30 transition-colors"></div>
              <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-2xl">
                <Camera className="text-emerald-600" size={28} />
              </div>
            </button>
          </div>
        </div>
      ) : analyzing ? (
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-white">
          <div className="w-24 h-24 bg-emerald-50 rounded-full flex items-center justify-center mb-6 relative">
            <div className="absolute inset-0 border-4 border-emerald-200 rounded-full animate-ping opacity-20"></div>
            <Loader2 className="text-emerald-600 animate-spin" size={40} />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">{t('freecook.analyzingIngredients')}</h2>
          <p className="text-gray-500">{t('freecook.aiMatchingInventory')}</p>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          <div className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-900">{t('freecook.recognizedIngredients')}</h2>
              <button onClick={retake} className="text-emerald-600 text-sm font-bold flex items-center gap-1 bg-emerald-50 px-3 py-1.5 rounded-lg">
                <RefreshCw size={14} /> {t('freecook.rescan')}
              </button>
            </div>

            {ingredients.length > 0 ? (
              <div className="space-y-4">
                {ingredients.map((ing) => (
                  <div key={ing.id} className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h3 className="font-bold text-gray-900">{ing.name}</h3>
                        <p className="text-xs text-gray-500 mt-0.5">{t('common.available', { amount: ing.available, unit: ing.unit })}</p>
                      </div>
                      <span className="text-[10px] bg-white border border-gray-200 px-2 py-1 rounded-md text-gray-500 italic max-w-[120px] text-right line-clamp-2">
                        {ing.reasoning}
                      </span>
                    </div>

                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => updateAmount(ing.id, ing.estimated_deduction - (ing.unit === '%' ? 25 : 10))}
                        className="w-10 h-10 bg-white border border-gray-200 rounded-xl flex items-center justify-center text-gray-600 hover:bg-gray-50 active:scale-95"
                      >
                        <Minus size={18} />
                      </button>
                      <div className="flex-1 relative">
                        <input
                          type="number"
                          value={ing.estimated_deduction}
                          onChange={(e) => updateAmount(ing.id, Number(e.target.value))}
                          className="w-full bg-white border border-gray-200 rounded-xl py-2.5 text-center font-bold text-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 font-medium text-sm">{ing.unit}</span>
                      </div>
                      <button
                        onClick={() => updateAmount(ing.id, ing.estimated_deduction + (ing.unit === '%' ? 25 : 10))}
                        className="w-10 h-10 bg-white border border-gray-200 rounded-xl flex items-center justify-center text-gray-600 hover:bg-gray-50 active:scale-95"
                      >
                        <Plus size={18} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-4">{t('freecook.noIngredientsRecognized')}</p>
            )}
          </div>

          {ingredients.length > 0 && (
            <div className="bg-indigo-50 rounded-3xl p-5 border border-indigo-100">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2 text-indigo-900 font-bold">
                  <Sparkles size={20} className="text-indigo-500" />
                  {t('freecook.aiAmountAdvisor')}
                </div>
                <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border border-indigo-100">
                  <span className="text-xs font-bold text-indigo-400">{t('common.persons')}</span>
                  <input
                    type="number"
                    value={portions}
                    onChange={e => setPortions(Number(e.target.value))}
                    className="w-8 text-center font-bold text-indigo-900 outline-none bg-transparent"
                    min="1"
                  />
                </div>
              </div>

              {advice && (
                <div className="mb-4 p-3 bg-white rounded-xl text-sm text-indigo-800 border border-indigo-100">
                  {advice}
                </div>
              )}

              <button
                onClick={askForAdvice}
                disabled={askingAdvice}
                className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-indigo-700 transition-colors disabled:opacity-70"
              >
                {askingAdvice ? <Loader2 className="animate-spin" size={18} /> : <Sparkles size={18} />}
                <span>{t('freecook.getAmountTip')}</span>
              </button>
            </div>
          )}

          {ingredients.length > 0 && (
            <button
              onClick={handleCook}
              className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-bold text-lg shadow-xl shadow-emerald-100 hover:bg-emerald-700 transition-all active:scale-95 flex items-center justify-center gap-2"
            >
              <Check size={24} />
              {t('freecook.cookAndDeduct')}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
