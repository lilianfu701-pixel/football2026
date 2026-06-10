"use client";

import { useEffect, useState } from "react";
import { Check, Download, MoreVertical, X } from "lucide-react";

type Platform = "ios" | "android" | "other";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

declare global {
  interface Navigator {
    standalone?: boolean;
  }
}

interface MobileInstallPromptProps {
  locale: string;
  force?: boolean;
  allowDismiss?: boolean;
}

type CopyShape = {
  title: string;
  subtitle: string;
  installed: string;
  install: string;
  later: string;
  scanTitle: string;
  scanHint: string;
  iosTitle: string;
  androidTitle: string;
  androidManual: string;
  otherTitle: string;
  otherManual: string;
  footer: string;
  steps: [string, string, string, string];
};

const copy: Record<string, CopyShape> = {
  zh: {
    title: "添加 Football2026 到桌面",
    subtitle: "添加完成后，下次直接点击手机桌面图标进入助威。",
    installed: "已通过桌面快捷方式打开",
    install: "一键安装",
    later: "稍后",
    scanTitle: "扫码打开",
    scanHint: "使用手机相机扫描二维码，或在 Safari 中输入网址。",
    iosTitle: "iPhone 添加步骤",
    androidTitle: "Android 快捷安装",
    androidManual: "如果没有弹出安装窗口，请点击浏览器菜单，再选择”安装应用”或”添加到主屏幕”。",
    otherTitle: "添加快捷方式",
    otherManual: "请在浏览器菜单中选择”安装应用”或”添加到主屏幕”。",
    footer: "网页版本功能已精简，请优先添加桌面快捷方式。",
    steps: [
      "使用 Safari 浏览器打开网址",
      "点击屏幕底部的分享按钮",
      "在菜单中选择”添加到主屏幕”",
      "点击右上角”添加”，桌面将出现图标",
    ],
  },
  en: {
    title: "Add Football2026 to Home Screen",
    subtitle: "Open predictions directly from your phone icon next time.",
    installed: "Opened from your shortcut",
    install: "Install",
    later: "Later",
    scanTitle: "Scan to open",
    scanHint: "Scan this QR code with your phone camera, or enter the URL in Safari.",
    iosTitle: "iPhone setup",
    androidTitle: "Android quick install",
    androidManual: "If no install window appears, open the browser menu and choose Install app or Add to Home screen.",
    otherTitle: "Create a shortcut",
    otherManual: "Use your browser menu and choose Install app or Add to Home screen.",
    footer: "The browser version is simplified. Add the shortcut for the full experience.",
    steps: [
      "Open the URL in Safari",
      "Tap the Share button at the bottom",
      "Choose Add to Home Screen",
      "Tap Add. The icon will appear on your Home Screen",
    ],
  },
  es: {
    title: "Añade Football2026 a la pantalla de inicio",
    subtitle: "La próxima vez accede directamente desde el icono en tu teléfono.",
    installed: "Abierto desde tu acceso directo",
    install: "Instalar",
    later: "Después",
    scanTitle: "Escanear para abrir",
    scanHint: "Escanea este código QR con la cámara de tu teléfono, o escribe la URL en Safari.",
    iosTitle: "Configuración en iPhone",
    androidTitle: "Instalación rápida en Android",
    androidManual: "Si no aparece la ventana de instalación, abre el menú del navegador y elige Instalar app o Añadir a pantalla de inicio.",
    otherTitle: "Crear acceso directo",
    otherManual: "Usa el menú del navegador y elige Instalar app o Añadir a pantalla de inicio.",
    footer: "La versión del navegador es simplificada. Añade el acceso directo para la experiencia completa.",
    steps: [
      "Abre la URL en Safari",
      "Toca el botón Compartir en la parte inferior",
      "Elige Añadir a pantalla de inicio",
      "Toca Añadir. El icono aparecerá en tu pantalla de inicio",
    ],
  },
  fr: {
    title: "Ajouter Football2026 à l'écran d'accueil",
    subtitle: "Accède directement aux pronostics depuis l'icône sur ton téléphone.",
    installed: "Ouvert depuis ton raccourci",
    install: "Installer",
    later: "Plus tard",
    scanTitle: "Scanner pour ouvrir",
    scanHint: "Scanne ce code QR avec l'appareil photo de ton téléphone, ou entre l'URL dans Safari.",
    iosTitle: "Configuration sur iPhone",
    androidTitle: "Installation rapide Android",
    androidManual: "Si aucune fenêtre d'installation n'apparaît, ouvre le menu du navigateur et choisis Installer l'application ou Ajouter à l'écran d'accueil.",
    otherTitle: "Créer un raccourci",
    otherManual: "Utilise le menu du navigateur et choisis Installer l'application ou Ajouter à l'écran d'accueil.",
    footer: "La version navigateur est simplifiée. Ajoute le raccourci pour une expérience complète.",
    steps: [
      "Ouvre l'URL dans Safari",
      "Appuie sur le bouton Partager en bas",
      "Choisis Ajouter à l'écran d'accueil",
      "Appuie sur Ajouter. L'icône apparaîtra sur ton écran d'accueil",
    ],
  },
  de: {
    title: "Football2026 zum Home-Bildschirm hinzufügen",
    subtitle: "Öffne Prognosen direkt über das Icon auf deinem Telefon.",
    installed: "Über deine Verknüpfung geöffnet",
    install: "Installieren",
    later: "Später",
    scanTitle: "Zum Öffnen scannen",
    scanHint: "Scanne diesen QR-Code mit deiner Handykamera oder gib die URL in Safari ein.",
    iosTitle: "iPhone-Einrichtung",
    androidTitle: "Schnellinstallation Android",
    androidManual: "Falls kein Installfenster erscheint, öffne das Browsermenü und wähle App installieren oder Zum Startbildschirm hinzufügen.",
    otherTitle: "Verknüpfung erstellen",
    otherManual: "Nutze das Browsermenü und wähle App installieren oder Zum Startbildschirm hinzufügen.",
    footer: "Die Browserversion ist vereinfacht. Füge die Verknüpfung für das vollständige Erlebnis hinzu.",
    steps: [
      "Öffne die URL in Safari",
      "Tippe auf den Teilen-Button unten",
      "Wähle Zum Home-Bildschirm hinzufügen",
      "Tippe auf Hinzufügen. Das Icon erscheint auf deinem Home-Bildschirm",
    ],
  },
  pt: {
    title: "Adicionar Football2026 à tela inicial",
    subtitle: "Acesse as previsões direto pelo ícone no seu celular na próxima vez.",
    installed: "Aberto pelo seu atalho",
    install: "Instalar",
    later: "Depois",
    scanTitle: "Escanear para abrir",
    scanHint: "Escaneie este QR code com a câmera do seu celular ou acesse a URL no Safari.",
    iosTitle: "Configuração no iPhone",
    androidTitle: "Instalação rápida Android",
    androidManual: "Se a janela de instalação não aparecer, abra o menu do navegador e escolha Instalar app ou Adicionar à tela inicial.",
    otherTitle: "Criar atalho",
    otherManual: "Use o menu do navegador e escolha Instalar app ou Adicionar à tela inicial.",
    footer: "A versão do navegador é simplificada. Adicione o atalho para a experiência completa.",
    steps: [
      "Abra a URL no Safari",
      "Toque no botão Compartilhar na parte inferior",
      "Escolha Adicionar à Tela de Início",
      "Toque em Adicionar. O ícone aparecerá na sua tela inicial",
    ],
  },
  ru: {
    title: "Добавить Football2026 на главный экран",
    subtitle: "В следующий раз открывай прогнозы прямо с иконки на телефоне.",
    installed: "Открыто через ярлык",
    install: "Установить",
    later: "Позже",
    scanTitle: "Сканировать для открытия",
    scanHint: "Отсканируй QR-код камерой телефона или введи адрес в Safari.",
    iosTitle: "Настройка на iPhone",
    androidTitle: "Быстрая установка Android",
    androidManual: "Если окно установки не появилось, открой меню браузера и выбери Установить приложение или Добавить на главный экран.",
    otherTitle: "Создать ярлык",
    otherManual: "Открой меню браузера и выбери Установить приложение или Добавить на главный экран.",
    footer: "Браузерная версия упрощена. Добавь ярлык для полного опыта.",
    steps: [
      "Открой URL в Safari",
      "Нажми кнопку «Поделиться» внизу экрана",
      "Выбери «Добавить на экран «Домой»»",
      "Нажми «Добавить». Иконка появится на главном экране",
    ],
  },
  ar: {
    title: "أضف Football2026 إلى الشاشة الرئيسية",
    subtitle: "افتح التوقعات مباشرةً من أيقونة هاتفك في المرة القادمة.",
    installed: "تم الفتح من اختصارك",
    install: "تثبيت",
    later: "لاحقاً",
    scanTitle: "امسح للفتح",
    scanHint: "امسح رمز QR هذا بكاميرا هاتفك، أو أدخل الرابط في Safari.",
    iosTitle: "إعداد iPhone",
    androidTitle: "تثبيت سريع على Android",
    androidManual: "إذا لم تظهر نافذة التثبيت، افتح قائمة المتصفح واختر تثبيت التطبيق أو إضافة إلى الشاشة الرئيسية.",
    otherTitle: "إنشاء اختصار",
    otherManual: "استخدم قائمة المتصفح واختر تثبيت التطبيق أو إضافة إلى الشاشة الرئيسية.",
    footer: "إصدار المتصفح مبسّط. أضف الاختصار للتجربة الكاملة.",
    steps: [
      "افتح الرابط في Safari",
      "اضغط على زر المشاركة في الأسفل",
      "اختر إضافة إلى الشاشة الرئيسية",
      "اضغط إضافة. ستظهر الأيقونة على شاشتك الرئيسية",
    ],
  },
  ja: {
    title: "Football2026をホーム画面に追加",
    subtitle: "次回からはスマホのアイコンから直接アクセスできます。",
    installed: "ショートカットから開いています",
    install: "インストール",
    later: "あとで",
    scanTitle: "スキャンして開く",
    scanHint: "スマホのカメラでQRコードをスキャンするか、SafariにURLを入力してください。",
    iosTitle: "iPhoneの設定手順",
    androidTitle: "Androidクイックインストール",
    androidManual: "インストール画面が表示されない場合は、ブラウザのメニューを開き「アプリをインストール」または「ホーム画面に追加」を選択してください。",
    otherTitle: "ショートカットを作成",
    otherManual: "ブラウザのメニューから「アプリをインストール」または「ホーム画面に追加」を選択してください。",
    footer: "ブラウザ版は機能が制限されています。ショートカットを追加して全機能をご利用ください。",
    steps: [
      "SafariでURLを開く",
      "画面下部の共有ボタンをタップ",
      "「ホーム画面に追加」を選択",
      "「追加」をタップ。アイコンがホーム画面に表示されます",
    ],
  },
  ko: {
    title: "Football2026을 홈 화면에 추가",
    subtitle: "다음부터 폰 아이콘에서 바로 예측을 열 수 있어요.",
    installed: "바로가기에서 열었습니다",
    install: "설치",
    later: "나중에",
    scanTitle: "스캔해서 열기",
    scanHint: "폰 카메라로 QR 코드를 스캔하거나 Safari에 URL을 입력하세요.",
    iosTitle: "iPhone 설정 방법",
    androidTitle: "Android 빠른 설치",
    androidManual: "설치 창이 뜨지 않으면 브라우저 메뉴를 열고 앱 설치 또는 홈 화면에 추가를 선택하세요.",
    otherTitle: "바로가기 만들기",
    otherManual: "브라우저 메뉴에서 앱 설치 또는 홈 화면에 추가를 선택하세요.",
    footer: "브라우저 버전은 기능이 제한되어 있습니다. 바로가기를 추가하고 모든 기능을 이용하세요.",
    steps: [
      "Safari에서 URL 열기",
      "화면 하단의 공유 버튼 탭",
      "홈 화면에 추가 선택",
      "추가 탭. 아이콘이 홈 화면에 나타납니다",
    ],
  },
  vi: {
    title: "Thêm Football2026 vào màn hình chính",
    subtitle: "Lần sau mở thẳng từ biểu tượng trên điện thoại của bạn.",
    installed: "Đã mở từ lối tắt của bạn",
    install: "Cài đặt",
    later: "Để sau",
    scanTitle: "Quét để mở",
    scanHint: "Quét mã QR này bằng camera điện thoại, hoặc nhập URL vào Safari.",
    iosTitle: "Cài đặt trên iPhone",
    androidTitle: "Cài nhanh Android",
    androidManual: "Nếu không thấy cửa sổ cài đặt, mở menu trình duyệt và chọn Cài đặt ứng dụng hoặc Thêm vào màn hình chính.",
    otherTitle: "Tạo lối tắt",
    otherManual: "Dùng menu trình duyệt và chọn Cài đặt ứng dụng hoặc Thêm vào màn hình chính.",
    footer: "Phiên bản trình duyệt bị giới hạn tính năng. Thêm lối tắt để trải nghiệm đầy đủ.",
    steps: [
      "Mở URL trong Safari",
      "Nhấn nút Chia sẻ ở cuối màn hình",
      "Chọn Thêm vào màn hình chính",
      "Nhấn Thêm. Biểu tượng sẽ xuất hiện trên màn hình chính",
    ],
  },
  id: {
    title: "Tambahkan Football2026 ke Layar Utama",
    subtitle: "Buka prediksi langsung dari ikon di ponselmu lain kali.",
    installed: "Dibuka dari pintasan kamu",
    install: "Instal",
    later: "Nanti",
    scanTitle: "Pindai untuk membuka",
    scanHint: "Pindai kode QR ini dengan kamera ponselmu, atau masukkan URL di Safari.",
    iosTitle: "Panduan iPhone",
    androidTitle: "Instal cepat Android",
    androidManual: "Jika jendela instalasi tidak muncul, buka menu browser dan pilih Instal aplikasi atau Tambahkan ke layar utama.",
    otherTitle: "Buat pintasan",
    otherManual: "Gunakan menu browser dan pilih Instal aplikasi atau Tambahkan ke layar utama.",
    footer: "Versi browser memiliki fitur terbatas. Tambahkan pintasan untuk pengalaman lengkap.",
    steps: [
      "Buka URL di Safari",
      "Ketuk tombol Bagikan di bagian bawah",
      "Pilih Tambahkan ke Layar Utama",
      "Ketuk Tambahkan. Ikon akan muncul di layar utamamu",
    ],
  },
};

function getStepImages(locale: string): [string, string, string, string] {
  const zh = locale === "zh";
  return [
    "/mobile-install/safari.jpg",
    zh ? "/mobile-install/share.jpg"       : "/mobile-install/share-en.png",
    zh ? "/mobile-install/add-to-home.jpg" : "/mobile-install/add-to-home-en.png",
    zh ? "/mobile-install/confirm-add.jpg" : "/mobile-install/confirm-add-en.png",
  ];
}

function getCopy(locale: string): CopyShape {
  return copy[locale] ?? copy.en;
}

function getMobileUrl(locale: string) {
  return locale === "en"
    ? "https://m.football2026.net/m"
    : `https://m.football2026.net/${locale}/m`;
}

function detectPlatform(): Platform {
  const ua = navigator.userAgent.toLowerCase();
  const platform = navigator.platform?.toLowerCase() ?? "";
  const touchMac = platform.includes("mac") && navigator.maxTouchPoints > 1;

  if (/iphone|ipad|ipod/.test(ua) || touchMac) return "ios";
  if (ua.includes("android")) return "android";
  return "other";
}

function isStandaloneMode() {
  return window.matchMedia("(display-mode: standalone)").matches || navigator.standalone === true;
}

export default function MobileInstallPrompt({
  locale,
  force = false,
  allowDismiss = true,
}: MobileInstallPromptProps) {
  const t = getCopy(locale);
  const mobileUrl = getMobileUrl(locale);
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(mobileUrl)}`;
  const [platform, setPlatform] = useState<Platform>("other");
  const [dismissed, setDismissed] = useState(true);
  const [installed, setInstalled] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    setPlatform(detectPlatform());
    setInstalled(isStandaloneMode());
    setDismissed(localStorage.getItem("football2026-install-dismissed-v2") === "1");

    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
      setDismissed(false);
    };

    const handleInstalled = () => {
      setInstalled(true);
      setDeferredPrompt(null);
      localStorage.setItem("football2026-install-dismissed-v2", "1");
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleInstalled);
    };
  }, []);

  async function install() {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    if (choice.outcome === "accepted") {
      localStorage.setItem("football2026-install-dismissed-v2", "1");
      setDismissed(true);
    }
    setDeferredPrompt(null);
  }

  function close() {
    localStorage.setItem("football2026-install-dismissed-v2", "1");
    setDismissed(true);
  }

  if (installed) {
    return (
      <div className="rounded-lg border border-emerald-400/20 bg-emerald-400/10 px-3 py-2 text-[15px] font-bold text-emerald-100">
        <span className="inline-flex items-center gap-2">
          <Check className="h-4 w-4" />
          {t.installed}
        </span>
      </div>
    );
  }

  if (!force && dismissed && !deferredPrompt) return null;

  return (
    <section className="overflow-hidden rounded-xl border border-[#FFD700]/55 bg-[#101b2d] shadow-xl shadow-[#FFD700]/10">
      <div className="border-b border-white/10 bg-[linear-gradient(135deg,#172c4d_0%,#112239_56%,#173528_100%)] p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-lg font-black leading-6 text-white">{t.title}</p>
            <p className="mt-1 text-[14px] leading-5 text-slate-300">{t.subtitle}</p>
          </div>
          {allowDismiss && (
            <button
              type="button"
              onClick={close}
              className="rounded-md p-1 text-slate-500 transition hover:bg-white/10 hover:text-white"
              aria-label={t.later}
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <div className="mt-3 grid grid-cols-[7rem_1fr] items-center gap-3 rounded-lg border border-[#FFD700]/25 bg-black/25 p-2.5">
          <img src={qrUrl} alt={t.scanTitle} className="aspect-square w-28 rounded-md bg-white p-1" />
          <div className="min-w-0">
            <p className="text-[15px] font-black text-[#FFD700]">{t.scanTitle}</p>
            <p className="mt-1 text-[13px] leading-4 text-slate-300">{t.scanHint}</p>
            <p className="mt-2 break-all text-[12px] font-bold leading-4 text-white">{mobileUrl}</p>
          </div>
        </div>
      </div>

      {platform === "android" ? (
        <div className="grid gap-3 p-3">
          <p className="text-[15px] font-black text-[#FFD700]">{t.androidTitle}</p>
          {deferredPrompt && (
            <button
              type="button"
              onClick={install}
              className="flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-[#FFD700] px-4 text-[15px] font-black text-[#081120]"
            >
              <Download className="h-4 w-4" />
              {t.install}
            </button>
          )}
          <p className="flex gap-2 rounded-lg border border-white/10 bg-white/[0.04] p-3 text-[14px] leading-5 text-slate-200">
            <MoreVertical className="mt-0.5 h-4 w-4 shrink-0 text-[#FFD700]" />
            {t.androidManual}
          </p>
        </div>
      ) : (
        <div className="grid gap-2.5 p-3">
          <p className="text-[15px] font-black uppercase text-[#FFD700]">{t.iosTitle}</p>
          {t.steps.map((step, index) => (
            <article key={step} className="overflow-hidden rounded-lg border border-white/10 bg-white/[0.045]">
              <div className="flex items-center gap-2 border-b border-white/10 px-2.5 py-2">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#FFD700] text-[13px] font-black text-[#081120]">
                  {index + 1}
                </span>
                <p className="text-[14px] font-bold leading-5 text-white">{step}</p>
              </div>
              <img
                src={getStepImages(locale)[index]}
                alt={step}
                className={index === 0 ? "mx-auto block h-20 w-20 bg-white object-contain" : "block h-auto w-full bg-white object-contain"}
              />
            </article>
          ))}
        </div>
      )}

      <p className="border-t border-white/10 bg-[#2b1722] px-3 py-2.5 text-center text-[13px] leading-4 text-rose-100">
        {t.footer}
      </p>
    </section>
  );
}
