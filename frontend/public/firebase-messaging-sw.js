// public/firebase-messaging-sw.js
importScripts(
  "https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js",
);
importScripts(
  "https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js",
);

// As chaves públicas do Firebase (pode ficar hardcoded aqui, são públicas)
firebase.initializeApp({
  apiKey: "SUA_API_KEY",
  projectId: "SEU_PROJECT_ID",
  messagingSenderId: "SEU_SENDER_ID",
  appId: "SEU_APP_ID",
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log(
    "[firebase-messaging-sw.js] Mensagem recebida em background ",
    payload,
  );

  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: "/favicon.ico", // Ajuste para o logo da ConfirmaMED
    data: payload.data,
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

// Ação de clique na notificação
self.addEventListener("notificationclick", function (event) {
  event.notification.close();
  if (event.notification.data && event.notification.data.url) {
    clients.openWindow(event.notification.data.url);
  }
});
