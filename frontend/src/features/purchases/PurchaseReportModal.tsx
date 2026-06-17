import { jsPDF } from "jspdf"
import autoTable from "jspdf-autotable"
import * as XLSX from "xlsx-js-style"
import type { Purchase } from "./purchasesTypes"
import { addPdfFooter, loadLogoDataUrl } from "../../shared/utils/downloadReports"
import { formatRequestedAt } from "../../shared/utils/formatDate"
export function getPurchaseReceiveMissingFields(purchase: Purchase) {
  const missingFields: string[] = []
  if (!purchase.supplierName.trim()) missingFields.push("Supplier")
  if (!purchase.supplierContact.trim()) missingFields.push("Supplier contact")
  if (Number(purchase.unitPrice) <= 0) missingFields.push("Unit price")
  if (Number(purchase.totalPrice) <= 0) missingFields.push("Total price")
  if (!purchase.expectedArrivalDate) missingFields.push("Arrival date")
  if (Number(purchase.quantity) <= 0) missingFields.push("Quantity")
  if (!purchase.reference.trim() && !purchase.itemName.trim()) {
    missingFields.push("Reference or item name")
  }
  return missingFields
}

function getPurchaseReportRows(purchase: Purchase, createdBy: string) {
  return [
    ["Purchase ID", purchase.id],
    ["Item name", purchase.itemName],
    ["Category", purchase.category || "N/A"],
    ["Manufacturer", purchase.manufacturer || "N/A"],
    ["Reference", purchase.reference || "N/A"],
    ["Quantity", purchase.quantity],
    ["Criticality", purchase.priority],
    ["Division", purchase.division],
    ["Supplier", purchase.supplierName || "-"],
    ["Supplier contact", purchase.supplierContact || "-"],
    ["Unit price", purchase.unitPrice],
    ["Total price", purchase.totalPrice],
    ["Expected arrival date", purchase.expectedArrivalDate || "-"],
    ["Received date", purchase.receivedDate || "-"],
    ["Status", purchase.status],
    ["Request reason", purchase.reason || "-"],
    ["Admin comment", purchase.adminComment || "-"],
    ["Created by", createdBy],
    ["Created at", formatRequestedAt(purchase.createdAt)],
    ["Updated at", formatRequestedAt(purchase.updatedAt)],
  ]
}

export async function createPurchaseReportPdf(
  purchases: Purchase[],
  getCreatedBy: (purchase: Purchase) => string
) {
  const doc = new jsPDF({ unit: "mm", format: "a4" })
  let logo: string | null = null

  try {
    logo = await loadLogoDataUrl()
  } catch {
    logo = null
  }

  purchases.forEach((purchase, index) => {
    if (index > 0) {
      doc.addPage()
    }
    if (logo) {
      doc.addImage(logo, "PNG", 14, 10, 42, 13)
    }
    doc.setFont("helvetica", "bold")
    doc.setFontSize(20)
    doc.text("Purchase Report", 14, 36)
    doc.setFont("helvetica", "normal")
    doc.setFontSize(10)
    doc.text(`Purchase #${purchase.id}`, 14, 43)
    autoTable(doc, {
      startY: 50,
      head: [["Field", "Details"]],
      body: getPurchaseReportRows(purchase, getCreatedBy(purchase)).map(
        ([label, value]) => [String(label), String(value)]
      ),
      theme: "grid",
      styles: { fontSize: 9, cellPadding: 2.5, overflow: "linebreak" },
      headStyles: { fillColor: [31, 41, 55] },
      columnStyles: { 0: { fontStyle: "bold", cellWidth: 52 } },
    })
  })

  addPdfFooter(doc)
  return doc
}

export function downloadPurchaseReportXlsx(purchase: Purchase, createdBy: string) {
  const generatedAt = new Date().toLocaleString()
  const reportRows = getPurchaseReportRows(purchase, createdBy)
  const worksheet = XLSX.utils.aoa_to_sheet([
    ["Bertrandt Inventory System - Purchase Report", ""],
    ["Generated date", generatedAt],
    ["Purchase ID", purchase.id],
    [],
    ["Field", "Details"],
    ...reportRows,
  ])
  worksheet["!merges"] = [XLSX.utils.decode_range("A1:B1")]
  worksheet["!cols"] = [{ wch: 26 }, { wch: 64 }]
  worksheet["!rows"] = [{ hpt: 28 }, { hpt: 20 }, { hpt: 20 }, { hpt: 8 }]
  ;(worksheet as XLSX.WorkSheet & { "!freeze"?: unknown })["!freeze"] = {
    xSplit: 0,
    ySplit: 5,
    topLeftCell: "A6",
    activePane: "bottomLeft",
    state: "frozen",
  }

  const border = {
    top: { style: "thin", color: { rgb: "B7B7B7" } },
    bottom: { style: "thin", color: { rgb: "B7B7B7" } },
    left: { style: "thin", color: { rgb: "B7B7B7" } },
    right: { style: "thin", color: { rgb: "B7B7B7" } },
  }
  const titleCell = worksheet.A1
  titleCell.s = {
    font: { bold: true, sz: 16, color: { rgb: "FFFFFF" } },
    fill: { fgColor: { rgb: "1F2937" } },
    alignment: { horizontal: "center", vertical: "center" },
  }
  worksheet.B1.s = titleCell.s

  ;["A2", "A3"].forEach((address) => {
    worksheet[address].s = {
      font: { bold: true },
      fill: { fgColor: { rgb: "FFF2CC" } },
      border,
      alignment: { vertical: "center" },
    }
  })
  ;["B2", "B3"].forEach((address) => {
    worksheet[address].s = { border, alignment: { vertical: "center" } }
  })
  ;["A5", "B5"].forEach((address) => {
    worksheet[address].s = {
      font: { bold: true, color: { rgb: "FFFFFF" } },
      fill: { fgColor: { rgb: "1F2937" } },
      border,
      alignment: { horizontal: "center", vertical: "center" },
    }
  })

  reportRows.forEach(([label], index) => {
    const row = index + 6
    worksheet[`A${row}`].s = {
      font: { bold: true },
      fill: { fgColor: { rgb: "F3F4F6" } },
      border,
      alignment: { vertical: "top", wrapText: true },
    }
    worksheet[`B${row}`].s = {
      border,
      alignment: { vertical: "top", wrapText: true },
    }
    if (label === "Unit price" || label === "Total price") {
      worksheet[`B${row}`].z = '#,##0.00'
    }
  })

  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, "Purchase Report")
  XLSX.writeFile(workbook, `purchase-report-${purchase.id}.xlsx`)
}

