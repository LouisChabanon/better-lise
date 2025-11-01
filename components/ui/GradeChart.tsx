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

import { useTheme } from 'next-themes';





ChartJS.register(
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend
);

interface GradeDistributionData {
    labels: string[];
    counts: number[];
}

const GradeChart: React.FC<{ distributionData: GradeDistributionData }> = ({ distributionData }) => {

    const isDarkMode = useTheme().theme === 'dark';

    const secondaryTextColor = isDarkMode ? "#FFFFFF" : "oklch(27.8% 0.033 256.848)"
    const textColor = isDarkMode ? "#FFFFFF" : "#6750A4"

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
            <Bar options={options} data={data} />
        </div>
    )
}

export default GradeChart;