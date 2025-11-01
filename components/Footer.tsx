import { MailOutlined, GithubOutlined } from "@ant-design/icons";

export default function Footer() {
    return (
    <footer className="bg-backgroundSecondary text-center py-4 block relative z-0">
            <div className="container mx-auto">
                <p className="text-textTertiary text-sm mb-2">
                    &copy; Usiné à Siber'ss par Modo 4! Me223. 2025.
                </p>
                <div className="flex justify-center gap-4 text-textTertiary text-xl">
                    <a href="mailto:louis.chabanon@gadz.org" aria-label="Email">
                        <MailOutlined />
                    </a>
                    <a href="https://github.com/LouisChabanon/better-lise" target="_blank" rel="noopener noreferrer" aria-label="GitHub">
                        <GithubOutlined />
                    </a>
                </div>
            </div>
        </footer>
    );
}