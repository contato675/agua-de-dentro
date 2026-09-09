export const LOCALE_CONFIG = Object.freeze({
  es: Object.freeze({path:'', og:'es_ES'}),
  'pt-BR': Object.freeze({path:'pt-br/', og:'pt_BR'}),
  fr: Object.freeze({path:'fr/', og:'fr_FR'}),
  en: Object.freeze({path:'en/', og:'en_US'})
});
export const LOCALES = Object.freeze(Object.keys(LOCALE_CONFIG));
export function localized(value, locale) {
  if (!LOCALES.includes(locale) || typeof value?.[locale] !== 'string' || !value[locale].trim()) {
    throw new Error(`Missing translation: ${locale}`);
  }
  return value[locale];
}
export const localePath = locale => {
  if (!LOCALES.includes(locale)) throw new Error('Unsupported locale');
  return LOCALE_CONFIG[locale].path;
};
