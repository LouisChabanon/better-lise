self.addEventListener('push', function (event){
    if(!event.data) return;

    const data = event.data.json();
    const title = data.title || "Better Lise";
    const options = {
        body: data.body,
        icon: data.icon || '/apple-touch-icon.png',
        vibrate: [100, 50, 100],
        data: {
            url: data.url || "/"
        }
    };

    event.waitUntil(
        self.registration.showNotification(title, options)
    );
});

self.addEventListener('notificationclick', function (event) {
    event.notification.close();
    event.waitUntil(clients.openWindow(event.notification.data.url))
})