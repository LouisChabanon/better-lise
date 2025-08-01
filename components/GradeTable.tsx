"use client";
import { ReloadOutlined } from "@ant-design/icons";
import React, { useEffect, useState } from "react";
import { getGradeData } from "@/actions/GetGrades";
import { Button } from "./ui/Button";
import { CaretRightFilled, CaretLeftFilled } from "@ant-design/icons";

interface Grade {
  id: number;
  name: string;
  grade: string;
  date: string;
  isNew?: boolean;
}

export function GradeTable(){

  const [grades, setGrades] = useState<Grade[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filteredGrades, setFilteredGrades] = useState<Grade[]>([]);
  
  const pageSize = 50;

  async function fetchGrades(reachServer = false) {
      setIsLoading(true);
      const res = await getGradeData(reachServer);
      if (res.success && res.data) {

      // Sort grades by date in descending order
        const sorted = res.data.sort((a, b) => {
          const [dayA, monthA, yearA] = a.date.split('/').map(Number);
          const [dayB, monthB, yearB] = b.date.split('/').map(Number);
          const timeA = new Date(yearA, monthA - 1, dayA).getTime();
          const timeB = new Date(yearB, monthB - 1, dayB).getTime();
          return timeB - timeA;});

      // Sort new grades to the top
      const sortNew = sorted.sort((a, b) => {
        if (a.isNew && !b.isNew) return -1; // a is new, b is not
        if (!a.isNew && b.isNew) return 1; // b is new, a is not
        return 0; // both are either new or not new
      });
        setGrades(sortNew.map((g) => ({
          id: g.id, 
          name: g.name,
          grade: g.grade,
          date: g.date,
          isNew: g.isNew
      })));
      setIsLoading(false);
    }else{
      setIsLoading(false);
      console.error("Failed to fetch grades:", res.errors || "Unknown error");
    }
  }

  useEffect(() => {
  fetchGrades();
  }, []);

  useEffect(() => {
    const term = searchTerm.toLowerCase();
    const filtered = grades.filter(g =>
      g.name.toLowerCase().includes(term) ||
      g.grade.toString().includes(term) ||
      g.date.includes(term)
    );
    setFilteredGrades(filtered);
    setCurrentPage(1);
  }, [searchTerm, grades]);

  const totalPages = Math.ceil(grades.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const currentGrades = filteredGrades.slice(startIndex, startIndex + pageSize);

    return (
      <>
      {/* Header: Search + Reload */}
        <div className="flex flex-row sm:items-center sm:justify-between mb-4 gap-2">
          <input
            type="text"
            placeholder="Rechercher..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="px-4 py-2 border border-secondary bg-surface rounded-md w-full sm:w-1/2 focus:outline-none focus-ring-2 focus:ring-primary-400"
          />
          <Button
            onClick={() => {fetchGrades(true)}}
            disabled={isLoading}
          >
            <ReloadOutlined />
          </Button>
        </div>
      {isLoading ? (
          <div className="text-center text-gray-500">Chargement...</div>
        ) : (
          <>
            <div className="overflow-auto max-h-[700px] rounded-lg shadow-md">
              <table className="table-auto min-w-full text-sm ">
                <thead className="bg-primary-container uppercase text-xs font-semibold sticky top-0 z-10">
                  <tr>
                    <th className="px-4 py-2 text-left w-1/3 min-w-[150px]">Nom</th>
                    <th className="px-4 py-2 text-left sticky left-0 z-20 min-w-[96px]">Note</th>
                    <th className="px-4 py-2 text-left w-1/3 min-w-[150px]">Date</th>
                  </tr>
                </thead>
                <tbody className="text-gray-700">
                  {currentGrades.map((g) => {
                    let rowClass = "hover:bg-primary-container transition";
                    if (Number(g.grade) < 10) rowClass = "bg-red-100 outline outline-1 outline-red-300 hover:bg-red-200 transition";
                    else if (Number(g.grade) >= 10 && Number(g.grade) < 12) rowClass = "bg-yellow-100 outline outline-1 outline-yellow-300 hover:bg-yellow-200 transition";
                    if (g.isNew) rowClass ="bg-primary-container transition hover:bg-primary-container/50";
                    return (
                      <tr key={g.id} className={`${rowClass} hover:cursor-pointer text-sm sm:text-base`}>
                      <td title={g.name} className="px-4 py-4 whitespace-nowrap max-w-[300px] overflow-hidden text-ellipsis">{g.isNew && (
                      <span className="inline-block bg-on-primary text-white text-[10px] font-semibold px-2 py-0.5 rounded-full">
                        🔥New
                      </span>)} {g.name}
                    </td>
                      <td className="px-4 py-4 whitespace-nowrap font-semibold sticky left-0">{g.grade}</td>
                      <td className="px-4 py-4 whitespace-nowrap">{g.date}</td>
                    </tr>
                    )
                  } 
                  )}
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
              <span className="text-sm text-gray-600">
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
