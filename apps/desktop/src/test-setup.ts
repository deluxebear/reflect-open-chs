import { initI18n } from '@/i18n'

// Ensure UI components that call useTranslation resolve English catalogs in
// unit tests without each file mounting LocaleProvider.
initI18n('en')
