"use client";

import { useRouter, usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/Button";
import { logOut } from '@/actions/Auth';
import { LogoutOutlined } from "@ant-design/icons"
import path from "path";
import InstallPrompt from "./InstallBanner";


const MenuBar = () => {
    
    const [disable, setDisable] = useState(false);
    
    const router = useRouter();
    const pathName = usePathname();

    const handleLogOut = async () => {
        await logOut();
        setDisable(true);
        router.push("/login");
        
    }

    useEffect(() => {
        if (pathName === "/login") {
            setDisable(true);
        }
    }, [])


    return (
        <div className="bg-surface shadow justify-between p-2 hidden sm:flex">
            <h1 className="text-2xl text-primary font-bold m-2 "> 
            ☝️🤓 Sl'ass
            </h1>
            <Button onClick={handleLogOut} status="primary" disabled={disable}><div><LogoutOutlined /> Déconnexion</div></Button>
        </div>
    );
}

export default MenuBar;