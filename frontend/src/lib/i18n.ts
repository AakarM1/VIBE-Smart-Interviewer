/**
 * i18next Configuration
 * Internationalization setup for the application
 */

import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import { featureFlags } from '@/lib/feature-flags';

// Translation resources
const resources = {
  en: {
    translation: {
      // Common UI
      'common.loading': 'Loading...',
      'common.save': 'Save',
      'common.cancel': 'Cancel',
      'common.next': 'Next',
      'common.previous': 'Previous',
      'common.submit': 'Submit',
      'common.start': 'Start',
      'common.finish': 'Finish',
      'common.close': 'Close',
      'common.error': 'Error',
      
      // Assessment
      'assessment.title': 'Skills Gauge',
      'assessment.subtitle': 'Skills Gauge is a combination of Assessments, which are predictive of future performance on the job.',
      'assessment.start': 'Start Assessment',
      'assessment.selectResponse': 'Select your response',
      'assessment.nextQuestion': 'Next Question',
      'assessment.timeRemaining': 'Time remaining',
      'assessment.yourAnswer': 'Your answer',
      'assessment.completed': 'Assessment completed',
      'assessment.processing': 'Processing your responses...',
      
      // Recording
      'recording.start': 'Start Recording',
      'recording.stop': 'Stop Recording',
      'recording.micAccess': 'Microphone access required',
      'recording.micDenied': 'Microphone access denied',
      'recording.recording': 'Recording...',
      
      // Instructions
      'instructions.readCarefully': 'Read each situation carefully',
      'instructions.selectBest': 'Select the response that best represents what you would do',
      'instructions.noRightWrong': 'There are no right or wrong answers',
      'instructions.finishAttempt': 'Finish all questions in 1 attempt',
      
      // Form fields
      'form.name': 'Enter your name',
      'form.selectRole': 'Select role',
      'form.selectLanguage': 'Select language',
      'form.required': 'This field is required',
      
      // Language
      'language.select': 'Select language',
      'language.current': 'Current language',
      'language.change': 'Change language'
    }
  },
  es: {
    translation: {
      // Common UI
      'common.loading': 'Cargando...',
      'common.save': 'Guardar',
      'common.cancel': 'Cancelar',
      'common.next': 'Siguiente',
      'common.previous': 'Anterior',
      'common.submit': 'Enviar',
      'common.start': 'Comenzar',
      'common.finish': 'Finalizar',
      'common.close': 'Cerrar',
      'common.error': 'Error',
      
      // Assessment
      'assessment.title': 'Evaluación de Habilidades',
      'assessment.subtitle': 'La Evaluación de Habilidades es una combinación de pruebas que predicen el rendimiento futuro en el trabajo.',
      'assessment.start': 'Comenzar Evaluación',
      'assessment.selectResponse': 'Selecciona tu respuesta',
      'assessment.nextQuestion': 'Siguiente Pregunta',
      'assessment.timeRemaining': 'Tiempo restante',
      'assessment.yourAnswer': 'Tu respuesta',
      'assessment.completed': 'Evaluación completada',
      'assessment.processing': 'Procesando tus respuestas...',
      
      // Recording
      'recording.start': 'Comenzar Grabación',
      'recording.stop': 'Detener Grabación',
      'recording.micAccess': 'Se requiere acceso al micrófono',
      'recording.micDenied': 'Acceso al micrófono denegado',
      'recording.recording': 'Grabando...',
      
      // Instructions
      'instructions.readCarefully': 'Lee cada situación cuidadosamente',
      'instructions.selectBest': 'Selecciona la respuesta que mejor represente lo que harías',
      'instructions.noRightWrong': 'No hay respuestas correctas o incorrectas',
      'instructions.finishAttempt': 'Completa todas las preguntas en 1 intento',
      
      // Form fields
      'form.name': 'Ingresa tu nombre',
      'form.selectRole': 'Seleccionar rol',
      'form.selectLanguage': 'Seleccionar idioma',
      'form.required': 'Este campo es obligatorio',
      
      // Language
      'language.select': 'Seleccionar idioma',
      'language.current': 'Idioma actual',
      'language.change': 'Cambiar idioma'
    }
  },
  ar: {
    translation: {
      // Common UI
      'common.loading': 'جاري التحميل...',
      'common.save': 'حفظ',
      'common.cancel': 'إلغاء',
      'common.next': 'التالي',
      'common.previous': 'السابق',
      'common.submit': 'إرسال',
      'common.start': 'بدء',
      'common.finish': 'إنهاء',
      'common.close': 'إغلاق',
      'common.error': 'خطأ',
      
      // Assessment
      'assessment.title': 'قياس المهارات',
      'assessment.subtitle': 'قياس المهارات هو مجموعة من التقييمات التي تتنبأ بالأداء المستقبلي في العمل.',
      'assessment.start': 'بدء التقييم',
      'assessment.selectResponse': 'اختر إجابتك',
      'assessment.nextQuestion': 'السؤال التالي',
      'assessment.timeRemaining': 'الوقت المتبقي',
      'assessment.yourAnswer': 'إجابتك',
      'assessment.completed': 'تم إكمال التقييم',
      'assessment.processing': 'جاري معالجة إجاباتك...',
      
      // Recording
      'recording.start': 'بدء التسجيل',
      'recording.stop': 'إيقاف التسجيل',
      'recording.micAccess': 'مطلوب الوصول للميكروفون',
      'recording.micDenied': 'تم رفض الوصول للميكروفون',
      'recording.recording': 'جاري التسجيل...',
      
      // Instructions
      'instructions.readCarefully': 'اقرأ كل موقف بعناية',
      'instructions.selectBest': 'اختر الإجابة التي تمثل أفضل ما ستفعله',
      'instructions.noRightWrong': 'لا توجد إجابات صحيحة أو خاطئة',
      'instructions.finishAttempt': 'أكمل جميع الأسئلة في محاولة واحدة',
      
      // Form fields
      'form.name': 'أدخل اسمك',
      'form.selectRole': 'اختر الدور',
      'form.selectLanguage': 'اختر اللغة',
      'form.required': 'هذا الحقل مطلوب',
      
      // Language
      'language.select': 'اختر اللغة',
      'language.current': 'اللغة الحالية',
      'language.change': 'تغيير اللغة'
    }
  }
};

// Configuration
const i18nConfig = {
  resources,
  fallbackLng: 'en',
  lng: 'en', // Default language
  interpolation: {
    escapeValue: false // React already handles escaping
  },
  detection: {
    order: ['localStorage', 'navigator'],
    caches: ['localStorage'],
    lookupLocalStorage: 'user-language-preference'
  }
};

// Initialize only on client side to avoid SSR issues
if (typeof window !== 'undefined') {
  // Initialize only if i18n is enabled
  if (featureFlags.isI18nEnabled()) {
    i18n
      .use(LanguageDetector)
      .use(initReactI18next)
      .init(i18nConfig);
  } else {
    // Initialize with minimal English-only config if disabled
    i18n
      .use(initReactI18next)
      .init({
        resources: { en: resources.en },
        lng: 'en',
        fallbackLng: 'en',
        interpolation: { escapeValue: false }
      });
  }
} else {
  // Server-side initialization with basic config
  i18n
    .use(initReactI18next)
    .init({
      resources: { en: resources.en },
      lng: 'en',
      fallbackLng: 'en',
      interpolation: { escapeValue: false }
    });
}

export default i18n;
