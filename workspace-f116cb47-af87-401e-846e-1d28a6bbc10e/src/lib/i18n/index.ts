import en from './en'
import ru from './ru'

export type Language = 'en' | 'ru'

const translations = { en, ru }

export function t(key: string, lang: Language = 'en'): string {
  const dict = translations[lang] as Record<string, string>
  return dict[key] ?? (translations.en as Record<string, string>)[key] ?? key
}

export function createTranslator(lang: Language) {
  return (key: string) => t(key, lang)
}

export { en, ru }
