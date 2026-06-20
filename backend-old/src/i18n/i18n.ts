import i18next from "i18next";
import commonJson from "./common.json";
import userJson from "./user.json";
import authJson from "./auth.json";
import loginJson from "./login.json";
import pageJson from "./page.json";

i18next.init({
  lng: "en",
  fallbackLng: "en",
  resources: {
    en: {
      common: commonJson,
      user: userJson,
      auth: authJson,
      login: loginJson,
      page: pageJson,
    },
  },
  interpolation: {
    skipOnVariables: false,
  },
});

export const t = i18next.t.bind(i18next);
export default i18next;
