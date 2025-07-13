import { MailOutlined, GithubOutlined } from "@ant-design/icons";

export default function Footer() {
    return (
        <footer className="bg-surface text-center py-4 mt-auto hidden sm:block">
            <div className="container mx-auto">
                <p className="text-gray-500 text-sm mb-2">
                    &copy; Usiné à Siber'ss par Modo 4! Me223. 2025.
                </p>
                <div className="flex justify-center gap-4 text-gray-500 text-xl">
                    <a href="mailto:louis.chabanon@gadz.org" aria-label="Email">
                        <MailOutlined />
                    </a>
                    <a href="https://github.com/louischabanon" target="_blank" rel="noopener noreferrer" aria-label="GitHub">
                        <GithubOutlined />
                    </a>
                </div>
            </div>
        </footer>
    );
}