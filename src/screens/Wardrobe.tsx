import React, { useState } from 'react';
import { UserProfile } from '../types';
import { RACCOON_OUTFITS, Outfit, getOutfitById } from '../data/outfits';
import { Mascot } from '../mascot/Mascot';
import { playSound } from '../services/sound';
import { Shield, Sparkles, Check, ArrowLeft, Lock, Info } from 'lucide-react';

interface WardrobeProps {
  userProfile: UserProfile;
  onUpdateProfile: (updated: UserProfile) => Promise<void>;
  onBack: () => void;
}

export const Wardrobe: React.FC<WardrobeProps> = ({
  userProfile,
  onUpdateProfile,
  onBack,
}) => {
  const [activeCategory, setActiveCategory] = useState<'all' | 'semplice' | 'medio' | 'elaborato'>('all');
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);

  const unlockedOutfits = userProfile.unlockedOutfits || ['base'];
  const activeOutfitId = userProfile.activeOutfit || 'base';
  const streakFreezes = userProfile.streakFreezes || 0;
  const currentAcorns = userProfile.totalAcorns || 0;

  const showNotification = (msg: string) => {
    setFeedbackMsg(msg);
    setTimeout(() => setFeedbackMsg(null), 3500);
  };

  const handleEquip = async (outfitId: string) => {
    if (outfitId === activeOutfitId) return;
    const outfit = getOutfitById(outfitId);
    const updated: UserProfile = {
      ...userProfile,
      activeOutfit: outfitId,
    };
    await onUpdateProfile(updated);
    playSound('correct');
    showNotification(`Hai indossato "${outfit.name}"! 🦝✨`);
  };

  const handleUnlock = async (outfit: Outfit) => {
    if (currentAcorns < outfit.cost) {
      showNotification('Ghiande insufficienti! Completa più esercizi per guadagnarne altre. 🌰');
      return;
    }

    const updatedUnlocked = Array.from(new Set([...unlockedOutfits, outfit.id]));
    const updated: UserProfile = {
      ...userProfile,
      totalAcorns: currentAcorns - outfit.cost,
      unlockedOutfits: updatedUnlocked,
      activeOutfit: outfit.id,
    };

    await onUpdateProfile(updated);
    playSound('levelAchieved');
    showNotification(`Hai sbloccato e indossato "${outfit.name}"! 🎉`);
  };

  const handleBuyStreakFreeze = async () => {
    const FREEZE_COST = 200;
    if (currentAcorns < FREEZE_COST) {
      showNotification('Ghiande insufficienti! Servono 200 🌰 per un Salvagente Streak.');
      return;
    }

    const updated: UserProfile = {
      ...userProfile,
      totalAcorns: currentAcorns - FREEZE_COST,
      streakFreezes: streakFreezes + 1,
    };

    await onUpdateProfile(updated);
    playSound('acorn');
    showNotification('🛡️ Salvagente Streak acquistato! Ora la tua serie è al sicuro.');
  };

  const filteredOutfits = RACCOON_OUTFITS.filter((o) => {
    if (activeCategory === 'all') return true;
    return o.category === activeCategory;
  });

  const activeOutfitObj = getOutfitById(activeOutfitId);

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
      {/* Top Bar Navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          id="btn-wardrobe-back"
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white border border-[#6B7C4F]/20 text-[#3A2B22] hover:bg-[#F2E8D5]/50 transition-colors text-sm font-medium shadow-sm"
        >
          <ArrowLeft className="w-4 h-4 text-[#6B7C4F]" />
          Torna alla Home
        </button>

        <div className="flex items-center gap-3">
          {/* Acorns Counter */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-[#FFF8EE] border border-[#D97706]/30 rounded-xl shadow-sm text-sm font-bold text-[#D97706]">
            <span>🌰</span>
            <span>{currentAcorns}</span>
            <span className="text-xs font-normal text-[#8A7A6A] hidden sm:inline">ghiande</span>
          </div>

          {/* Streak Freeze Badge */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-[#EEF6FF] border border-[#3B82F6]/30 rounded-xl shadow-sm text-sm font-bold text-[#2563EB]">
            <Shield className="w-4 h-4 text-[#2563EB]" />
            <span>{streakFreezes}</span>
            <span className="text-xs font-normal text-[#5B7B9C] hidden sm:inline">salvagente</span>
          </div>
        </div>
      </div>

      {/* Toast Feedback Message */}
      {feedbackMsg && (
        <div className="p-3 bg-[#6B7C4F] text-white rounded-xl shadow-md text-sm font-medium text-center animate-fade-in flex items-center justify-center gap-2">
          <Sparkles className="w-4 h-4 shrink-0" />
          <span>{feedbackMsg}</span>
        </div>
      )}

      {/* Hero Preview Card */}
      <div className="bg-gradient-to-br from-[#F5EFE6] to-[#EAE0D0] border border-[#6B7C4F]/20 rounded-3xl p-6 shadow-sm flex flex-col md:flex-row items-center gap-6">
        <div className="shrink-0 flex flex-col items-center">
          <Mascot activeOutfit={activeOutfitId} pose="greeting" size={150} />
          <span className="mt-2 text-xs font-semibold px-2.5 py-0.5 bg-[#6B7C4F]/10 text-[#54633E] rounded-full">
            In uso: {activeOutfitObj.name}
          </span>
        </div>

        <div className="flex-1 space-y-3 text-center md:text-left">
          <h1 className="text-2xl font-bold text-[#3A2B22]">Guardaroba del Procione 🦝👗</h1>
          <p className="text-sm text-[#6C5C4C] leading-relaxed">
            Spendi le ghiande guadagnate con lo studio per sbloccare vestiti e accessori per il tuo procione.
            Ogni outfit aggiunge un fantastico tocco di stile al tuo compagno d'avventura!
          </p>

          <div className="pt-2 flex flex-wrap items-center justify-center md:justify-start gap-3">
            <div className="text-xs text-[#8A7A6A] bg-white/70 px-3 py-1.5 rounded-xl border border-[#6B7C4F]/15 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-[#D97706]" />
              <span>{unlockedOutfits.length} su {RACCOON_OUTFITS.length} outfit sbloccati</span>
            </div>
          </div>
        </div>
      </div>

      {/* Streak Freeze Purchase Banner */}
      <div className="bg-white border border-[#3B82F6]/25 rounded-2xl p-4 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-[#EEF6FF] flex items-center justify-center shrink-0 border border-[#3B82F6]/20">
            <Shield className="w-5 h-5 text-[#2563EB]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-sm text-[#1E293B]">Salvagente Streak</h3>
              <span className="text-[10px] font-semibold px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full">Protezione</span>
            </div>
            <p className="text-xs text-[#64748B] mt-0.5">
              Protegge automaticamente la tua serie se salti un giorno di studio. (Posseduti: <strong>{streakFreezes}</strong>)
            </p>
          </div>
        </div>

        <button
          onClick={handleBuyStreakFreeze}
          disabled={currentAcorns < 200}
          id="btn-buy-streak-freeze"
          className={`shrink-0 px-4 py-2 rounded-xl font-medium text-xs sm:text-sm flex items-center gap-2 transition-all shadow-sm ${
            currentAcorns >= 200
              ? 'bg-[#2563EB] text-white hover:bg-[#1D4ED8] active:scale-95'
              : 'bg-gray-100 text-gray-400 border border-gray-200 cursor-not-allowed'
          }`}
        >
          <Shield className="w-4 h-4" />
          <span>Compra per 200 🌰</span>
        </button>
      </div>

      {/* Outfits Category Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        {[
          { id: 'all', label: 'Tutti gli outfit' },
          { id: 'semplice', label: 'Semplici (60-100 🌰)' },
          { id: 'medio', label: 'Medi (160-220 🌰)' },
          { id: 'elaborato', label: 'Elaborati (300-450 🌰)' },
        ].map((cat) => (
          <button
            key={cat.id}
            onClick={() => setActiveCategory(cat.id as any)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
              activeCategory === cat.id
                ? 'bg-[#6B7C4F] text-white shadow-sm'
                : 'bg-white border border-[#6B7C4F]/20 text-[#6C5C4C] hover:bg-[#F2E8D5]/40'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Outfits Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredOutfits.map((outfit) => {
          const isUnlocked = unlockedOutfits.includes(outfit.id);
          const isEquipped = activeOutfitId === outfit.id;
          const canAfford = currentAcorns >= outfit.cost;

          return (
            <div
              key={outfit.id}
              className={`bg-white rounded-2xl border p-4 flex flex-col justify-between transition-all duration-200 hover:shadow-md ${
                isEquipped
                  ? 'border-2 border-[#6B7C4F] ring-2 ring-[#6B7C4F]/20'
                  : isUnlocked
                  ? 'border-[#6B7C4F]/25'
                  : 'border-gray-200 bg-gray-50/50'
              }`}
            >
              <div>
                {/* Image Avatar Container */}
                <div className="relative w-full aspect-square rounded-xl bg-[#F2E8D5] overflow-hidden mb-3 border border-[#6B7C4F]/15 flex items-center justify-center p-2">
                  <img
                    src={outfit.image}
                    alt={outfit.name}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover rounded-lg select-none"
                  />

                  {/* Status Badge */}
                  {isEquipped && (
                    <span className="absolute top-2 right-2 bg-[#6B7C4F] text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm flex items-center gap-1">
                      <Check className="w-3 h-3" /> Indossato
                    </span>
                  )}
                  {!isUnlocked && (
                    <span className="absolute top-2 right-2 bg-gray-900/80 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm flex items-center gap-1">
                      <Lock className="w-3 h-3" /> Bloccato
                    </span>
                  )}
                </div>

                <h3 className="font-bold text-sm text-[#3A2B22]">{outfit.name}</h3>
                <p className="text-xs text-[#6C5C4C] mt-1 line-clamp-2">{outfit.description}</p>
              </div>

              <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between gap-2">
                <div className="text-xs font-bold text-[#D97706]">
                  {outfit.cost === 0 ? 'Gratuito' : `${outfit.cost} 🌰`}
                </div>

                {isEquipped ? (
                  <button
                    disabled
                    className="px-3 py-1.5 rounded-xl bg-[#6B7C4F]/10 text-[#54633E] text-xs font-bold flex items-center gap-1 cursor-default"
                  >
                    <Check className="w-3.5 h-3.5" /> In uso
                  </button>
                ) : isUnlocked ? (
                  <button
                    onClick={() => handleEquip(outfit.id)}
                    id={`btn-equip-${outfit.id}`}
                    className="px-3 py-1.5 rounded-xl bg-[#6B7C4F] text-white text-xs font-bold hover:bg-[#54633E] transition-all shadow-sm active:scale-95"
                  >
                    Indossa
                  </button>
                ) : (
                  <button
                    onClick={() => handleUnlock(outfit)}
                    disabled={!canAfford}
                    id={`btn-unlock-${outfit.id}`}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1 ${
                      canAfford
                        ? 'bg-[#D97706] text-white hover:bg-[#B45309] active:scale-95'
                        : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                    }`}
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Sblocca</span>
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Info note */}
      <div className="p-3 bg-[#F2E8D5]/50 border border-[#6B7C4F]/20 rounded-xl text-xs text-[#6C5C4C] flex items-center gap-2">
        <Info className="w-4 h-4 text-[#6B7C4F] shrink-0" />
        <span>Completa le sessioni di memorizzazione, grammatica e pronuncia per guadagnare altre ghiande e sbloccare tutti gli outfit!</span>
      </div>
    </div>
  );
};
