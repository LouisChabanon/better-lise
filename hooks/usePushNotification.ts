"use client";
import { useState, useEffect } from "react";
import {
	saveSubscription,
	deleteSubscription,
} from "@/actions/PushNotification";

const PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

function urlBase64ToUint8Array(base64String: string) {
	const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
	const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
	const rawData = window.atob(base64);
	const outputArray = new Uint8Array(rawData.length);
	for (let i = 0; i < rawData.length; ++i) {
		outputArray[i] = rawData.charCodeAt(i);
	}
	return outputArray;
}

export function usePushNotification() {
	const [isSubscribed, setIsSubscribed] = useState(false);
	const [isSupported, setIsSupported] = useState(false);
	const [subscription, setSubscription] = useState<PushSubscription | null>(
		null
	);

	useEffect(() => {
		if ("serviceWorker" in navigator && "PushManager" in window) {
			setIsSupported(true);

			navigator.serviceWorker
				.register("/sw.js")
				.then((registration) => {
					console.log("SW Registered scope:", registration.scope);
					return registration.pushManager.getSubscription();
				})
				.then((sub) => {
					if (sub) {
						console.log("Existing subscription found");
						setIsSubscribed(true);
						setSubscription(sub);
					}
				})
				.catch((err) => console.error("SW Register failed", err));
		}
	}, []);

	async function subscribe() {
		console.log("Attempting subscribe...");

		if (!PUBLIC_KEY) {
			console.error("VAPID Public key missing. Check .env file.");
			return false;
		}

		try {
			const registration = await navigator.serviceWorker.ready;
			console.log("SW Ready for subscribe");

			const sub = await registration.pushManager.subscribe({
				userVisibleOnly: true,
				applicationServerKey: urlBase64ToUint8Array(PUBLIC_KEY),
			});

			console.log("Browser subscription successful:", sub);

			const subscriptionJSON = sub.toJSON();

			console.log("Sending to server:", subscriptionJSON);

			const res = await saveSubscription(subscriptionJSON);

			if (res.success) {
				console.log("Server save successful");
				setIsSubscribed(true);
				setSubscription(sub);
				return true;
			} else {
				console.error("Server save failed:", res.error);
				return false;
			}
		} catch (error) {
			console.error("Failed to subscribe flow:", error);
			return false;
		}
	}

	async function unsubscribe() {
		console.log("Attempting unsubscribe...");
		if (!subscription) return false;

		try {
			await subscription.unsubscribe();
			await deleteSubscription(subscription.endpoint);

			setIsSubscribed(false);
			setSubscription(null);
			console.log("Unsubscribe successful");
			return true;
		} catch (error) {
			console.error("Failed to unsubscribe", error);
			return false;
		}
	}

	return { isSupported, isSubscribed, subscribe, unsubscribe };
}
