"use client";
import React, { useEffect, useState } from "react";
import { Button } from "./ui/Button";
import { AbsenceType } from "@/lib/types";
import { 
  CaretRightFilled, 
  CaretLeftFilled, 
  ReloadOutlined, 
  CalendarOutlined, 
  ClockCircleOutlined,
  UserOutlined,
  InfoCircleOutlined
} from "@ant-design/icons";
import { useAbsencesData } from "@/hooks/useAbsencesData";
import { useScraperLoading } from "@/hooks/useScraperLoading";

export function AbsencesTable({ session }: { session: any }) {
  const {
    data,
    isLoading,
    isFetching,
    isError,
    error,
    refetch
  } = useAbsencesData(session);

  const absences = data?.absences;
  const { progress, message } = useScraperLoading(isFetching || isLoading);

  const [localAbsences, setLocalAbsences] = useState<AbsenceType[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [filteredAbsences, setFilteredAbsences] = useState<AbsenceType[]>([]);

  // --- Effects ---
  useEffect(() => {
    if (absences) {
      setLocalAbsences(absences);
    }
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
  
  // Only used for Desktop view now
  const currentAbsences = filteredAbsences.slice(startIndex, startIndex + pageSize);

  return (
    <div className="flex flex-col w-full relative md:h-full md:overflow-hidden">
      
      {/* --- Search Header --- */}
      <div className="flex flex-row sm:items-center sm:justify-between mb-4 gap-2 shrink-0">
        <input
          type="text"
          placeholder="Rechercher..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          disabled={isFetching}
          className="px-4 py-2 border border-buttonSecondaryBorder bg-backgroundSecondary rounded-xl w-full sm:w-1/2 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
        />
        <Button status="primary" onClick={() => refetch()} disabled={isFetching}>
          <ReloadOutlined spin={isFetching} />
        </Button>
      </div>

      {/* --- Loading / Error States --- */}
      {isFetching ? (
        <div className="w-full flex flex-col items-center justify-center py-12 space-y-4 animate-in fade-in slide-in-from-top-4 duration-500">
            {/* Text Label */}
            <div className="flex items-center justify-between w-full max-w-md px-1">
                <span className="text-xs font-bold text-textPrimary uppercase tracking-wider animate-pulse">
                    {message}
                </span>
                <span className="text-xs font-mono text-textTertiary">
                    {Math.round(progress)}%
                </span>
            </div>

            {/* The Bar Container */}
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
          {/* Content Area: Mobile Scroll / Desktop Scroll */}
          <div className="min-h-0 flex flex-col pb-24 md:pb-0 md:flex-1 md:overflow-y-auto">
            
            {filteredAbsences.length === 0 ? (
               <div className="text-center text-textTertiary py-12 bg-backgroundPrimary rounded-xl border border-backgroundSecondary">
                 Aucune absence trouvée.
               </div>
            ) : (
              <>
                {/* ================= MOBILE VIEW: CARD LIST (< md) ================= */}
                <div className="md:hidden space-y-3 pb-2">
                  {filteredAbsences.map((a, index) => (
                    <div 
                      key={index}
                      className="flex flex-col p-4 rounded-2xl border border-backgroundSecondary bg-backgroundPrimary shadow-sm"
                    >
                       {/* Header: Course Name & Date */}
                       <div className="flex justify-between items-start mb-2 gap-2">
                          <h3 className="font-semibold text-textPrimary text-sm leading-tight">
                            {a.cours}
                          </h3>
                          <span className="shrink-0 text-xs font-medium bg-backgroundSecondary text-textSecondary px-2 py-1 rounded-lg whitespace-nowrap">
                            {a.date}
                          </span>
                       </div>

                       {/* Info Row 1: Time & Duration */}
                       <div className="flex items-center gap-4 text-xs text-textTertiary mb-2">
                          <div className="flex items-center gap-1">
                             <ClockCircleOutlined />
                             <span>{a.horaire}</span>
                          </div>
                          <div className="flex items-center gap-1 font-semibold text-textSecondary">
                             <span>{a.duree}</span>
                          </div>
                       </div>

                       {/* Info Row 2: Teachers */}
                       <div className="flex items-center gap-2 text-xs text-textTertiary mb-2">
                          <UserOutlined />
                          <span className="truncate">{a.intervenants}</span>
                       </div>

                       {/* Footer: Reason (if any) */}
                       {a.motif && (
                         <div className="mt-2 pt-2 border-t border-backgroundSecondary flex items-start gap-2 text-xs text-textSecondary">
                            <InfoCircleOutlined className="mt-0.5 text-primary/60" />
                            <span>{a.motif}</span>
                         </div>
                       )}
                    </div>
                  ))}
                </div>

                {/* ================= DESKTOP VIEW: TABLE (>= md) ================= */}
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
                    <tbody className="text-textSecondary divide-y divide-gray-100">
                      {currentAbsences.map((a, index) => (
                        <tr key={index} className="hover:bg-backgroundSecondary transition-colors">
                          <td className="px-4 py-4 align-top">
                            <div className="flex items-center gap-2">
                                <CalendarOutlined className="text-textTertiary"/>
                                <span>{a.date}</span>
                            </div>
                          </td>
                          <td className="px-4 py-4 align-top text-textTertiary">
                            {a.horaire}
                          </td>
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

          {/* --- Pagination --- */}
          <div className="
            hidden md:flex
            mt-4 md:mt-0
            md:sticky md:bottom-0 md:z-40
            justify-between items-center 
            md:p-4 md:bg-backgroundPrimary md:border-t md:border-buttonSecondaryBorder md:shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]
          ">
            <Button
              onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
              disabled={currentPage === 1}
              status="secondary"
            >
              <CaretLeftFilled />
            </Button>
            <span className="text-sm text-textTertiary font-medium">
              Page {currentPage} of {totalPages}
            </span>
            <Button
              onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
              disabled={currentPage === totalPages}
              status="secondary"
            >
              <CaretRightFilled />
            </Button>
          </div>
        </>
      )}
    </div>
  );
}