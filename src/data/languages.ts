export interface LanguageOption {
  code: string;
  name: string;
  flag: string;
}

export const TARGET_LANGUAGES: LanguageOption[] = [
  { code: 'en', name: 'Inglese', flag: '🇬🇧' },
  { code: 'es', name: 'Spagnolo', flag: '🇪🇸' },
  { code: 'fr', name: 'Francese', flag: '🇫🇷' },
  { code: 'ja', name: 'Giapponese', flag: '🇯🇵' },
  { code: 'de', name: 'Tedesco', flag: '🇩🇪' },
];

export const NATIVE_LANGUAGES: LanguageOption[] = [
  { code: 'it', name: 'Italiano', flag: '🇮🇹' },
  { code: 'en', name: 'Inglese', flag: '🇬🇧' },
  { code: 'es', name: 'Spagnolo', flag: '🇪🇸' },
  { code: 'fr', name: 'Francese', flag: '🇫🇷' },
  { code: 'de', name: 'Tedesco', flag: '🇩🇪' },
  { code: 'pt', name: 'Portoghese', flag: '🇵🇹' },
  { code: 'nl', name: 'Olandese', flag: '🇳🇱' },
  { code: 'pl', name: 'Polacco', flag: '🇵🇱' },
  { code: 'ro', name: 'Rumeno', flag: '🇷🇴' },
  { code: 'ru', name: 'Russo', flag: '🇷🇺' },
  { code: 'uk', name: 'Ucraino', flag: '🇺🇦' },
  { code: 'tr', name: 'Turco', flag: '🇹🇷' },
  { code: 'ar', name: 'Arabo', flag: '🇸🇦' },
  { code: 'zh', name: 'Cinese', flag: '🇨🇳' },
  { code: 'ja', name: 'Giapponese', flag: '🇯🇵' },
  { code: 'ko', name: 'Coreano', flag: '🇰🇷' },
];
