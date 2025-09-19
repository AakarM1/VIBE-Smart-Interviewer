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
      // Header
      'header.hello': 'Hello',
      'header.home': 'Home',
      'header.admin': 'Admin',
      'header.logout': 'Logout',
      'header.login': 'Login',
      'header.register': 'Register',
  'header.superadmin': 'Super Admin',

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
      'language.change': 'Change language',

  // Recorder UI
  'recorder.audioMode': 'Audio Recording Mode',
  'recorder.rtaUnsupported': 'Real-time transcription not supported in this browser',
  'recorder.mediaDeniedTitle': 'Media access denied.',
  'recorder.mediaDeniedMsg': 'Please enable permissions in your browser settings and refresh the page.',
  'recorder.liveActive': 'Live transcription active',
  'recorder.stop': 'Stop Recording',
  'recorder.record': 'Record Answer',
  'recorder.recording': 'Recording...',
  'recorder.rtaEnabled': 'Real-time transcription enabled',
  'recorder.unsupportedBrowserTitle': 'Unsupported Browser',
  'recorder.unsupportedBrowserMsg': 'Your browser does not support media recording.',
  'recorder.permissionsDeniedTitle': 'Permissions Denied',
  'recorder.permissionsDeniedMsg': 'Please enable camera and microphone permissions in your browser settings.',
  'recorder.micDeniedTitle': 'Microphone Access Denied',
  'recorder.micDeniedMsg': 'Please allow microphone access for real-time transcription.',
  'recorder.srErrorTitle': 'Speech Recognition Error',
  'recorder.srErrorMsg': 'Could not start real-time transcription. Recording will continue without live transcription.',
  'recorder.cannotRecordTitle': 'Cannot Record',
  'recorder.cannotRecordMsg': 'Permissions are required and the camera/microphone stream must be active.',
  'recorder.convertErrorTitle': 'Error converting recording',
  'recorder.convertErrorMsg': 'Could not process the recorded media.',
  'recorder.recordingErrorTitle': 'Recording Error',
  'recorder.recordingErrorMsg': 'Could not start recording. Please check permissions and devices.',
      
      // Common (extra)
      'common.total': 'TOTAL',
      'common.questions': 'Questions',
      'common.testTime': 'Test Time',
      'common.untimed': 'Untimed',

      // Flashcard UI
      'flashcard.savingAnswer': 'Saving Answer...',
      'flashcard.totalTestTime': 'TOTAL TEST TIME',
      'flashcard.finishTest': 'Finish Test',
      'flashcard.timeRemaining': 'Time Remaining',
      'flashcard.submitted': 'Submitted',
      'flashcard.submitAnswer': 'Submit Answer',
      'flashcard.transcribing': 'Transcribing...',
      'flashcard.text.typePrompt': 'Type your answer below:',
      'flashcard.text.submittedLabel': 'Your submitted answer:',
      'flashcard.text.placeholderActive': 'Your answer...'
      ,
      'flashcard.text.placeholderSubmitted': 'Your submitted answer',
      'flashcard.transcription.liveLabel': 'Live transcription:',
      'flashcard.transcription.finalLabel': 'Final transcription (read-only):',
      'flashcard.transcription.willAppear': 'Your transcribed answer will appear here:',
      'flashcard.transcription.placeholderRecording': 'Speak clearly to see your words appear here in real-time...',
      'flashcard.transcription.placeholderAfter': 'Your transcribed answer will appear here after recording.',
      'flashcard.transcription.placeholderLocked': 'Transcription complete - cannot be edited.',
      'flashcard.transcription.inProgressNotice': 'Recording in progress - speak clearly for accurate transcription',
      'flashcard.transcription.completeNotice': 'Recording complete - transcription is final and cannot be edited',
      'flashcard.reRecord': 'Re-record',
  'flashcard.answerSubmittedMessage': 'Answer submitted for this question.',

      // Flashcard toasts / errors
      'flashcard.toast.noAnswer.title': 'No answer provided',
      'flashcard.toast.noAnswer.desc': 'Please type your answer before submitting.',
      'flashcard.toast.submissionError.title': 'Submission Error',
      'flashcard.toast.submissionError.desc': 'A transcribed answer is required. Please record and ensure transcription is complete.',
      'flashcard.toast.transcriptionError.title': 'Transcription failed',
      'flashcard.toast.transcriptionError.desc': 'Could not transcribe from the recording. Please try again.',

      // Instructions modal
  'flashcard.instructions.title': 'Test Instructions',
  'flashcard.instructions.button': 'Instructions',
      'flashcard.instructions.guidelinesTitle': 'Test Guidelines:',
      'flashcard.instructions.g1': 'Answer all questions in one attempt, so start when you are really ready.',
      'flashcard.instructions.g2': '"Submit" every response and "Finish Test" when you have responded to all.',
      'flashcard.instructions.g3': 'If no option matches your real life response to a question, choose one that is closest.',
      'flashcard.instructions.g4': 'Keep it real life, stay spontaneous. Do not overthink a response.',
      'flashcard.instructions.navigationTitle': 'Navigation:',
      'flashcard.instructions.n1': 'Use the numbered buttons to navigate between questions',
      'flashcard.instructions.n2': 'Green numbers indicate answered questions',
      'flashcard.instructions.n3_withLimit': 'This test has a {{minutes}} minute time limit (you\'ll be automatically finished when time runs out)',
      'flashcard.instructions.n3_noLimit': 'This test has no time limit',
      'flashcard.instructions.n4': 'The timer shows how long you\'ve been taking the test',
      'flashcard.instructions.remindersTitle': 'Important Reminders:',
      'flashcard.instructions.r1': 'Try not to refresh the page, you will lose the answers you\'ve worked hard to complete.',
      'flashcard.instructions.r2': 'Don\'t shut the browser, and avoid power-outs if you can.',
      'flashcard.instructions.r3': 'Choose what you would really do, not what you should ideally do.',
      'flashcard.instructions.r4': 'Submit every answer and Click "Finish" test when you\'ve answered all!',
      'flashcard.instructions.gotIt': 'Got it!'
    }
  },
  es: {
    translation: {
      // Header
      'header.hello': 'Hola',
      'header.home': 'Inicio',
      'header.admin': 'Administrador',
      'header.logout': 'Cerrar sesión',
      'header.login': 'Iniciar sesión',
      'header.register': 'Registrarse',
  'header.superadmin': 'Súper Administrador',

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
      'language.change': 'Cambiar idioma',

      // Common (extra)
      'common.total': 'TOTAL',
      'common.questions': 'Preguntas',
      'common.testTime': 'Tiempo de prueba',
      'common.untimed': 'Sin tiempo límite',

      // Flashcard UI
      'flashcard.savingAnswer': 'Guardando respuesta...',
      'flashcard.totalTestTime': 'TIEMPO TOTAL DE PRUEBA',
      'flashcard.finishTest': 'Finalizar prueba',
      'flashcard.timeRemaining': 'Tiempo restante',
      'flashcard.submitted': 'Enviado',
      'flashcard.submitAnswer': 'Enviar respuesta',
      'flashcard.transcribing': 'Transcribiendo...',
      'flashcard.text.typePrompt': 'Escribe tu respuesta a continuación:',
      'flashcard.text.submittedLabel': 'Tu respuesta enviada:',
      'flashcard.text.placeholderActive': 'Tu respuesta...'
      ,
      'flashcard.text.placeholderSubmitted': 'Tu respuesta enviada',
      'flashcard.transcription.liveLabel': 'Transcripción en vivo:',
      'flashcard.transcription.finalLabel': 'Transcripción final (solo lectura):',
      'flashcard.transcription.willAppear': 'Tu respuesta transcrita aparecerá aquí:',
      'flashcard.transcription.placeholderRecording': 'Habla claramente para ver tus palabras en tiempo real...',
      'flashcard.transcription.placeholderAfter': 'Tu respuesta transcrita aparecerá aquí después de la grabación.',
      'flashcard.transcription.placeholderLocked': 'Transcripción completa: no se puede editar.',
      'flashcard.transcription.inProgressNotice': 'Grabación en curso: habla claramente para una transcripción precisa',
      'flashcard.transcription.completeNotice': 'Grabación completa: la transcripción es final y no se puede editar',
      'flashcard.reRecord': 'Volver a grabar',
  'flashcard.answerSubmittedMessage': 'Respuesta enviada para esta pregunta.',

      // Flashcard toasts / errors
      'flashcard.toast.noAnswer.title': 'No se proporcionó respuesta',
      'flashcard.toast.noAnswer.desc': 'Por favor escribe tu respuesta antes de enviar.',
      'flashcard.toast.submissionError.title': 'Error de envío',
      'flashcard.toast.submissionError.desc': 'Se requiere una respuesta transcrita. Por favor graba y asegúrate de que la transcripción esté completa.',
      'flashcard.toast.transcriptionError.title': 'Fallo de transcripción',
      'flashcard.toast.transcriptionError.desc': 'No se pudo transcribir la grabación. Inténtalo de nuevo.',

      // Instructions modal
  'flashcard.instructions.title': 'Instrucciones de la prueba',
  'flashcard.instructions.button': 'Instrucciones',
      'flashcard.instructions.guidelinesTitle': 'Guías de la prueba:',
      'flashcard.instructions.g1': 'Responde todas las preguntas en un intento, así que comienza cuando estés realmente listo.',
      'flashcard.instructions.g2': '"Enviar" cada respuesta y "Finalizar prueba" cuando hayas respondido a todas.',
      'flashcard.instructions.g3': 'Si ninguna opción coincide con tu respuesta en la vida real, elige la más cercana.',
      'flashcard.instructions.g4': 'Sé auténtico y espontáneo. No sobrepienses tu respuesta.',
      'flashcard.instructions.navigationTitle': 'Navegación:',
      'flashcard.instructions.n1': 'Usa los botones numerados para navegar entre preguntas',
      'flashcard.instructions.n2': 'Los números verdes indican preguntas respondidas',
      'flashcard.instructions.n3_withLimit': 'Esta prueba tiene un límite de {{minutes}} minutos (se finalizará automáticamente cuando se acabe el tiempo)',
      'flashcard.instructions.n3_noLimit': 'Esta prueba no tiene límite de tiempo',
      'flashcard.instructions.n4': 'El temporizador muestra cuánto tiempo llevas en la prueba',
      'flashcard.instructions.remindersTitle': 'Recordatorios importantes:',
      'flashcard.instructions.r1': 'Evita refrescar la página, podrías perder tus respuestas.',
      'flashcard.instructions.r2': 'No cierres el navegador y evita cortes de energía si es posible.',
      'flashcard.instructions.r3': 'Elige lo que realmente harías, no lo que idealmente deberías hacer.',
      'flashcard.instructions.r4': 'Envía cada respuesta y haz clic en "Finalizar" cuando hayas respondido todo.',
      'flashcard.instructions.gotIt': '¡Entendido!'
    }
  },
  ar: {
    translation: {
      // Header
      'header.hello': 'مرحبًا',
      'header.home': 'الرئيسية',
      'header.admin': 'المشرف',
      'header.logout': 'تسجيل الخروج',
      'header.login': 'تسجيل الدخول',
      'header.register': 'إنشاء حساب',
  'header.superadmin': 'المشرف العام',

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
      'language.change': 'تغيير اللغة',

      // Common (extra)
      'common.total': 'الإجمالي',
      'common.questions': 'الأسئلة',
      'common.testTime': 'زمن الاختبار',
      'common.untimed': 'بدون وقت',

      // Flashcard UI
      'flashcard.savingAnswer': 'جاري حفظ الإجابة...',
      'flashcard.totalTestTime': 'الوقت الإجمالي للاختبار',
      'flashcard.finishTest': 'إنهاء الاختبار',
      'flashcard.timeRemaining': 'الوقت المتبقي',
      'flashcard.submitted': 'تم الإرسال',
      'flashcard.submitAnswer': 'إرسال الإجابة',
      'flashcard.transcribing': 'جاري النسخ...',
      'flashcard.text.typePrompt': 'اكتب إجابتك أدناه:',
      'flashcard.text.submittedLabel': 'إجابتك المُرسلة:',
      'flashcard.text.placeholderActive': 'إجابتك...'
      ,
      'flashcard.text.placeholderSubmitted': 'إجابتك المُرسلة',
      'flashcard.transcription.liveLabel': 'نسخ مباشر:',
      'flashcard.transcription.finalLabel': 'النسخة النهائية (غير قابلة للتعديل):',
      'flashcard.transcription.willAppear': 'ستظهر إجابتك المنسوخة هنا:',
      'flashcard.transcription.placeholderRecording': 'تحدث بوضوح لتظهر كلماتك هنا في الوقت الحقيقي...',
      'flashcard.transcription.placeholderAfter': 'ستظهر الإجابة المنسوخة هنا بعد التسجيل.',
      'flashcard.transcription.placeholderLocked': 'اكتمل النسخ - غير قابل للتعديل.',
      'flashcard.transcription.inProgressNotice': 'التسجيل جارٍ - تكلّم بوضوح لنسخ أدق',
      'flashcard.transcription.completeNotice': 'اكتمل التسجيل - النسخة نهائية وغير قابلة للتعديل',
      'flashcard.reRecord': 'إعادة التسجيل',
  'flashcard.answerSubmittedMessage': 'تم إرسال الإجابة لهذا السؤال.',

      // Flashcard toasts / errors
      'flashcard.toast.noAnswer.title': 'لم يتم تقديم إجابة',
      'flashcard.toast.noAnswer.desc': 'يرجى كتابة إجابتك قبل الإرسال.',
      'flashcard.toast.submissionError.title': 'خطأ في الإرسال',
      'flashcard.toast.submissionError.desc': 'مطلوب إجابة منسوخة. يرجى التسجيل والتأكد من اكتمال النسخ.',
      'flashcard.toast.transcriptionError.title': 'فشل النسخ',
      'flashcard.toast.transcriptionError.desc': 'تعذر النسخ من التسجيل. حاول مرة أخرى.',

      // Instructions modal
  'flashcard.instructions.title': 'تعليمات الاختبار',
  'flashcard.instructions.button': 'التعليمات',
      'flashcard.instructions.guidelinesTitle': 'إرشادات الاختبار:',
      'flashcard.instructions.g1': 'أجب عن جميع الأسئلة في محاولة واحدة، وابدأ عندما تكون جاهزًا تمامًا.',
      'flashcard.instructions.g2': '"أرسل" كل إجابة واضغط "إنهاء الاختبار" عند الانتهاء.',
      'flashcard.instructions.g3': 'إذا لم تجد خيارًا يطابق ما قد تفعله فعليًا، اختر الأقرب.',
      'flashcard.instructions.g4': 'كن عفويًا وحقيقيًا. لا تُفرط في التفكير.',
      'flashcard.instructions.navigationTitle': 'التنقل:',
      'flashcard.instructions.n1': 'استخدم الأزرار المرقمة للتنقل بين الأسئلة',
      'flashcard.instructions.n2': 'الأرقام الخضراء تعني أسئلة مُجاب عنها',
      'flashcard.instructions.n3_withLimit': 'هذا الاختبار له حد {{minutes}} دقيقة (سيتم إنهاؤه تلقائيًا عند انتهاء الوقت)',
      'flashcard.instructions.n3_noLimit': 'هذا الاختبار بلا حد زمني',
      'flashcard.instructions.n4': 'يعرض المؤقت المدة التي قضيتها في الاختبار',
      'flashcard.instructions.remindersTitle': 'تذكيرات مهمة:',
      'flashcard.instructions.r1': 'تجنب تحديث الصفحة كي لا تفقد إجاباتك.',
      'flashcard.instructions.r2': 'لا تُغلق المتصفح وتجنب انقطاع الطاقة إن أمكن.',
      'flashcard.instructions.r3': 'اختر ما ستفعله حقًا، وليس ما ينبغي فعله نظريًا.',
      'flashcard.instructions.r4': 'أرسل كل إجابة واضغط "إنهاء" عند إكمال الجميع!',
      'flashcard.instructions.gotIt': 'فهمت'
    }
  }
  ,
  hi: {
    translation: {
      // Header (minimal)
      'header.hello': 'नमस्ते',
      'header.home': 'मुखपृष्ठ',
      'header.admin': 'प्रशासक',
      'header.logout': 'लॉगआउट',
      'header.login': 'लॉगिन',
      'header.register': 'पंजीकरण',
      'header.superadmin': 'सुपर प्रशासक',

      // Common UI
      'common.loading': 'लोड हो रहा है...',
      'common.save': 'सहेजें',
      'common.cancel': 'रद्द करें',
      'common.next': 'आगे',
      'common.previous': 'पिछला',
      'common.submit': 'जमा करें',
      'common.start': 'शुरू करें',
      'common.finish': 'समाप्त करें',
      'common.close': 'बंद करें',
      'common.error': 'त्रुटि',

      // Assessment (used by instructions)
      'assessment.selectResponse': 'अपना उत्तर चुनें',

      // Form fields
      'form.selectLanguage': 'भाषा चुनें',

      // Recorder UI
      'recorder.audioMode': 'ऑडियो रिकॉर्डिंग मोड',
      'recorder.rtaUnsupported': 'इस ब्राउज़र में रियल-टाइम ट्रांसक्रिप्शन समर्थित नहीं है',
      'recorder.mediaDeniedTitle': 'मीडिया एक्सेस अस्वीकृत।',
      'recorder.mediaDeniedMsg': 'कृपया अपने ब्राउज़र सेटिंग्स में अनुमति सक्षम करें और पृष्ठ रीफ्रेश करें।',
      'recorder.liveActive': 'रियल-टाइम ट्रांसक्रिप्शन सक्रिय',
      'recorder.stop': 'रिकॉर्डिंग रोकें',
      'recorder.record': 'उत्तर रिकॉर्ड करें',
      'recorder.recording': 'रिकॉर्डिंग जारी है...',
      'recorder.rtaEnabled': 'रियल-टाइम ट्रांसक्रिप्शन सक्षम',
      'recorder.unsupportedBrowserTitle': 'असमर्थित ब्राउज़र',
      'recorder.unsupportedBrowserMsg': 'आपका ब्राउज़र मीडिया रिकॉर्डिंग का समर्थन नहीं करता।',
      'recorder.permissionsDeniedTitle': 'अनुमतियाँ अस्वीकृत',
      'recorder.permissionsDeniedMsg': 'कृपया कैमरा और माइक्रोफ़ोन की अनुमतियाँ सक्षम करें।',
      'recorder.micDeniedTitle': 'माइक्रोफ़ोन एक्सेस अस्वीकृत',
      'recorder.micDeniedMsg': 'कृपया रियल-टाइम ट्रांसक्रिप्शन के लिए माइक्रोफ़ोन की अनुमति दें।',
      'recorder.srErrorTitle': 'स्पीच रिकग्निशन त्रुटि',
      'recorder.srErrorMsg': 'रियल-टाइम ट्रांसक्रिप्शन शुरू नहीं हो सका। रिकॉर्डिंग बिना लाइव ट्रांसक्रिप्शन के जारी रहेगी।',
      'recorder.cannotRecordTitle': 'रिकॉर्ड नहीं कर सकते',
      'recorder.cannotRecordMsg': 'अनुमतियाँ आवश्यक हैं और कैमरा/माइक्रोफ़ोन स्ट्रीम सक्रिय होनी चाहिए।',
      'recorder.convertErrorTitle': 'रिकॉर्डिंग कनवर्ट करने में त्रुटि',
      'recorder.convertErrorMsg': 'रिकॉर्ड की गई मीडिया को प्रोसेस नहीं किया जा सका।',
      'recorder.recordingErrorTitle': 'रिकॉर्डिंग त्रुटि',
      'recorder.recordingErrorMsg': 'रिकॉर्डिंग शुरू नहीं हो सकी। कृपया अनुमतियाँ और डिवाइस जांचें।',

      // Common (extra)
      'common.total': 'कुल',
      'common.questions': 'प्रश्न',
      'common.testTime': 'परीक्षण समय',
      'common.untimed': 'बिना समय सीमा',

      // Flashcard UI
      'flashcard.savingAnswer': 'उत्तर सहेजा जा रहा है...',
      'flashcard.totalTestTime': 'कुल परीक्षा समय',
      'flashcard.finishTest': 'परीक्षा समाप्त करें',
      'flashcard.timeRemaining': 'शेष समय',
      'flashcard.submitted': 'जमा किया गया',
      'flashcard.submitAnswer': 'उत्तर जमा करें',
      'flashcard.transcribing': 'ट्रांसक्राइब किया जा रहा है...',
      'flashcard.text.typePrompt': 'नीचे अपना उत्तर टाइप करें:',
      'flashcard.text.submittedLabel': 'आपका जमा किया गया उत्तर:',
      'flashcard.text.placeholderActive': 'आपका उत्तर...'
      ,
      'flashcard.text.placeholderSubmitted': 'आपका जमा किया गया उत्तर',
      'flashcard.transcription.liveLabel': 'लाइव ट्रांसक्रिप्शन:',
      'flashcard.transcription.finalLabel': 'अंतिम ट्रांसक्रिप्शन (केवल पढ़ने हेतु):',
      'flashcard.transcription.willAppear': 'यहाँ आपका ट्रांसक्राइब किया हुआ उत्तर दिखाई देगा:',
      'flashcard.transcription.placeholderRecording': 'स्पष्ट बोलें ताकि आपके शब्द यहाँ रियल-टाइम में दिखाई दें...',
      'flashcard.transcription.placeholderAfter': 'रिकॉर्डिंग के बाद आपका ट्रांसक्राइब उत्तर यहाँ दिखाई देगा।',
      'flashcard.transcription.placeholderLocked': 'ट्रांसक्रिप्शन पूरा - संपादित नहीं किया जा सकता।',
      'flashcard.transcription.inProgressNotice': 'रिकॉर्डिंग जारी है - सटीक ट्रांसक्रिप्शन के लिए स्पष्ट बोलें',
      'flashcard.transcription.completeNotice': 'रिकॉर्डिंग पूर्ण - ट्रांसक्रिप्शन अंतिम है और संपादित नहीं किया जा सकता',
      'flashcard.reRecord': 'पुनः रिकॉर्ड करें',
      'flashcard.answerSubmittedMessage': 'इस प्रश्न के लिए उत्तर जमा किया गया है।',

      // Flashcard toasts / errors
      'flashcard.toast.noAnswer.title': 'कोई उत्तर नहीं दिया गया',
      'flashcard.toast.noAnswer.desc': 'कृपया जमा करने से पहले अपना उत्तर टाइप करें।',
      'flashcard.toast.submissionError.title': 'जमा करने में त्रुटि',
      'flashcard.toast.submissionError.desc': 'ट्रांसक्राइब किया हुआ उत्तर आवश्यक है। कृपया रिकॉर्ड करें और सुनिश्चित करें कि ट्रांसक्रिप्शन पूरा है।',
      'flashcard.toast.transcriptionError.title': 'ट्रांसक्रिप्शन विफल',
      'flashcard.toast.transcriptionError.desc': 'रिकॉर्डिंग से ट्रांसक्राइब नहीं किया जा सका। कृपया पुनः प्रयास करें।',

      // Instructions modal
      'flashcard.instructions.title': 'परीक्षा निर्देश',
      'flashcard.instructions.button': 'निर्देश',
      'flashcard.instructions.guidelinesTitle': 'परीक्षा दिशानिर्देश:',
      'flashcard.instructions.g1': 'सभी प्रश्न एक ही प्रयास में करें, इसलिए तभी शुरू करें जब आप पूरी तरह तैयार हों।',
      'flashcard.instructions.g2': 'हर उत्तर को "जमा करें" और सभी उत्तर देने के बाद "परीक्षा समाप्त करें"।',
      'flashcard.instructions.g3': 'यदि कोई विकल्प आपकी वास्तविक प्रतिक्रिया से मेल नहीं खाता, तो सबसे नज़दीकी विकल्प चुनें।',
      'flashcard.instructions.g4': 'वास्तविक रहें, स्वाभाविक रहें। अधिक न सोचें।',
      'flashcard.instructions.navigationTitle': 'नेविगेशन:',
      'flashcard.instructions.n1': 'प्रश्नों के बीच नेविगेट करने के लिए क्रमांकित बटन का उपयोग करें',
      'flashcard.instructions.n2': 'हरे रंग के नंबर उत्तर दिए गए प्रश्नों को दर्शाते हैं',
      'flashcard.instructions.n3_withLimit': 'इस परीक्षा की समय सीमा {{minutes}} मिनट है (समय समाप्त होने पर स्वतः समाप्त हो जाएगी)',
      'flashcard.instructions.n3_noLimit': 'इस परीक्षा में समय सीमा नहीं है',
      'flashcard.instructions.n4': 'टाइमर दिखाता है कि आपने परीक्षा में कितना समय लिया है',
      'flashcard.instructions.remindersTitle': 'महत्वपूर्ण याद दिलावे:',
      'flashcard.instructions.r1': 'पृष्ठ को रीफ्रेश न करने का प्रयास करें, अन्यथा आपके उत्तर खो सकते हैं।',
      'flashcard.instructions.r2': 'ब्राउज़र बंद न करें और संभव हो तो पावर कट से बचें।',
      'flashcard.instructions.r3': 'जो आप वास्तव में करेंगे वही चुनें, जो आदर्श रूप से करना चाहिए वह नहीं।',
      'flashcard.instructions.r4': 'हर उत्तर जमा करें और सभी उत्तर देने के बाद "समाप्त करें" पर क्लिक करें!',
      'flashcard.instructions.gotIt': 'समझ गया'
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
