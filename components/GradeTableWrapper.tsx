"use client";
import { GradeTable } from "./GradeTable";
import { useEffect, useState } from "react";

export default function GradeTableWrapper({ session }: { session: any }) {
    const [gambling, setGambling] = useState(false);

    useEffect(() => {
        setGambling(localStorage.getItem("gambling") === "true");
    }, []);

    return <GradeTable session={session} gambling={gambling} />;
}