"use client";
import React, { useEffect, useState } from "react";
import { Button } from "./ui/Button";
import { GradeType } from "@/lib/types";
import {
  CaretRightFilled,
  CaretLeftFilled,
  ReloadOutlined,
  CalendarOutlined,
  BarcodeOutlined
} from "@ant-design/icons";
import GradeModal from "./ui/GradeModal";
import posthog from "posthog-js";
import GradeLootBoxModal from "./ui/GradeLootBoxModal";
import { useGradesData } from "@/hooks/useGradesData";
import { useScraperLoading } from "@/hooks/useScraperLoading";

interface GradeTableProps {
  session: any;
  gambling: boolean;
}

export function GradeTable({ session, gambling }: GradeTableProps) {
  const {
    data: grades,
    isLoading,
    isFetching,
    isError,
    error,
    refetch
  } = useGradesData(session);

  const { progress, message } = useScraperLoading(isFetching || isLoading);

  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [filteredGrades, setFilteredGrades] = useState<GradeType[]>([]);
  const [selectedGrade, setSelectedGrade] = useState<GradeType | null>(null);
  const [gradeToReveal, setGradeToReveal] = useState<GradeType | null>(null);

  const pageSize = 15;


  function noteBadgeClass(note: number | string) {
    const n = Number(note);
    if (isNaN(n)) return "bg-gray-200 text-gray-800";
    if (n < 10) return "bg-red-100 text-red-800";
    if (n >= 10 && n < 12) return "bg-yellow-100 text-yellow-800";
    return "bg-green-100 text-green-800";
  }

  // --- Effects ---
  useEffect(() => {
    if (!grades) {
      setFilteredGrades([]);
      setCurrentPage(1);
      return;
    }

    const term = searchTerm.trim().toLowerCase();
    const filtered = grades.filter(
      (g) =>
        g.code.toLowerCase().includes(term) ||
        g.note.toString().includes(term) ||
        g.date.includes(term) ||
        g.libelle.toLowerCase().includes(term)
    );

    setFilteredGrades(filtered);
    setCurrentPage(1);
  }, [searchTerm, grades]);

  // --- Pagination Calculation ---
  const totalPages = Math.max(1, Math.ceil(filteredGrades.length / pageSize));
  const startIndex = (currentPage - 1) * pageSize;
  const currentGrades = filteredGrades.slice(startIndex, startIndex + pageSize);

  // --- Handlers ---
  const onRowClick = (grade: GradeType) => {
    const noteAsNumber = Number(grade.note);

    if (grade.isNew && !isNaN(noteAsNumber) && gambling) {
      setGradeToReveal(grade);
      setSelectedGrade(null);
    } else {
      if (posthog.has_opted_in_capturing()) {
        posthog.capture("view_grade_detail_event", {
          grade_code: grade.code,
        });
      }
      setSelectedGrade(grade);
      setGradeToReveal(null);
    }
  };

  const handleRevealComplete = () => {
    if (!gradeToReveal) return;
    if (posthog.has_opted_in_capturing()) {
      posthog.capture("view_grade_detail_event", {
        grade_code: gradeToReveal.code,
        was_revealed: true,
      });
    }
    const revealedGrade = { ...gradeToReveal, isNew: false };
    setFilteredGrades((prevGrades) =>
      prevGrades.map((g) => (g.code === revealedGrade.code ? revealedGrade : g))
    );
    setSelectedGrade(revealedGrade);
    setGradeToReveal(null);
  };

  // --- Render Helpers ---
  const renderGradeBadge = (g: GradeType) => {
    const isRevealabale = g.isNew && !isNaN(Number(g.note)) && gambling;
    const noteClass = isRevealabale 
      ? "bg-ButtonPrimaryBackground text-textPrimary font-extrabold shadow-md" 
      : noteBadgeClass(g.note);
    const noteText = isRevealabale ? "?" : g.note;

    return (
      <span className={`inline-flex items-center justify-center h-10 w-10 rounded-xl text-sm font-bold ${noteClass}`}>
        {noteText}
      </span>
    );
  };

  return (
    <div className="flex flex-col md:h-full relative w-full">
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
          <div className="flex-1 min-h-0 flex flex-col">
            {currentGrades.length === 0 ? (
               <div className="text-center text-textTertiary py-12 bg-backgroundPrimary rounded-xl border border-backgroundSecondary">
                  Aucune note trouvée.
               </div>
            ) : (
              <>
                {/* ================= MOBILE VIEW: CARD LIST (< md) ================= */}

                <div className="md:hidden space-y-3 pb-2">
                  {currentGrades.map((g) => (
                    <div 
                      key={g.code}
                      onClick={() => onRowClick(g)}
                      className={`
                        relative flex items-center justify-between p-4 rounded-2xl border border-backgroundSecondary bg-backgroundPrimary 
                        active:scale-[0.98] transition-transform touch-manipulation shadow-sm
                        ${g.isNew ? "ring-2 ring-primary ring-offset-1" : ""}
                      `}
                    >
                       {/* Left Side: Info */}
                       <div className="flex-1 pr-4 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            {g.isNew && <span className="text-[10px] bg-primary text-white px-1.5 py-0.5 rounded-md font-bold uppercase tracking-wide">New</span>}
                            <h3 className="font-semibold text-textPrimary text-sm truncate w-full" title={g.libelle}>
                              {g.libelle}
                            </h3>
                          </div>
                          <div className="flex items-center gap-3 text-xs text-textTertiary">
                             <span className="flex items-center gap-1"><CalendarOutlined /> {g.date}</span>
                             <span className="w-px h-3 bg-border/50"></span>
                             <span className="flex items-center gap-1 truncate"><BarcodeOutlined /> {g.code}</span>
                          </div>
                       </div>

                       {/* Right Side: Grade */}
                       <div className="shrink-0">
                          {renderGradeBadge(g)}
                       </div>
                    </div>
                  ))}
                </div>

                {/* ================= DESKTOP VIEW: TABLE (>= md) ================= */}
                {/* Hidden on small screens */}
                <div className="hidden md:block flex-1 overflow-auto rounded-t-lg bg-backgroundPrimary border border-backgroundSecondary">
                  <table className="table-fixed min-w-full text-sm divide-y divide-gray-200">
                    <thead className="bg-backgroundTertiary uppercase text-xs font-semibold z-10 sticky top-0">
                      <tr>
                        <th className="px-4 py-3 text-left w-1/3">Libellé</th>
                        <th className="px-4 py-3 text-left w-24">Note</th>
                        <th className="px-4 py-3 text-left w-32">Date</th>
                        <th className="px-4 py-3 text-left w-32">Code</th>
                      </tr>
                    </thead>
                    <tbody className="text-textSecondary divide-y divide-gray-100">
                      {currentGrades.map((g) => {
                        const isRevealabale = g.isNew && !isNaN(Number(g.note)) && gambling;
                        const rowBg = g.isNew ? "bg-primary/5" : "hover:bg-backgroundSecondary";
                        
                        return (
                          <tr
                            key={g.code}
                            onClick={() => onRowClick(g)}
                            className={`${rowBg} transition-colors cursor-pointer`}
                          >
                            <td className="px-4 py-3 align-middle truncate" title={g.libelle}>
                              {g.isNew && (
                                <span className="inline-block bg-primary text-white text-[10px] font-bold px-1.5 py-0.5 rounded mr-2">
                                  NEW
                                </span>
                              )}
                              {g.libelle}
                            </td>
                            <td className="px-4 py-3 font-semibold">
                              {isRevealabale ? (
                                <span className="bg-primary text-white px-2 py-1 rounded-lg font-bold shadow-sm">?</span>
                              ) : (
                                <span className={`px-2 py-1 rounded-lg ${noteBadgeClass(g.note)}`}>
                                  {g.note}
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-textTertiary">{g.date}</td>
                            <td className="px-4 py-3 text-textTertiary text-xs font-mono">{g.code}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>

          {/* --- Pagination --- */}
          <div className="
            mt-4 md:mt-0
            md:sticky md:bottom-0 md:z-40
            flex justify-between items-center 
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
              Page {currentPage} / {totalPages}
            </span>
            <Button
              onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
              disabled={currentPage === totalPages}
              status="secondary"
            >
              <CaretRightFilled />
            </Button>
          </div>

          {/* --- Modals --- */}
          {selectedGrade && (
            <GradeModal grade={selectedGrade} onClose={() => setSelectedGrade(null)} />
          )}
          {gradeToReveal && (
            <GradeLootBoxModal
              grade={gradeToReveal}
              onClose={() => setGradeToReveal(null)}
              onComplete={handleRevealComplete}
            />
          )}
        </>
      )}
    </div>
  );
}