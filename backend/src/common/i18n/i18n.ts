import i18next from "i18next";
import Backend from "i18next-fs-backend";
import path from "path";
import { authNamespace, commonNamespace, pageNamespace } from "./namespaces";

export async function initI18n(): Promise<void> {
  await i18next.use(Backend).init({
    lng: "en",
    fallbackLng: "en",
    supportedLngs: ["en"],
    ns: [commonNamespace, authNamespace, pageNamespace],
    defaultNS: commonNamespace,
    backend: {
      loadPath: path.join(__dirname, "locales/{{lng}}/{{ns}}.json"),
    },
    interpolation: { escapeValue: false },
  });
}
