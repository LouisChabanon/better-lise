"use client";
import { GradeTable } from '@/components/GradeTable';
import Agenda from '@/components/Agenda';
import { ArrowDownOutlined, ArrowUpOutlined } from '@ant-design/icons';
import { useEffect, useState, useRef } from 'react';


export default function DashboardClientContainer() {

    const [tableInView, setTableInView] = useState(false);
    const gradeTableRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const observer = new IntersectionObserver(([entry]) => {
            setTableInView(entry.isIntersecting),
            { threshold: 0.3 };
        })

        if (gradeTableRef.current) {
            observer.observe(gradeTableRef.current);
        }

        return () => {
            if (gradeTableRef.current) {
                observer.unobserve(gradeTableRef.current);
            }
        }

    }, []);



    return (
        <>
            <div className="w-full md:w-2/3 flex flex-col sm:p-4 bg-white rounded-lg shadow-lg">
                <Agenda />
            </div>
            <div ref={gradeTableRef} id="grade-table" className="w-full md:w-1/3 flex flex-col p-4 bg-white rounded-lg shadow-lg">
                <h2 className="text-xl font-semibold text-primary-400 mb-4">Mes Notes</h2>
                <GradeTable />
            </div>
            <button
                className="fixed bottom-3 left-1/2 transform -translate-x-1/2 z-50 rounded-full bg-primary p-3 px-4 shadow-lg text-white sm:hidden"
                aria-label="Aller au tableau"
                onClick={() => {
                    if(tableInView){
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                    } else {
                        const target = document.getElementById('grade-table');
                        if (target) {
                            target.scrollIntoView({ behavior: 'smooth' });
                        }
                    }
                }}
            >
                {tableInView ? <ArrowUpOutlined /> : <ArrowDownOutlined />}
            </button>
        </>
        );
    }