"use client";
import React, { useEffect, useState } from "react";
import { Button } from "./ui/Button";
import { AbsenceType } from "@/lib/types";
import { CaretRightFilled, CaretLeftFilled, ReloadOutlined } from "@ant-design/icons";

interface VacancyTableProps {
  absences: AbsenceType[] | null;
  isLoading: boolean;
  error: string | null;
  onReload?: () => void;
}

export function AbsencesTable({ absences, isLoading, error, onReload }: VacancyTableProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [fiteredAbsences, setFilteredAbsences] = useState<AbsenceType[]>([]);


  const pageSize = 15;


  useEffect(() => {
    if (!absences) {
      setFilteredAbsences([]);
      setCurrentPage(1);
      return;
    }

    const term = searchTerm.trim().toLowerCase();
    const filtered = absences.filter((a) =>
      a.cours.toLowerCase().includes(term) ||
      a.date.includes(term) ||
      a.matiere.includes(term) ||
      a.intervenants.toLowerCase().includes(term)
    );

    setFilteredAbsences(filtered);
    setCurrentPage(1);
  }, [searchTerm, absences]);

  const totalPages = Math.max(1, Math.ceil(fiteredAbsences.length / pageSize));
  const startIndex = (currentPage - 1) * pageSize;
  const currentAbsences = fiteredAbsences.slice(startIndex, startIndex + pageSize);


    return (
      <>
      {/* Header: Search + Reload */}
        <div className="flex flex-row sm:items-center sm:justify-between mb-4 gap-2">
          <input
            type="text"
            placeholder="Rechercher..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            disabled={isLoading}
            className="px-4 py-2 border border-buttonSecondaryBorder bg-backgroundSecondary rounded-md w-full sm:w-1/2 focus:outline-none focus:ring-2"
          />
          {onReload && (
          <Button status="primary" onClick={onReload} disabled={isLoading}><ReloadOutlined /></Button>
          )}
        </div>
      {isLoading ? (
          <div className="text-center text-textTertiary py-8 bg-backgroundPrimary rounded-lg w-full h-full animate-pulse flex flex-col items-center justify-center">
            <div>
              <svg className="mr-3 size-5 animate-spin inline-block" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth={4}></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            En attente de Lise ... (c'est long)
            </div>
            </div>
        ) : (
          <>
            <div className="overflow-auto h-full rounded-lg bg-backgroundPrimary">
              <table className="table-fixed rounded-lg min-w-full text-sm divide-y divide-gray-200">
                <thead className="bg-backgroundTertiary uppercase text-xs font-semibold sticky top-0 z-10">
                  <tr>
                    <th className="px-4 py-3 text-left w-1/6">Date</th>
                    <th className="px-4 py-3 text-left w-1/6">Horaire</th>
                    <th className="px-4 py-3 text-left w-1/6">Durée</th>
                    <th className="px-4 py-3 text-left w-1/6">Cours</th>
                    <th className="px-4 py-3 text-left w-1/6">Intervenants</th>
                    <th className="px-4 py-3 text-left w-1/6">Motif</th>
                  </tr>
                </thead>
                <tbody className="text-textSecondary">
                  {currentAbsences.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-6 py-8 text-center text-textTertiary">Aucune absence trouvée.</td>
                    </tr>
                  )}

                  {currentAbsences.map((a) => {
                    const baseRow = `transition hover:shadow-sm hover:bg-backgroundSecondary`;
                    return (
                      <tr key={a.date + a.horaire} className={`${baseRow} hover:cursor-pointer text-sm sm:text-base`}>
                        <td title={a.date} className="px-4 py-4 align-top max-w-[300px] overflow-hidden text-ellipsis">
                          <span className="align-middle">{a.date}</span>
                        </td>
                        <td title={a.horaire} className="px-4 py-4 align-top max-w-[300px] overflow-hidden text-ellipsis">
                          <span className="align-middle">{a.horaire}</span>
                        </td>
                        <td title={a.duree} className="px-4 py-4 whitespace-nowrap font-semibold">
                          <span className={`inline-flex items-center justify-center px-3 py-1 text-sm font-medium`}>
                            {a.duree}
                          </span>
                        </td>
                        <td title={a.cours} className="px-4 py-4 whitespace-nowrap overflow-hidden text-ellipsis">{a.cours}</td>
                        <td title={a.intervenants} className="px-4 py-4 whitespace-nowrap overflow-hidden text-ellipsis">{a.intervenants}</td>
                        <td title={a.motif} className="px-4 py-4 whitespace-nowrap overflow-hidden text-ellipsis">{a.motif !== "" ? a.motif : "Aucun"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

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
                onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
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