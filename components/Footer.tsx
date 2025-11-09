"use client";
import { MailOutlined, GithubOutlined } from "@ant-design/icons";
import posthog from "posthog-js";

export default function Footer() {
    return (
    <footer className="bg-backgroundSecondary text-center py-4 block relative z-0">
            <div className="container mx-auto">
                <p className="text-textTertiary text-sm mb-2">
                    Usiné à Siber'ss par Modo 4! Me223. 2025.
                </p>
                <div className="flex justify-center gap-4 text-textTertiary text-xl">
                    <a href="mailto:louis.chabanon@gadz.org" aria-label="Email" onClick={() => posthog.has_opted_in_capturing() ? posthog.capture('mail_click_event') : ""}>
                        <MailOutlined />
                    </a>
                    <a href="https://github.com/LouisChabanon/better-lise" target="_blank" rel="noopener noreferrer" aria-label="GitHub" onClick={() => posthog.has_opted_in_capturing() ? posthog.capture('github_click_event') : ""}>
                        <GithubOutlined />
                    </a>
                </div>
            </div>
        </footer>
    );
}