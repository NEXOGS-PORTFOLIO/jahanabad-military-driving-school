import { useTranslation } from 'react-i18next';
import i18n from '../i18n';

// English source strings are keys in the UI namespace. Data values and API
// enums stay unchanged; translate them only where they are displayed.
export const translate = (text, values = {}) => {
  if (typeof text !== 'string') return text;
  return i18n.t(text, { ...values, ns: 'ui', keySeparator: false, nsSeparator: false, defaultValue: text });
};

export const useSiteTranslation = () => {
  useTranslation('ui');
  return { tr: translate, locale: i18n.language === 'bn' ? 'bn-BD' : 'en-BD' };
};
