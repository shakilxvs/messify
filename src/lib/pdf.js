'use client';

export async function generateMemberPDF({ mess, member, billing, meals, expenses, payments, month }) {
  const { jsPDF } = await import('jspdf');
  await import('jspdf-autotable');

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const W = doc.internal.pageSize.getWidth();

  doc.setFillColor(230, 0, 35);
  doc.rect(0, 0, W, 28, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18); doc.setFont('helvetica', 'bold');
  doc.text('Messify', 14, 12);
  doc.setFontSize(9); doc.setFont('helvetica', 'normal');
  doc.text('Track meals. Split fair. Stay stress-free.', 14, 20);
  doc.text(`Month: ${month}`, W - 14, 12, { align: 'right' });
  doc.text(`Generated: ${new Date().toLocaleString()}`, W - 14, 20, { align: 'right' });

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
  doc.setFontSize(11); doc.setFont('helvetica', 'bold');
  doc.text('Bill Summary', 14, y); y += 3;

  const netDue = billing?.netDue || 0;
  const billRows = [];
  billRows.push(['Meal Bill', `${billing?.myMeals || 0} meals × ৳${(billing?.mealRate || 0).toFixed(2)}`, `৳${(billing?.mealBill || 0).toFixed(2)}`]);
  if (billing?.rent > 0)          billRows.push(['Rent', '-', `৳${billing.rent.toFixed(2)}`]);
  if (billing?.serviceCharge > 0) billRows.push(['Service Charge', '-', `৳${billing.serviceCharge.toFixed(2)}`]);
  if (billing?.otherCharge > 0)   billRows.push([billing?.otherChargeLabel || 'Other', '-', `৳${billing.otherCharge.toFixed(2)}`]);
  billRows.push(['TOTAL MESS BILL', '', `৳${(billing?.totalBill || 0).toFixed(2)}`]);
  if (billing?.paidMeal > 0)    billRows.push(['Paid — Meal', '', `-৳${billing.paidMeal.toFixed(2)}`]);
  if (billing?.paidRent > 0)    billRows.push(['Paid — Rent', '', `-৳${billing.paidRent.toFixed(2)}`]);
  if (billing?.paidService > 0) billRows.push(['Paid — Service Charge', '', `-৳${billing.paidService.toFixed(2)}`]);
  if (billing?.paidOthers > 0)  billRows.push(['Paid — Others', '', `-৳${billing.paidOthers.toFixed(2)}`]);
  billRows.push([netDue > 0 ? 'NET DUE (OWED)' : netDue < 0 ? 'NET ADVANCE' : 'NET DUE (CLEAR)', '', `৳${Math.abs(netDue).toFixed(2)}`]);

  doc.autoTable({
    startY: y,
    head: [['Description', 'Details', 'Amount']],
    body: billRows,
    styles: { fontSize: 9, cellPadding: 2.5 },
    headStyles: { fillColor: [230, 0, 35], textColor: 255, fontStyle: 'bold' },
    columnStyles: { 2: { halign: 'right', fontStyle: 'bold' } },
    didParseCell: (data) => {
      const label = data.row.raw[0];
      if (label === 'TOTAL MESS BILL') { data.cell.styles.fillColor = [255, 240, 241]; data.cell.styles.fontStyle = 'bold'; }
      if (label?.startsWith('NET ')) { data.cell.styles.fillColor = netDue > 0 ? [255, 224, 228] : [220, 252, 231]; data.cell.styles.fontStyle = 'bold'; }
      if (label?.startsWith('Paid')) { data.cell.styles.textColor = [22, 163, 74]; }
    },
  });

  y = doc.lastAutoTable.finalY + 10;

  if (meals.length > 0) {
    doc.setFontSize(11); doc.setFont('helvetica', 'bold'); doc.setTextColor(30, 30, 30);
    doc.text('Meal Log', 14, y); y += 3;
    doc.autoTable({
      startY: y,
      head: [['Date', 'Breakfast', 'Lunch', 'Dinner', 'Total']],
      body: meals.map(m => [m.date, m.breakfast || 0, m.lunch || 0, m.dinner || 0, m.total || 0]),
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [230, 0, 35], textColor: 255, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [252, 252, 252] },
    });
    y = doc.lastAutoTable.finalY + 10;
  }

  if (expenses.length > 0) {
    doc.setFontSize(11); doc.setFont('helvetica', 'bold'); doc.setTextColor(30, 30, 30);
    doc.text('Expenses', 14, y); y += 3;
    doc.autoTable({
      startY: y,
      head: [['Date', 'Category', 'Description', 'Amount']],
      body: expenses.map(e => [e.date, e.category, e.description || '-', `৳${e.amount}`]),
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [230, 0, 35], textColor: 255, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [252, 252, 252] },
    });
    y = doc.lastAutoTable.finalY + 10;
  }

  if (payments.length > 0) {
    doc.setFontSize(11); doc.setFont('helvetica', 'bold'); doc.setTextColor(30, 30, 30);
    doc.text('Payments', 14, y); y += 3;
    doc.autoTable({
      startY: y,
      head: [['Date', 'For', 'Note', 'Amount']],
      body: payments.map(p => [p.date, p.reason || '-', p.note || '-', `৳${p.amount}`]),
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [22, 163, 74], textColor: 255, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [252, 252, 252] },
    });
  }

  const totalPages = doc.internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(7); doc.setTextColor(180, 180, 180);
    doc.text(`Generated by Messify • ${new Date().toLocaleString()} • Page ${i} of ${totalPages}`,
      W / 2, doc.internal.pageSize.getHeight() - 6, { align: 'center' });
  }

  doc.save(`Messify_${member?.name}_${month}.pdf`);
}
