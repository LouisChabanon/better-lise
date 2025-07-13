import type { FormProps } from "antd";
import { use, useState } from "react";
import { signIn } from "@/actions/Auth";
import { LockOutlined, UserOutlined } from "@ant-design/icons";
import { useRouter } from "next/navigation";
import { LoginForm } from "@/components/LoginForm";
import Link from "next/link";


export default function SignInPage(){

    return (
        <div className=" bg-surface flex flex-col md:flex-row flex-grow">
            <div className="w-full md:w-1/2 md:p-16 p-8 flex flex-col justify-center order-1">
                <h1 className="md:text-5xl text-3xl font-extrabold text-primary mb-6 text-shadow-2xs">Lise. En mieux</h1>
                <p className="text-base sm:text-lg text-gray-600 leading-relaxed space-y-3">
                    <span>
                        Ce site est une interface alternative pour l'application{" "}
                        <Link
                        href="https://lise.ensam.eu"
                        target="_blank"
                        className="text-tertiary font-medium hover:underline"
                        >
                        lise.ensam.eu
                        </Link>{" "}
                        de l'ENSAM.
                    </span>
                    <br />
                    <span>
                        L'interface par défaut de Lise est, honnêtement, une catastrophe.
                        Ce site a été créé pour améliorer l'expérience de consultation.
                    </span>
                    <br />
                    <span>
                        Il ne donne pas accès à toutes les fonctionnalités de Lise, mais permet de <b>consulter tes notes</b>,
                        ton <b>emploi du temps</b> et tes <b>absences</b>.
                    </span>
                    <br />
                    <span className="text-sm text-gray-500">
                        🔐 Ce site ne stocke <b>jamais</b> votre mot de passe Lise. Il sert uniquement à vous authentifier
                        et obtenir un jeton de session temporaire.
                    </span>
                </p>
            </div>
            <div className="w-full md:w-1/2 flex items-center justify-center p-8 md:p-16">
                <div className="max-w-md w-full bg-white p-8 rounded-2xl shadow-lg">
                    <div className="flex flex-col items-center mb-6 text-center gap-2">
                        <h2 className="text-3xl font-bold text-primary">Connexion</h2>
                        <p className="font-medium text-gray-600">Utiliser vos identifiants Lise</p>
                    </div>
                    <LoginForm />
                </div>
            </div>
        </div>
    )

}