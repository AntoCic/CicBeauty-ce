import { createApp } from "vue";
import App from "./App.vue";
// import * as bootstrap from 'bootstrap';
import { router } from "./router";
import "./main.scss";
import { setupFirebase, initAuth, _CurrentUser, initCicKitStore, cicKitStore, headerStore, toolbarStore } from "cic-kit";
import { firebaseConfig, VAPID_PUBLIC_KEY } from "./firebase-config";
import pkg from '../package.json';

setupFirebase(firebaseConfig, VAPID_PUBLIC_KEY);
export const Auth = initAuth(_CurrentUser);
initCicKitStore({
    packageJson: pkg, defaultViews: {
        ...cicKitStore.defaultViews,
        colorDark: '#542c3a',
        colorAccent: '#e8b3be',
        colorSoft: '#F7F1F2'
    },
    loginCode: '5555'
});

headerStore.defaultTitle = 'Cnc Beauty';
headerStore.title = 'Cnc Beauty';
headerStore.defaultLogoUrl = 'img/logo/logo.svg';
headerStore.logoUrl = 'img/logo/logo.svg';
headerStore.userBtnDefault = false;
headerStore.userBtn = false;

toolbarStore.show = false

const app = createApp(App);
app.use(router);
app.mount("#app");
