import React, { useState } from 'react';
import { Mascot } from '../mascot/Mascot';
import { UserProfile, VocabItem } from '../types';

interface SettingsProps {
  user: UserProfile;
  vocabItems: VocabItem[];
  onUpdateUser: (updated: UserProfile) => void;
  onDeleteItem: (itemId: string) => void;
  onResetData: () => void;
}

export const Settings: React.FC<SettingsProps> = ({
  user,
  vocabItems,
  onUpdateUser,
  onDeleteItem,
  onResetData,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [originFilter, setOriginFilter] = useState<string>('all');
  const [showResetModal, setShowResetModal] = useState(false);

  const handleToggleReminder = async (enabled: boolean) => {
    if (enabled && 'Notification' in window && Notification.permission !== 'granted') {
      try {
        await Notification.requestPermission();
      } catch (e) {}
    }
    onUpdateUser({ ...user, reminderEnabled: enabled });
  };

  const handleTimeChange = (time: string) => {
    onUpdateUser({ ...user, reminderTime: time });
  };

  const handleExportJson = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify({ user, vocabItems }, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `raccoonary_backup_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleExportCsv = () => {
    let csv = 'Term,Translation,SourceLang,TargetLang,Box,Origin\n';
    vocabItems.forEach((i) => {
      csv += `"${i.term}","${i.translation}","${i.sourceLang}","${i.targetLang}",${i.box},"${i.origin}"\n`;
    });
    const dataStr = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv);
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `raccoonary_vocab_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const filteredItems = vocabItems.filter((item) => {
    const matchesSearch =
      item.term.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.translation.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesOrigin = originFilter === 'all' || item.origin === originFilter;
    return matchesSearch && matchesOrigin;
  });

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto space-y-6 pb-28">
      {/* Header Bento Card */}
      <div className="bento-card flex flex-col sm:flex-row items-center gap-5 text-center sm:text-left max-w-3xl mx-auto">
        <Mascot pose="greeting" size={85} />
        <div>
          <span className="badge-leaf mb-2">Pannello di Controllo</span>
          <h1 className="text-2xl sm:text-3xl font-bold font-display text-[#3A2B22]">
            Impostazioni Tana
          </h1>
          <p className="text-xs sm:text-sm text-[#3A2B22]/70 font-medium">
            Gestisci promemoria, parole salvate ed esportazioni dei tuoi progressi.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto">
        {/* Reminder Settings Bento Card */}
        <div className="bento-card space-y-4">
          <h2 className="text-xs font-bold font-display uppercase tracking-wider text-[#6B7C4F]">
            ⏰ Promemoria Giornaliero
          </h2>

          <div className="flex items-center justify-between">
            <div>
              <div className="font-bold text-base text-[#3A2B22] font-display">Notifica quotidiana</div>
              <div className="text-xs text-[#3A2B22]/60 font-medium">Ricordati di ripassare in tana</div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={user.reminderEnabled}
                onChange={(e) => handleToggleReminder(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#6B7C4F]"></div>
            </label>
          </div>

          {user.reminderEnabled && (
            <div className="flex items-center justify-between border-t border-[#6B7C4F]/10 pt-3">
              <span className="text-xs font-bold text-[#3A2B22] font-display">Orario notifiche:</span>
              <input
                type="time"
                value={user.reminderTime}
                onChange={(e) => handleTimeChange(e.target.value)}
                className="p-2.5 rounded-xl bg-[#F2E8D5]/50 border border-[#6B7C4F]/30 text-xs font-bold text-[#3A2B22]"
              />
            </div>
          )}
        </div>

        {/* Export & Data Backup Bento Card */}
        <div className="bento-card space-y-3">
          <h2 className="text-xs font-bold font-display uppercase tracking-wider text-[#6B7C4F]">
            💾 Esportazione Dati
          </h2>
          <p className="text-xs text-[#3A2B22]/70 font-medium">
            Scarica un backup completo dei tuoi vocaboli e progressi in tana.
          </p>
          <div className="grid grid-cols-2 gap-3 pt-2">
            <button
              onClick={handleExportCsv}
              className="p-3.5 rounded-2xl bg-[#F2E8D5]/60 border border-[#6B7C4F]/30 text-xs font-bold font-display text-[#3A2B22] hover:bg-[#F2E8D5] transition-all cursor-pointer"
            >
              Esporta CSV 📊
            </button>
            <button
              onClick={handleExportJson}
              className="p-3.5 rounded-2xl bg-[#F2E8D5]/60 border border-[#6B7C4F]/30 text-xs font-bold font-display text-[#3A2B22] hover:bg-[#F2E8D5] transition-all cursor-pointer"
            >
              Esporta JSON 📁
            </button>
          </div>
        </div>
      </div>

      {/* Vocabulary Management Bento Card */}
      <div className="bento-card space-y-4 max-w-3xl mx-auto">
        <div className="flex justify-between items-center">
          <h2 className="text-xs font-bold font-display uppercase tracking-wider text-[#6B7C4F]">
            📚 Le Tue Parole ({vocabItems.length})
          </h2>
        </div>

        {/* Filters */}
        <div className="space-y-3">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Cerca parola o traduzione..."
            className="w-full p-3.5 rounded-2xl bg-[#F2E8D5]/40 border border-[#6B7C4F]/30 text-sm font-medium focus:outline-none focus:border-[#6B7C4F]"
          />

          <div className="flex gap-2 overflow-x-auto no-scrollbar pt-1">
            {[
              { id: 'all', label: 'Tutti' },
              { id: 'import', label: 'Importati' },
              { id: 'grammar_error', label: 'Grammatica' },
              { id: 'reading_error', label: 'Lettura' },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setOriginFilter(f.id)}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold font-display transition-all whitespace-nowrap cursor-pointer ${
                  originFilter === f.id
                    ? 'bg-[#6B7C4F] text-white'
                    : 'bg-[#F2E8D5]/50 text-[#3A2B22]/70 hover:text-[#3A2B22]'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Item List */}
        <div className="divide-y divide-[#6B7C4F]/10 max-h-72 overflow-y-auto">
          {filteredItems.length === 0 ? (
            <p className="text-xs text-[#3A2B22]/60 text-center py-6 font-medium">Nessun vocabolo trovato.</p>
          ) : (
            filteredItems.map((item) => (
              <div key={item.id} className="py-3 flex items-center justify-between text-xs sm:text-sm">
                <div>
                  <div className="font-bold text-[#3A2B22] font-display">
                    {item.term} <span className="text-[#6B7C4F] font-normal">({item.translation})</span>
                  </div>
                  <div className="text-[11px] text-[#3A2B22]/60 mt-0.5 font-medium">
                    Box {item.box} • Origine: {item.origin}
                  </div>
                </div>
                <button
                  onClick={() => onDeleteItem(item.id)}
                  className="text-red-500 hover:text-red-700 p-2 font-bold text-xs cursor-pointer rounded-lg hover:bg-red-50 transition-all"
                >
                  🗑
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Danger Zone: Reset Progress */}
      <div className="pt-2 max-w-3xl mx-auto">
        <button
          onClick={() => setShowResetModal(true)}
          className="w-full py-4 rounded-2xl bg-red-50 text-red-600 border border-red-200 font-bold font-display text-xs sm:text-sm hover:bg-red-100 transition-all text-center cursor-pointer shadow-xs"
        >
          ⚠️ Azzera tutti i dati e i progressi
        </button>
      </div>

      {/* Confirmation Modal for Reset */}
      {showResetModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full space-y-4 text-center border-2 border-red-400">
            <Mascot pose="thinking" size={90} />
            <h3 className="text-lg font-bold font-display text-[#3A2B22]">Sei davvero sicuro?</h3>
            <p className="text-xs text-[#3A2B22]/80 leading-relaxed">
              Questa azione cancellerà definitivamente tutte le tue parole salvate, i progressi di grammatica e il conteggio delle ghiande. Non potrà essere annullata.
            </p>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setShowResetModal(false)}
                className="flex-1 py-3 rounded-2xl bg-gray-100 text-[#3A2B22] font-bold text-xs"
              >
                Annulla
              </button>
              <button
                onClick={() => {
                  setShowResetModal(false);
                  onResetData();
                }}
                className="flex-1 py-3 rounded-2xl bg-red-600 text-white font-bold text-xs"
              >
                Sì, cancella tutto
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
