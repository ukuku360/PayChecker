/**
 * Export utilities for generating CSV and PDF reports
 */
import { jsPDF } from 'jspdf';
import Papa from 'papaparse';
import { format } from 'date-fns';
import type { Shift, JobConfig, WageConfig } from '../types';
import { calculateShiftPay } from './calculatePay';
import { getHolidayInfo } from '../data/australianHolidays';
import { isSaturday, isSunday } from 'date-fns';

interface ExportData {
  shifts: Shift[];
  jobConfigs: JobConfig[];
  wageConfig: WageConfig;
  holidays: string[];
  dateRange: {
    start: Date;
    end: Date;
  };
}

// Helper to get day type
const getDayType = (dateStr: string, holidays: string[]): string => {
  const date = new Date(dateStr);
  const holidayInfo = getHolidayInfo(dateStr);
  if (holidayInfo || holidays.includes(dateStr)) return 'Holiday';
  if (isSunday(date)) return 'Sunday';
  if (isSaturday(date)) return 'Saturday';
  return 'Weekday';
};

// Export to CSV
export const exportToCSV = (data: ExportData): void => {
  const rows = data.shifts
    .filter(s => {
      const shiftDate = new Date(s.date);
      return shiftDate >= data.dateRange.start && shiftDate <= data.dateRange.end;
    })
    .sort((a, b) => a.date.localeCompare(b.date))
    .map(shift => {
      const job = data.jobConfigs.find(j => j.id === shift.type);
      const dayType = getDayType(shift.date, data.holidays);
      const pay = calculateShiftPay(shift, data.wageConfig, data.holidays);
      
      return {
        Date: shift.date,
        Day: format(new Date(shift.date), 'EEEE'),
        DayType: dayType,
        JobType: job?.name || shift.type,
        BaseHours: shift.hours,
        OvertimeHours: shift.overtimeHours || 0,
        TotalHours: shift.hours + (shift.overtimeHours || 0),
        Pay: pay.toFixed(2),
      };
    });

  // Calculate totals
  const totals = rows.reduce((acc, row) => ({
    totalHours: acc.totalHours + row.TotalHours,
    totalPay: acc.totalPay + parseFloat(row.Pay),
  }), { totalHours: 0, totalPay: 0 });

  // Add totals row
  rows.push({
    Date: '',
    Day: '',
    DayType: '',
    JobType: 'TOTAL',
    BaseHours: 0,
    OvertimeHours: 0,
    TotalHours: totals.totalHours,
    Pay: totals.totalPay.toFixed(2),
  });

  const csv = Papa.unparse(rows);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const fileName = `PayChecker_${format(data.dateRange.start, 'yyyy-MM')}_to_${format(data.dateRange.end, 'yyyy-MM')}.csv`;
  
  link.href = URL.createObjectURL(blob);
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(link.href);
};

// Export to PDF
export const exportToPDF = (data: ExportData): void => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  
  // Filter and sort shifts
  const filteredShifts = data.shifts
    .filter(s => {
      const shiftDate = new Date(s.date);
      return shiftDate >= data.dateRange.start && shiftDate <= data.dateRange.end;
    })
    .sort((a, b) => a.date.localeCompare(b.date));

  // Calculate totals by job type
  const jobTotals: { [key: string]: { hours: number; pay: number } } = {};
  let grandTotalHours = 0;
  let grandTotalPay = 0;

  filteredShifts.forEach(shift => {
    const pay = calculateShiftPay(shift, data.wageConfig, data.holidays);
    const hours = shift.hours + (shift.overtimeHours || 0);
    
    if (!jobTotals[shift.type]) {
      jobTotals[shift.type] = { hours: 0, pay: 0 };
    }
    jobTotals[shift.type].hours += hours;
    jobTotals[shift.type].pay += pay;
    grandTotalHours += hours;
    grandTotalPay += pay;
  });

  // Header
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('PayChecker Report', pageWidth / 2, 20, { align: 'center' });
  
  // Period
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  const periodText = `Period: ${format(data.dateRange.start, 'MMM d, yyyy')} - ${format(data.dateRange.end, 'MMM d, yyyy')}`;
  doc.text(periodText, pageWidth / 2, 30, { align: 'center' });
  
  // Generated date
  doc.setFontSize(10);
  doc.setTextColor(128);
  doc.text(`Generated: ${format(new Date(), 'MMM d, yyyy HH:mm')}`, pageWidth / 2, 37, { align: 'center' });
  doc.setTextColor(0);

  // Summary section
  let yPos = 50;
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Summary', 14, yPos);
  yPos += 10;

  // Summary table
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  
  Object.entries(jobTotals).forEach(([jobId, totals]) => {
    const job = data.jobConfigs.find(j => j.id === jobId);
    const jobName = job?.name || jobId;
    doc.text(`${jobName}:`, 20, yPos);
    doc.text(`${totals.hours.toFixed(1)} hours`, 80, yPos);
    doc.text(`$${totals.pay.toFixed(2)}`, 130, yPos);
    yPos += 7;
  });

  // Grand total
  yPos += 3;
  doc.setFont('helvetica', 'bold');
  doc.text('Total:', 20, yPos);
  doc.text(`${grandTotalHours.toFixed(1)} hours`, 80, yPos);
  doc.text(`$${grandTotalPay.toFixed(2)}`, 130, yPos);
  
  // Shift details section
  yPos += 20;
  doc.setFontSize(14);
  doc.text('Shift Details', 14, yPos);
  yPos += 10;

  // Table header
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('Date', 14, yPos);
  doc.text('Day', 45, yPos);
  doc.text('Type', 70, yPos);
  doc.text('Job', 95, yPos);
  doc.text('Hours', 120, yPos);
  doc.text('OT', 145, yPos);
  doc.text('Pay', 165, yPos);
  yPos += 2;
  doc.line(14, yPos, pageWidth - 14, yPos);
  yPos += 5;

  // Table rows
  doc.setFont('helvetica', 'normal');
  filteredShifts.forEach(shift => {
    if (yPos > 270) {
      doc.addPage();
      yPos = 20;
    }
    
    const job = data.jobConfigs.find(j => j.id === shift.type);
    const dayType = getDayType(shift.date, data.holidays);
    const pay = calculateShiftPay(shift, data.wageConfig, data.holidays);
    
    doc.text(shift.date, 14, yPos);
    doc.text(format(new Date(shift.date), 'EEE'), 45, yPos);
    doc.text(dayType.slice(0, 3), 70, yPos);
    doc.text(job?.name || shift.type, 95, yPos);
    doc.text(shift.hours.toString(), 120, yPos);
    doc.text((shift.overtimeHours || 0).toString(), 145, yPos);
    doc.text(`$${pay.toFixed(2)}`, 165, yPos);
    yPos += 6;
  });

  // Footer
  const pageCount = doc.internal.pages.length - 1;
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(`Page ${i} of ${pageCount}`, pageWidth / 2, 287, { align: 'center' });
    doc.text('PayChecker - Work Hours & Pay Tracker', pageWidth / 2, 292, { align: 'center' });
  }

  // Save
  const fileName = `PayChecker_${format(data.dateRange.start, 'yyyy-MM')}_to_${format(data.dateRange.end, 'yyyy-MM')}.pdf`;
  doc.save(fileName);
};
