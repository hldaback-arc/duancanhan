import "@/styles/globals.css";
import type { AppProps } from "next/app";
import { useEffect, useState } from "react";
import { useRouter } from "next/router";

export default function App({ Component, pageProps }: AppProps) {
  const router = useRouter();
  const [isNavigating, setIsNavigating] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    if (typeof window === "undefined") return "light";
    return window.localStorage.getItem("lotus-theme") === "dark" ? "dark" : "light";
  });
  const [locale, setLocale] = useState<"vi" | "en">(() => {
    if (typeof window === "undefined") return "vi";
    return window.localStorage.getItem("lotus-locale") === "en" ? "en" : "vi";
  });

  useEffect(() => {
    const handleStart = () => setIsNavigating(true);
    const handleComplete = () => setIsNavigating(false);

    router.events.on("routeChangeStart", handleStart);
    router.events.on("routeChangeComplete", handleComplete);
    router.events.on("routeChangeError", handleComplete);
    return () => {
      router.events.off("routeChangeStart", handleStart);
      router.events.off("routeChangeComplete", handleComplete);
      router.events.off("routeChangeError", handleComplete);
    };
  }, [router.events]);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.lang = locale;
    window.localStorage.setItem("lotus-theme", theme);
  }, [theme, locale]);

  useEffect(() => {
    window.localStorage.setItem("lotus-locale", locale);
  }, [locale]);

  return (
    <>
      <div className="global-toolbar" aria-label="Cài đặt chung">
        <button type="button" className="utility-toggle" onClick={() => setTheme((current) => (current === "dark" ? "light" : "dark"))}>
          {theme === "dark" ? "☀️ Light" : "🌙 Dark"}
        </button>
        <button type="button" className="utility-toggle" onClick={() => setLocale((current) => (current === "vi" ? "en" : "vi"))}>
          {locale === "vi" ? "VI" : "EN"}
        </button>
      </div>
      <div className={`route-frame${isNavigating ? " route-frame-loading" : ""}`} key={router.asPath}>
        <Component {...pageProps} />
      </div>
    </>
  );
}
