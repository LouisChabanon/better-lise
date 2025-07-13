"use client";
import { GradeTable } from '@/components/GradeTable';
import Agenda from '@/components/Agenda';
import { ArrowDownOutlined } from '@ant-design/icons';

export default function DashboardClientContainer(gradeData: { data: any }) {
    return (
        <>
            <div className="w-full md:w-2/3 flex flex-col sm:p-4 bg-white rounded-lg shadow-lg">
                <Agenda />
            </div>
            <div className="w-full md:w-1/3 flex flex-col p-4 bg-white rounded-lg shadow-lg">
                <h2 className="text-xl font-semibold text-primary-400 mb-4">Mes Notes</h2>
                <GradeTable grades={gradeData.data} />
            </div>
            <button
            className="fixed bottom-4 right-4 z-50 rounded-full bg-primary p-3 shadow-lg text-white sm:hidden"
            aria-label="Aller au tableau"
            onClick={() => {
                window.scrollTo({
                    top: document.body.scrollHeight,
                    behavior: 'smooth'
                });
            }}
            >
            <ArrowDownOutlined />
            </button>
        </>
        );
    }