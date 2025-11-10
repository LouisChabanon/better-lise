"use client";
import React, { useEffect, useState } from "react";
import { Button } from "./ui/Button";
import { GradeType } from "@/lib/types";
import {
  CaretRightFilled,
  CaretLeftFilled,
  LogoutOutlined,
  ReloadOutlined,
} from "@ant-design/icons";
import GradeModal from "./ui/GradeModal";
import posthog from "posthog-js";
import GradeLootBoxModal from "./ui/GradeLootBoxModal";
import { useGradesData } from "@/hooks/useGradesData";

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

  // Update filtered list whenever grades or the search term change
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

  const totalPages = Math.max(1, Math.ceil(filteredGrades.length / pageSize));
  const startIndex = (currentPage - 1) * pageSize;
  const currentGrades = filteredGrades.slice(startIndex, startIndex + pageSize);

  // Open modal when a grade row is clicked
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

    // Create a new grade object with isNew set to false
    const revealedGrade = { ...gradeToReveal, isNew: false };

    // Update the filteredGrades state to reflect the change
    setFilteredGrades((prevGrades) =>
      prevGrades.map((g) =>
        g.code === revealedGrade.code ? revealedGrade : g
      )
    );

    // Open the regular details modal with the updated grade
    setSelectedGrade(revealedGrade);
    // Close the lootbox modal
    setGradeToReveal(null);
  };

  return (
    <>
      <div className="flex flex-row sm:items-center sm:justify-between mb-4 gap-2">
        <input
          type="text"
          placeholder="Rechercher..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          disabled={isFetching}
          className="px-4 py-2 border border-buttonSecondaryBorder bg-backgroundSecondary rounded-md w-full sm:w-1/2 focus:outline-none focus:ring-2"
        />
        <Button status="primary" onClick={() => refetch()} disabled={isFetching}><ReloadOutlined /></Button>
      </div>
      {isFetching ? (
        <div className="text-center text-textTertiary py-8 bg-backgroundPrimary rounded-lg w-full h-full animate-pulse flex flex-col items-center justify-center">
          <div>
            <svg
              className="mr-3 size-5 animate-spin inline-block"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth={4}
              ></circle>
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              ></path>
            </svg>
            En attente de Lise ... (c'est long)
          </div>
        </div>
      ) : isError ? (
        <div className="text-center text-error p-8">
          Erreur lors du chargement des notes: {(error as Error).message}
        </div>
      ) :(
        <>
          <div className="overflow-auto h-full rounded-lg bg-backgroundPrimary">
            <table className="table-fixed min-w-full text-sm divide-y divide-gray-200">
              <thead className="bg-backgroundTertiary uppercase text-xs font-semibold sticky top-0 z-10">
                <tr>
                  <th className="px-4 py-3 text-left w-1/3 min-w-[150px]">
                    Libellé
                  </th>
                  <th className="px-4 py-3 text-left left-0 z-20 min-w-[96px]">
                    Note
                  </th>
                  <th className="px-4 py-3 text-left w-1/6 min-w-[110px]">
                    Date
                  </th>
                  <th className="px-4 py-3 text-left w-1/6 min-w-[120px]">
                    Code
                  </th>
                </tr>
              </thead>
              <tbody className="text-textSecondary">
                {currentGrades.length === 0 && (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-6 py-8 text-center text-textTertiary"
                    >
                      Aucune note trouvée.
                    </td>
                  </tr>
                )}

                {currentGrades.map((g) => {
                  const isRevealabale = g.isNew && !isNaN(Number(g.note)) && gambling;
                  const isNewClass = g.isNew ? "bg-eventDefaultBg" : "";
                  const baseRow = `transition hover:shadow-sm hover:bg-backgroundSecondary ${isNewClass}`;

                  const noteClass = isRevealabale ? "bg-ButtonPrimaryBackground text-textPrimary font-extrabold" : noteBadgeClass(g.note);

                  const noteText = isRevealabale ? "*****" : g.note;

                  return (
                    <tr
                      key={g.code}
                      onClick={() => onRowClick(g)}
                      className={`${baseRow} hover:cursor-pointer text-sm sm:text-base`}
                    >
                      <td
                        title={g.libelle}
                        className="px-4 py-4 align-top max-w-[300px] overflow-hidden text-ellipsis"
                      >
                        {g.isNew && (
                          <span className="inline-block bg-on-primary text-white text-[10px] font-semibold px-2 py-0.5 rounded-full mr-2">
                            🔥New
                          </span>
                        )}
                        <span className="align-middle">{g.libelle}</span>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap font-semibold">
                        <span
                          className={`inline-flex items-center justify-center px-3 py-1 rounded-full text-sm font-medium ${noteClass}`}
                        >
                          {noteText}
                        </span>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap overflow-hidden text-ellipsis">
                        {g.date}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap max-w-[300px] overflow-hidden text-ellipsis">
                        {g.code}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Grade modal display */}
          {selectedGrade && (
            <GradeModal
              grade={selectedGrade}
              onClose={() => setSelectedGrade(null)}
            />
          )}

          {gradeToReveal && (
            <GradeLootBoxModal
              grade={gradeToReveal}
              onClose={() => setGradeToReveal(null)}
              onComplete={handleRevealComplete}
            />
          )}

          {/* Pagination Controls */}
          <div className="mt-4 flex justify-between items-center">
            <Button
              onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
              disabled={currentPage === 1}
              status="secondary"
            >
              <CaretLeftFilled />
            </Button>
            <span className="text-sm text-textTertiary">
              Page {currentPage} of {totalPages}
            </span>
            <Button
              onClick={() =>
                setCurrentPage((p) => Math.min(p + 1, totalPages))
              }
              disabled={currentPage === totalPages}
              status="secondary"
            >
              <CaretRightFilled />
            </Button>
          </div>
        </>
      )}
    </>
  );
}