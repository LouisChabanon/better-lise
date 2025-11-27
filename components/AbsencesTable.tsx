"use client";
import React, { useEffect, useState, useMemo } from "react";
import { Button } from "./ui/Button";
import { AbsenceType } from "@/lib/types";
import { 
  CaretRightFilled, 
  CaretLeftFilled, 
  ReloadOutlined, 
  CalendarOutlined, 
  ClockCircleOutlined,
  UserOutlined,
  InfoCircleOutlined,
  PieChartOutlined,
  CloseOutlined
} from "@ant-design/icons";
import { useAbsencesData } from "@/hooks/useAbsencesData";
import { useScraperLoading } from "@/hooks/useScraperLoading";
import posthog from "posthog-js";

export function AbsencesTable({ session }: { session: any }) {
  const { data, isLoading, isFetching, isError, error, refetch } = useAbsencesData(session);
  
  const absences = data?.absences;
  const stats = data?.stats || [];

  const { progress, message } = useScraperLoading(isFetching || isLoading);

  const [localAbsences, setLocalAbsences] = useState<AbsenceType[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [filteredAbsences, setFilteredAbsences] = useState<AbsenceType[]>([]);

  const [isStatsModalOpen, setIsStatsModalOpen] = useState(false);

  // --- Effects ---
  useEffect(() => {
    if (absences) setLocalAbsences(absences);
  }, [absences]);

  useEffect(() => {
    if (!localAbsences) {
      setFilteredAbsences([]);
      setCurrentPage(1);
      return;
    }
    const term = searchTerm.trim().toLowerCase();
    const filtered = localAbsences.filter((a) =>
      a.cours.toLowerCase().includes(term) ||
      a.date.includes(term) ||
      a.matiere.includes(term) ||
      a.intervenants.toLowerCase().includes(term)
    );
    setFilteredAbsences(filtered);
    setCurrentPage(1);
  }, [searchTerm, localAbsences]);

  // --- Pagination Calculation ---
  const pageSize = 15;
  const totalPages = Math.max(1, Math.ceil(filteredAbsences.length / pageSize));
  const startIndex = (currentPage - 1) * pageSize;
  const currentAbsences = filteredAbsences.slice(startIndex, startIndex + pageSize);

  return (
    <div className="flex flex-col w-full relative md:h-full md:overflow-hidden">
      
      {/* --- Header: Search & Buttons --- */}
      <div className="flex flex-row sm:items-center sm:justify-between mb-4 gap-2 shrink-0">
        <input
          type="text"
          placeholder="Rechercher..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          disabled={isFetching}
          className="px-4 py-2 border border-buttonSecondaryBorder bg-backgroundSecondary rounded-xl w-full sm:w-1/2 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
        />
        <div className="flex gap-2">
            {/* STATS BUTTON */}
            <Button 
                status="secondary" 
                onClick={() => {
                  if(posthog.has_opted_in_capturing()){
                    posthog.capture("absences_stats_click");
                  }
                  setIsStatsModalOpen(true)}}
                disabled={isFetching || stats.length === 0}
            >
                <PieChartOutlined />
                <span className="hidden sm:inline ml-2">Résumé</span>
            </Button>

            <Button status="primary" onClick={() => {
                refetch()
                if(posthog.has_opted_in_capturing()) {
                posthog.capture("absences_refresh");
                }
            }} disabled={isFetching}>
            <ReloadOutlined spin={isFetching} />
            </Button>
        </div>
      </div>

      {/* --- STATS MODAL --- */}
      {isStatsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 animate-in fade-in duration-200">
            <div className="bg-backgroundPrimary w-full max-w-lg rounded-2xl shadow-2xl border border-backgroundSecondary flex flex-col max-h-[80vh] animate-in zoom-in-95 duration-200">
                
                {/* Modal Header */}
                <div className="flex items-center justify-between p-4">
                    <div>
                      <h2 className="text-lg font-bold text-textPrimary flex items-center gap-2">
                          <PieChartOutlined className="text-primary"/>
                          Proportion d'absences
                      </h2>
                      <p className="text-textSecondary text-xs">Propotion d'absence dans une UE. Au dessus de 20% la revalidation est automatique. <strong>Ceci est une estimation, vérifiez sur Lise</strong></p>
                    </div>
                    <Button 
                        onClick={() => setIsStatsModalOpen(false)}
                        status="secondary"
                    >
                        <CloseOutlined />
                    </Button>
                </div>
                {/* Modal Content */}
                <div className="overflow-y-auto p-4 space-y-3">
                    {stats.length === 0 ? (
                         <p className="text-center text-textTertiary">Aucune donnée correspondante.</p>
                    ) : (
                        stats.map((stat, idx) => (
                            <div key={idx} className="flex flex-col bg-backgroundSecondary/50 rounded-xl p-3 border border-primary">
                                <div className="flex justify-between items-start mb-2">
                                    <div className="flex flex-col">
                                        <span className="font-semibold text-textPrimary text-sm">{stat?.name}</span>
                                        <span className="text-xs text-textTertiary font-mono">{stat?.code}</span>
                                    </div>
                                    <div className={`px-2 py-1 rounded-lg text-xs font-bold ${
                                        (stat?.percentage || 0) >= 20 ? 'bg-red-100 text-red-700' : 
                                        (stat?.percentage || 0) >= 10 ? 'bg-orange-100 text-orange-700' :
                                        'bg-green-100 text-green-700'
                                    }`}>
                                        {stat?.percentage.toFixed(1)}%
                                    </div>
                                </div>
                                
                                {/* Progress Bar */}
                                <div className="w-full h-2 bg-backgroundTertiary rounded-full overflow-hidden mb-1 relative">
                                  <div 
                                      className="absolute top-0 bottom-0 w-[2px] bg-black/30 dark:bg-white/30 z-10" 
                                      style={{ left: '20%' }} 
                                      title="Limite de défaillance (20%)"
                                  />
                                    <div 
                                        className={`h-full rounded-full ${
                                            (stat?.percentage || 0) >= 20 ? 'bg-red-500' : 
                                            (stat?.percentage || 0) >= 10 ? 'bg-orange-500' :
                                            'bg-green-500'
                                        }`}
                                        style={{ width: `${Math.min((stat.percentage || 0), 100)}%` }}
                                    />
                                </div>
                                <div className="flex justify-between text-[10px] text-textTertiary">
                                    <span>Absent: {stat?.absentHours}h</span>
                                    <span>Total Module: {stat?.absentHours}h</span>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* Modal Footer */}
                <div className="p-4 border-t border-backgroundSecondary bg-backgroundSecondary/30 rounded-b-2xl">
                    <Button status="secondary" className="w-full" onClick={() => setIsStatsModalOpen(false)}>
                        Fermer
                    </Button>
                </div>
            </div>
        </div>
      )}

      {/* --- Loading / Error States --- */}
      {isFetching ? (
        <div className="w-full flex flex-col items-center justify-center py-12 space-y-4 animate-in fade-in slide-in-from-top-4 duration-500">
           <div className="flex items-center justify-between w-full max-w-md px-1">
               <span className="text-xs font-bold text-textPrimary uppercase tracking-wider animate-pulse">
                   {message}
               </span>
               <span className="text-xs font-mono text-textTertiary">
                   {Math.round(progress)}%
               </span>
           </div>
           <div className="w-full max-w-md h-2 bg-backgroundSecondary border border-buttonSecondaryBorder rounded-full overflow-hidden shadow-inner relative">
               <div 
                   className="absolute top-0 left-0 h-full bg-primary transition-all duration-300 ease-out shadow-[0_0_10px] shadow-primary/50"
                   style={{ width: `${progress}%` }}
               />
               <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full animate-[shimmer_1.5s_infinite]" />
           </div>
           <p className="text-[10px] text-textTertiary max-w-xs text-center pt-2">
               En attente de Lise. C'est long...
           </p>
        </div>
      ) : isError ? (
        <div className="text-center text-error p-8 bg-error/5 rounded-xl border border-error/10">
          Erreur: {(error as Error).message}
        </div>
      ) : (
        <>
          {/* Content Area */}
          <div className="min-h-0 flex flex-col pb-24 md:pb-0 md:flex-1 md:overflow-y-auto">
            {filteredAbsences.length === 0 ? (
               <div className="text-center text-textTertiary py-12 bg-backgroundPrimary rounded-xl border border-backgroundSecondary">
                 Aucune absence trouvée.
               </div>
            ) : (
              <>
                {/* Mobile View */}
                <div className="md:hidden space-y-3 pb-2">
                  {filteredAbsences.map((a, index) => (
                    <div key={index} className="flex flex-col p-4 rounded-2xl border border-backgroundSecondary bg-backgroundPrimary shadow-sm">
                        <div className="flex justify-between items-start mb-2 gap-2">
                          <h3 className="font-semibold text-textPrimary text-sm leading-tight">
                            {a.cours}
                          </h3>
                          <span className="shrink-0 text-xs font-medium bg-backgroundSecondary text-textSecondary px-2 py-1 rounded-lg whitespace-nowrap">
                            {a.date}
                          </span>
                        </div>
                        <div className="flex items-center gap-4 text-xs text-textTertiary mb-2">
                          <div className="flex items-center gap-1">
                             <ClockCircleOutlined />
                             <span>{a.horaire}</span>
                          </div>
                          <div className="flex items-center gap-1 font-semibold text-textSecondary">
                             <span>{a.duree}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-textTertiary mb-2">
                          <UserOutlined />
                          <span className="truncate">{a.intervenants}</span>
                        </div>
                        {a.motif && (
                          <div className="mt-2 pt-2 border-t border-backgroundSecondary flex items-start gap-2 text-xs text-textSecondary">
                             <InfoCircleOutlined className="mt-0.5 text-primary/60" />
                             <span>{a.motif}</span>
                          </div>
                        )}
                    </div>
                  ))}
                </div>

                {/* Desktop View */}
                <div className="hidden md:block flex-1 overflow-auto rounded-t-lg bg-backgroundPrimary border border-backgroundSecondary">
                  <table className="table-fixed min-w-full text-sm divide-y divide-gray-200">
                    <thead className="bg-backgroundTertiary uppercase text-xs font-semibold z-10 sticky top-0">
                      <tr>
                        <th className="px-4 py-3 text-left w-1/6">Date</th>
                        <th className="px-4 py-3 text-left w-1/6">Horaire</th>
                        <th className="px-4 py-3 text-left w-1/6">Durée</th>
                        <th className="px-4 py-3 text-left w-1/6">Cours</th>
                        <th className="px-4 py-3 text-left w-1/6">Intervenants</th>
                        <th className="px-4 py-3 text-left w-1/6">Motif</th>
                      </tr>
                    </thead>
                    <tbody className="text-textSecondary divide-y divide-calendarGridBorder">
                      {currentAbsences.map((a, index) => (
                        <tr key={index} className="hover:bg-backgroundSecondary transition-colors">
                          <td className="px-4 py-4 align-top">
                            <div className="flex items-center gap-2">
                                <CalendarOutlined className="text-textTertiary"/>
                                <span>{a.date}</span>
                            </div>
                          </td>
                          <td className="px-4 py-4 align-top text-textTertiary">{a.horaire}</td>
                          <td className="px-4 py-4 align-top font-semibold">
                             <span className="inline-flex items-center justify-center px-2 py-1 rounded bg-backgroundSecondary text-textPrimary text-xs">
                               {a.duree}
                             </span>
                          </td>
                          <td className="px-4 py-4 align-top truncate" title={a.cours}>{a.cours}</td>
                          <td className="px-4 py-4 align-top truncate text-textTertiary" title={a.intervenants}>{a.intervenants}</td>
                          <td className="px-4 py-4 align-top text-textTertiary truncate" title={a.motif}>
                            {a.motif || "Aucun"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>

          {/* Pagination */}
          <div className="hidden md:flex mt-4 md:mt-0 md:sticky md:bottom-0 md:z-40 justify-between items-center md:p-4 md:bg-backgroundPrimary md:border-t md:border-buttonSecondaryBorder md:shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
            <Button onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))} disabled={currentPage === 1} status="secondary">
              <CaretLeftFilled />
            </Button>
            <span className="text-sm text-textTertiary font-medium">Page {currentPage} of {totalPages}</span>
            <Button onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))} disabled={currentPage === totalPages} status="secondary">
              <CaretRightFilled />
            </Button>
          </div>
        </>
      )}
    </div>
  );
}