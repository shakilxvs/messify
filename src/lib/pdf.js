'use client';

const tk = (n) => `Tk ${Number(n || 0).toFixed(2)}`;
const neg = (n) => `-Tk ${Number(n || 0).toFixed(2)}`;

export async function generateMemberPDF({ mess, member, billing, meals, expenses, payments, month }) {
  const { jsPDF } = await import('jspdf');
  await import('jspdf-autotable');

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const W = doc.internal.pageSize.getWidth();

  // Header
  doc.setFillColor(230, 0, 35);
  doc.rect(0, 0, W, 28, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18); doc.setFont('helvetica', 'bold');
  doc.text('Messify', 14, 12);
  doc.setFontSize(9); doc.setFont('helvetica', 'normal');
  doc.text('Track meals. Split fair. Stay stress-free.', 14, 20);
  doc.text(`Month: ${month}`, W - 14, 12, { align: 'right' });
  doc.text(`Generated: ${new Date().toLocaleString('en-GB')}`, W - 14, 20, { align: 'right' });

  // Mess & Member Info
  doc.setTextColor(30, 30, 30);
  doc.setFontSize(13); doc.setFont('helvetica', 'bold');
  doc.text(mess?.name || 'Mess', 14, 38);
  doc.setFontSize(9); doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 100, 100);
  if (mess?.address) doc.text(mess.address, 14, 44);
  doc.setFontSize(11); doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 30, 30);
  doc.text(`Member: ${member?.name || ''}`, 14, 52);

  let y = 60;

  // Bill Summary
  doc.setFontSize(11); doc.setFont('helvetica', 'bold');
  doc.text('Bill Summary', 14, y); y += 3;

  const billRows = [];
  billRows.push(['Meal Bill', `${billing?.myMeals || 0} meals x Tk ${(billing?.mealRate || 0).toFixed(2)}`, tk(billing?.mealBill)]);
  if (billing?.rent > 0)          billRows.push(['Rent',          '-', tk(billing.rent)]);
  if (billing?.serviceCharge > 0) billRows.push(['Service Charge','-', tk(billing.serviceCharge)]);
  if (billing?.otherCharge > 0)   billRows.push([billing?.otherChargeLabel || 'Other', '-', tk(billing.otherCharge)]);
  billRows.push(['TOTAL MESS BILL', '', tk(billing?.totalBill)]);
  if (billing?.paidMeal > 0)    billRows.push(['Paid - Meal',           '', neg(billing.paidMeal)]);
  if (billing?.paidRent > 0)    billRows.push(['Paid - Rent',           '', neg(billing.paidRent)]);
  if (billing?.paidService > 0) billRows.push(['Paid - Service Charge', '', neg(billing.paidService)]);
  if (billing?.paidOthers > 0)  billRows.push(['Paid - Others',         '', neg(billing.paidOthers)]);

  const netDue = billing?.netDue || 0;
  billRows.push([
    netDue > 0 ? 'NET DUE (OWED)' : netDue < 0 ? 'NET ADVANCE' : 'NET DUE (CLEAR)',
    '',
    tk(Math.abs(netDue)),
  ]);

  doc.autoTable({
    startY: y,
    head: [['Description', 'Details', 'Amount (Tk)']],
    body: billRows,
    styles: { fontSize: 9, cellPadding: 3, font: 'helvetica' },
    headStyles: { fillColor: [230, 0, 35], textColor: 255, fontStyle: 'bold', halign: 'left' },
    columnStyles: {
      0: { cellWidth: 70 },
      1: { cellWidth: 60, halign: 'center' },
      2: { cellWidth: 50, halign: 'right', fontStyle: 'bold' },
    },
    tableWidth: 'auto',
    margin: { left: 14, right: 14 },
    didParseCell: (data) => {
      const label = data.row.raw[0];
      if (label === 'TOTAL MESS BILL') {
        data.cell.styles.fillColor = [255, 240, 241];
        data.cell.styles.fontStyle = 'bold';
      }
      if (label?.startsWith('NET ')) {
        data.cell.styles.fillColor = netDue > 0 ? [255, 224, 228] : [220, 252, 231];
        data.cell.styles.fontStyle = 'bold';
        data.cell.styles.textColor = netDue > 0 ? [185, 28, 28] : [22, 101, 52];
      }
      if (label?.startsWith('Paid')) {
        data.cell.styles.textColor = [22, 163, 74];
      }
    },
  });

  y = doc.lastAutoTable.finalY + 10;

  // Meal Log
  if (meals && meals.length > 0) {
    doc.setFontSize(11); doc.setFont('helvetica', 'bold'); doc.setTextColor(30, 30, 30);
    doc.text('Meal Log', 14, y); y += 3;
    doc.autoTable({
      startY: y,
      head: [['Date', 'Breakfast', 'Lunch', 'Dinner', 'Total']],
      body: meals.map(m => [m.date, m.breakfast || 0, m.lunch || 0, m.dinner || 0, m.total || 0]),
      styles: { fontSize: 8, cellPadding: 2.5, halign: 'center' },
      headStyles: { fillColor: [230, 0, 35], textColor: 255, fontStyle: 'bold' },
      columnStyles: { 0: { halign: 'left' }, 4: { fontStyle: 'bold' } },
      margin: { left: 14, right: 14 },
    });
    y = doc.lastAutoTable.finalY + 10;
  }

  // Expenses
  if (expenses && expenses.length > 0) {
    doc.setFontSize(11); doc.setFont('helvetica', 'bold'); doc.setTextColor(30, 30, 30);
    doc.text('Expenses', 14, y); y += 3;
    doc.autoTable({
      startY: y,
      head: [['Date', 'Category', 'Description', 'Amount (Tk)']],
      body: expenses.map(e => [e.date, e.category, e.description || '-', `Tk ${e.amount}`]),
      styles: { fontSize: 8, cellPadding: 2.5 },
      headStyles: { fillColor: [230, 0, 35], textColor: 255, fontStyle: 'bold' },
      columnStyles: {
        0: { cellWidth: 28 },
        1: { cellWidth: 30 },
        2: { cellWidth: 'auto' },
        3: { halign: 'right', fontStyle: 'bold', cellWidth: 35 },
      },
      margin: { left: 14, right: 14 },
    });
    y = doc.lastAutoTable.finalY + 10;
  }

  // Payments
  if (payments && payments.length > 0) {
    doc.setFontSize(11); doc.setFont('helvetica', 'bold'); doc.setTextColor(30, 30, 30);
    doc.text('Payments', 14, y); y += 3;
    doc.autoTable({
      startY: y,
      head: [['Date', 'For', 'Note', 'Amount (Tk)']],
      body: payments.map(p => [p.date, p.reason || '-', p.note || '-', `Tk ${p.amount}`]),
      styles: { fontSize: 8, cellPadding: 2.5 },
      headStyles: { fillColor: [22, 163, 74], textColor: 255, fontStyle: 'bold' },
      columnStyles: {
        0: { cellWidth: 28 },
        1: { cellWidth: 35 },
        2: { cellWidth: 'auto' },
        3: { halign: 'right', fontStyle: 'bold', textColor: [22, 163, 74], cellWidth: 35 },
      },
      margin: { left: 14, right: 14 },
    });
  }

  // Footer
  const totalPages = doc.internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(7); doc.setTextColor(180, 180, 180);
    doc.text(
      `Generated by Messify  •  ${new Date().toLocaleString('en-GB')}  •  Page ${i} of ${totalPages}`,
      W / 2, doc.internal.pageSize.getHeight() - 6, { align: 'center' }
    );
  }

  doc.save(`Messify_${member?.name}_${month}.pdf`);
}
