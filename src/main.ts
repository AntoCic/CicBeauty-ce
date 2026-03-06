import { createApp } from "vue";
import App from "./App.vue";
// import * as bootstrap from 'bootstrap';
import { router } from "./router";
import "bootstrap/dist/css/bootstrap.min.css";
import "cic-kit/style.css";
import "./main.scss";
import { MotionPlugin } from "@vueuse/motion";
import { setupFirebase, initAuth, _CurrentUser, initCicKitStore, cicKitStore, headerStore, loading } from "cic-kit";
import { firebaseConfig, VAPID_PUBLIC_KEY } from "./firebase-config";
import pkg from '../package.json';
import { applyConsentToAnalytics, bootstrapConsentBeforeFirebase } from "./legal/cookieConsent";
import { CurrentUser } from "./models/CurrentUser";
import { createMotionPresets } from "./motion/presets";

loading.on('loading:initApp');
bootstrapConsentBeforeFirebase(firebaseConfig.measurementId);
setupFirebase(firebaseConfig, VAPID_PUBLIC_KEY);
applyConsentToAnalytics(firebaseConfig.measurementId);
export const Auth = initAuth(CurrentUser);
initCicKitStore({
  packageJson: pkg, defaultViews: {
    ...cicKitStore.defaultViews,
    colorDark: '#542c3a',
    colorAccent: '#e8b3be',
    colorSoft: '#F7F1F2'
  },
  loginCode: '5555',
  debugFirestore: true,
  autoUpdate: false,
  serviceWorkerToast: false,
});
headerStore.defaultTitle = 'Cnc Beauty';
headerStore.title = 'Cnc Beauty';
headerStore.defaultLogoUrl = 'img/logo/logo.svg';
headerStore.logoUrl = 'img/logo/logo.svg';
headerStore.userBtnDefault = false;
headerStore.show = false;

const reduceMotionEnabled = typeof window !== 'undefined'
  ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
  : false

const app = createApp(App);
app.use(MotionPlugin, {
  directives: createMotionPresets(reduceMotionEnabled),
});
app.use(router);
app.mount("#app");
