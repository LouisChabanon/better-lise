"use client";

import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';
import annotationPlugin from 'chartjs-plugin-annotation';

import { useTheme } from 'next-themes';

ChartJS.register(
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend,
    annotationPlugin,
);

interface GradeDistributionData {
    labels: string[];
    counts: number[];
}

interface GradeChartProps {
    distributionData: GradeDistributionData,
    userGrade: number
}

function getCategoryForGrade(grade: number): string | null {
    if(grade == null || grade < 0 || grade > 20) return null

    if(grade == 20) return '18-20';

    const binIndex = Math.floor(grade / 2);
    const low = binIndex*2
    const up = (binIndex + 1) * 2

    return `${low}-${up}`
}

const GradeChart: React.FC<GradeChartProps> = ({ distributionData, userGrade }) => {

    const { resolvedTheme } = useTheme();
    const isDarkMode = resolvedTheme === 'dark';

    const secondaryTextColor = isDarkMode ? "#FFFFFF" : "oklch(27.8% 0.033 256.848)"
    const textColor = isDarkMode ? "#FFFFFF" : "#6750A4"
    const lineAnnotationColor = isDarkMode ? "#FF8F8F" : "#D93030";

    const userGradeCategory = getCategoryForGrade(userGrade);

    const data = {
        labels: distributionData.labels,
        datasets: [{
            label: "Nombre de notes",
            data: distributionData.counts,
            backgroundColor: '#7551CC',
            borderWidth: 1,
            borderRadius: 4, 
        }]
    };

    const options = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                display: false,
            },
            title: {
                display: true,
                text: 'Distribution des notes',
                color: textColor
            },
            tooltip: {
                callbacks: {
                    label: function(context: any){return `${context.parsed.y} ${context.parsed.y > 1 ? 'notes' : 'note'}`}
                }
            },
            annotation: {
                annotations: {
                    ...(userGradeCategory ? {
                        line: {
                        type: 'line',
                        xMin: userGradeCategory,
                        xMax: userGradeCategory,
                        borderColor: lineAnnotationColor,
                        borderWidth: 2,
                        borderDash: [6,6],
                        label: {
                            display: true,
                            content: "Votre note",
                            position: "start",
                            backgroundColor: lineAnnotationColor,
                            color: "white",
                            font: { weight: 'bold'},
                            borderRadius: 4,
                            padding: 3,
                            }
                        }
                    } : {})
                    
                }
            }
        },
        scales: {
            y: {
                beginAtZero: true,
                title: {
                    display: true,
                    text: "Nombre de notes",
                    color: secondaryTextColor
                },
                ticks: {
                    color: secondaryTextColor,
                    stepSize: 1,
                },
                grid: {
                    display: false
                }
            },
            x: {
                title: {
                    display: true,
                    text: "Tranche de notes",
                    color: secondaryTextColor,
                },
                ticks: {
                    color: secondaryTextColor,
                },
                grid: {
                    display: false
                }
            }
        }
    };

    return (
        <div className="relative h-64 w-full">
            <Bar options={options as any} data={data} />
        </div>
    )
}

export default GradeChart;