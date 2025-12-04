import { useMemo, useState, ChangeEvent } from "react";
import { useLocation } from "wouter";
import { Layout } from "@/components/layout/Layout";
import {
  FileText,
  Upload,
  Download,
  X,
  Trash2,
  Search,
  Eye,
  Sparkles,
} from "lucide-react";
import { useAppointments } from "@/context/AppointmentsContext";
import { useDocuments } from "@/context/DocumentsContext";
import { useTranscripts } from "@/context/TranscriptsContext";
import { Input } from "@/components/ui/input";
import type { DocumentMeta } from "@/lib/types";
import { jsPDF } from "jspdf";

const getLogoBase64 = (): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "Anonymous";
    img.src = "/favicon.png";
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Could not get canvas context"));
        return;
      }
      ctx.drawImage(img, 0, 0);
      resolve(canvas.toDataURL("image/png"));
    };
    img.onerror = (e) => reject(e);
  });
};

export default function Documents() {
  const [, setLocation] = useLocation();
  const { appointments, updateAppointment } = useAppointments();
  const {
    documents,
    addDocument,
    deleteDocument,
    updateDocument,
  } = useDocuments();
  const { transcripts, deleteTranscript } = useTranscripts();

  // Upload modal state
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadingFile, setUploadingFile] = useState<File | null>(null);
  const [fileName, setFileName] = useState("");
  const [targetAppointmentId, setTargetAppointmentId] = useState<string | "none">(
    "none",
  );
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Export full report state
  const [isExporting, setIsExporting] = useState(false);

  // Preview modal
  const [previewDoc, setPreviewDoc] = useState<DocumentMeta | null>(null);

  // Summary generation
  const [summaryLoadingId, setSummaryLoadingId] = useState<string | null>(null);

  // Rename/Delete state
  const [renamingDocId, setRenamingDocId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [confirmingDocId, setConfirmingDocId] = useState<string | null>(null);

  const sortedDocuments = useMemo(
    () =>
      [...documents].sort(
        (a, b) =>
          new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime(),
      ),
    [documents],
  );

  const handleUploadClick = () => {
    setShowUploadModal(true);
    setUploadingFile(null);
    setFileName("");
    setTargetAppointmentId("none");
    setUploadError(null);
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setUploadingFile(file);
    setFileName(file?.name || "");
    setUploadError(null);
  };

  const handleUpload = async () => {
    if (!uploadingFile) {
      setUploadError("Please select a file first.");
      return;
    }

    try {
      const file = uploadingFile;
      const reader = new FileReader();

      reader.onload = () => {
        const dataUrl = reader.result as string;
        const name = fileName.trim() || file.name;

        const docInput: Omit<DocumentMeta, "id" | "uploadedAt"> = {
          name,
          sizeBytes: file.size,
          mimeType: file.type || "application/octet-stream",
          appointmentId:
            targetAppointmentId === "none" ? undefined : targetAppointmentId,
          downloadUrl: dataUrl,
        };

        const created = addDocument(docInput);

        if (targetAppointmentId !== "none") {
          const apt = appointments.find(a => a.id === targetAppointmentId);
          if (apt) {
            const currentIds = apt.documentIds ?? [];
            const updatedIds = [...currentIds, created.id];
            updateAppointment(apt.id, { documentIds: updatedIds });
          }
        }

        setShowUploadModal(false);
        setUploadingFile(null);
        setFileName("");
        setTargetAppointmentId("none");
        setUploadError(null);
      };

      reader.readAsDataURL(file);
    } catch (err) {
      console.error(err);
      setUploadError("Something went wrong while reading the file.");
    }
  };

  const handleDelete = (id: string) => {
    // Check if transcript
    const transcript = transcripts.find(t => t.documentId === id);
    if (transcript) {
      deleteTranscript(transcript.id);
    }
    deleteDocument(id);
  };

  const handleRename = (id: string, newName: string) => {
    updateDocument(id, { name: newName });
  };

  const handleOpenPreview = (doc: DocumentMeta) => {
    setPreviewDoc(doc);
  };

  const handleClosePreview = () => {
    setPreviewDoc(null);
  };

  const handleDownload = async (doc: DocumentMeta) => {
    // Check if transcript
    const transcript = transcripts.find(t => t.documentId === doc.id);
    if (transcript) {
      // Download as PDF
      const pdf = new jsPDF();
      const pageWidth = pdf.internal.pageSize.getWidth();
      const margin = 10;
      const maxLineWidth = pageWidth - margin * 2;

      try {
        const logo = await getLogoBase64();
        pdf.addImage(logo, "PNG", margin, 10, 12, 12);
        pdf.setFontSize(16);
        pdf.text(doc.name, margin + 16, 20);
      } catch (e) {
        pdf.setFontSize(16);
        pdf.text(doc.name, margin, 20);
      }
      pdf.setFontSize(10);
      pdf.text(`Generated on ${new Date().toLocaleDateString()}`, margin, 30);

      let y = 40;
      pdf.setFontSize(12);

      const lines = transcript.lines.join("\n");
      const splitText = pdf.splitTextToSize(lines, maxLineWidth);

      for (const line of splitText) {
        if (y > 280) {
          pdf.addPage();
          y = 20;
        }
        pdf.text(line, margin, y);
        y += 7;
      }

      pdf.save(`${doc.name}.pdf`);
      return;
    }

    if (!doc.downloadUrl) return;
    try {
      const link = document.createElement("a");
      link.href = doc.downloadUrl;
      link.download = doc.name || "document";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch {
      // ignore
    }
  };

  const handleChangeAttachment = (docId: string, appointmentId: string) => {
    updateDocument(docId, { appointmentId: appointmentId === "none" ? undefined : appointmentId });

    if (appointmentId === "none") {
      appointments.forEach(apt => {
        if (apt.documentIds?.includes(docId)) {
          const updatedIds = apt.documentIds.filter(id => id !== docId);
          updateAppointment(apt.id, { documentIds: updatedIds });
        }
      });
      return;
    }

    appointments.forEach(apt => {
      const currentIds = apt.documentIds ?? [];
      if (apt.id === appointmentId) {
        if (!currentIds.includes(docId)) {
          updateAppointment(apt.id, { documentIds: [...currentIds, docId] });
        }
      } else if (currentIds.includes(docId)) {
        const updatedIds = currentIds.filter(id => id !== docId);
        updateAppointment(apt.id, { documentIds: updatedIds });
      }
    });
  };

  const normalize = (s?: string) => (s || "").toLowerCase();

  const matchesSearch = (doc: DocumentMeta) => {
    if (!searchQuery.trim()) return true;
    const q = normalize(searchQuery);

    const apt = appointments.find((a) => a.id === doc.appointmentId);
    const doctor = normalize(apt?.doctor);
    const specialty = normalize(apt?.specialty);
    const labType = normalize(apt?.labType);

    const docName = normalize(doc.name);
    const mime = normalize(doc.mimeType);

    const uploadedDateIso = doc.uploadedAt;
    const uploadedDateHuman = uploadedDateIso
      ? new Date(uploadedDateIso).toLocaleDateString()
      : "";

    const aptDateIso = apt?.date;
    const aptDateHuman = aptDateIso
      ? new Date(aptDateIso).toLocaleDateString()
      : "";

    const haystack = normalize(
      [
        docName,
        mime,
        doctor,
        specialty,
        labType,
        aptDateIso,
        aptDateHuman,
        uploadedDateIso,
        uploadedDateHuman,
      ].join(" "),
    );

    const tokens = q.split(/\s+/).filter(Boolean);
    return tokens.every((token) => haystack.includes(token));
  };

  const filteredDocuments = sortedDocuments.filter(matchesSearch);

  // Helper to add text to PDF with wrapping and pagination
  const addWrappedText = (pdf: jsPDF, text: string, x: number, y: number, maxWidth: number, lineHeight: number): number => {
    const splitText = pdf.splitTextToSize(text, maxWidth);
    for (const line of splitText) {
      if (y > 280) {
        pdf.addPage();
        y = 20;
      }
      pdf.text(line, x, y);
      y += lineHeight;
    }
    return y;
  };

  const handleGenerateFullReport = async () => {
    try {
      setIsExporting(true);

      const pdf = new jsPDF();
      const margin = 20;
      const pageWidth = pdf.internal.pageSize.getWidth();
      const maxLineWidth = pageWidth - margin * 2;
      let y = 20;

      // --- Main Header ---
      try {
        const logo = await getLogoBase64();
        pdf.addImage(logo, "PNG", margin, y - 8, 12, 12);
        pdf.setFontSize(24);
        pdf.setFont("helvetica", "bold");
        pdf.setTextColor(44, 105, 117); // Deep Teal
        pdf.text("CareScribe Medical History", margin + 16, y);
      } catch (e) {
        pdf.setFontSize(24);
        pdf.setFont("helvetica", "bold");
        pdf.setTextColor(44, 105, 117); // Deep Teal
        pdf.text("CareScribe Medical History", margin, y);
      }
      y += 10;

      pdf.setFontSize(10);
      pdf.setFont("helvetica", "normal");
      pdf.setTextColor(100, 100, 100);
      pdf.text(`Generated on: ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}`, margin, y);
      y += 20;

      // Filter only transcripts
      const transcriptDocs = sortedDocuments.filter(doc =>
        transcripts.some(t => t.documentId === doc.id)
      ).reverse(); // Chronological order (oldest first)

      if (transcriptDocs.length === 0) {
        alert("No transcripts found to export.");
        return;
      }

      // Helper for Sections (reused logic)
      const addSection = (title: string, content: string | string[]) => {
        if (!content || (Array.isArray(content) && content.length === 0)) return;

        if (y > 260) {
          pdf.addPage();
          y = 20;
        }

        // Section Title
        pdf.setFontSize(12);
        pdf.setFont("helvetica", "bold");
        pdf.setTextColor(44, 105, 117);
        pdf.text(title.toUpperCase(), margin, y);
        y += 5;

        // Content
        pdf.setFontSize(10);
        pdf.setFont("helvetica", "normal");
        pdf.setTextColor(0, 0, 0);

        if (Array.isArray(content)) {
          content.forEach(item => {
            if (y > 275) {
              pdf.addPage();
              y = 20;
            }
            pdf.text("•", margin, y);
            const splitItem = pdf.splitTextToSize(item, maxLineWidth - 5);
            pdf.text(splitItem, margin + 5, y);
            y += (splitItem.length * 5) + 2;
          });
        } else {
          const splitText = pdf.splitTextToSize(content, maxLineWidth);
          for (const line of splitText) {
            if (y > 275) {
              pdf.addPage();
              y = 20;
            }
            pdf.text(line, margin, y);
            y += 5;
          }
        }
        y += 8; // Spacing after section
      };

      for (const doc of transcriptDocs) {
        const apt = appointments.find(a => a.id === doc.appointmentId);
        if (!apt) continue;

        // --- Visit Header (Box) ---
        if (y > 220) {
          pdf.addPage();
          y = 20;
        }

        pdf.setDrawColor(200, 210, 210);
        pdf.setFillColor(236, 249, 245); // Minty background
        pdf.roundedRect(margin, y, maxLineWidth, 25, 3, 3, "F");
        pdf.setDrawColor(180, 200, 200);
        pdf.roundedRect(margin, y, maxLineWidth, 25, 3, 3, "S");

        let boxY = y + 8;

        pdf.setTextColor(0, 0, 0);
        pdf.setFontSize(12);
        pdf.setFont("helvetica", "bold");
        pdf.text(`${new Date(apt.date || "").toLocaleDateString()} - ${apt.doctor}`, margin + 5, boxY);

        boxY += 7;
        pdf.setFontSize(10);
        pdf.setFont("helvetica", "normal");
        pdf.setTextColor(80, 80, 80);
        pdf.text(apt.specialty || "General Visit", margin + 5, boxY);

        y += 35; // Move past box

        // --- Visit Content ---
        addSection("Reason for Visit", apt.reason || "");
        addSection("Summary", apt.notes || "");

        const medStrings = apt.medications?.map(m => {
          let s = `${m.name}`;
          if (m.dosage) s += ` - ${m.dosage}`;
          if (m.frequency) s += ` (${m.frequency})`;
          return s;
        });
        addSection("Medications", medStrings || []);

        addSection("Diagnosis", apt.diagnosis || []);
        addSection("Instructions", apt.instructions || []);

        y += 10; // Extra space between visits

        // Separator line if not last
        if (doc !== transcriptDocs[transcriptDocs.length - 1]) {
          pdf.setDrawColor(220, 220, 220);
          pdf.setLineWidth(0.5);
          pdf.line(margin, y - 5, pageWidth - margin, y - 5);
          y += 5;
        }
      }

      // --- Footer ---
      const pageCount = pdf.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        pdf.setPage(i);
        pdf.setFontSize(8);
        pdf.setTextColor(150, 150, 150);
        pdf.text(`Page ${i} of ${pageCount}`, pageWidth - margin, 290, { align: "right" });
        pdf.text("CareScribe Full History Export", margin, 290);
      }

      pdf.save(`Full_Medical_History_${new Date().toISOString().split('T')[0]}.pdf`);

    } catch (err) {
      console.error(err);
      alert("Failed to generate full history. Please try again.");
    } finally {
      setIsExporting(false);
    }
  };

  const handleGenerateSummary = async (doc: DocumentMeta) => {
    setSummaryLoadingId(doc.id);

    try {
      const apt = appointments.find(a => a.id === doc.appointmentId);

      // If unattached, we can't generate a structured summary yet because the data lives on the appointment.
      // In a real app, we might trigger a re-process here.
      if (!apt) {
        alert("This transcript is not attached to an appointment, so no structured summary is available yet. Please attach it to an appointment to view the summary.");
        setSummaryLoadingId(null);
        return;
      }

      const pdf = new jsPDF();
      const margin = 20;
      const pageWidth = pdf.internal.pageSize.getWidth();
      const maxLineWidth = pageWidth - margin * 2;
      let y = 20;

      // --- Header ---
      try {
        const logo = await getLogoBase64();
        pdf.addImage(logo, "PNG", margin, y - 8, 12, 12);
        pdf.setFontSize(22);
        pdf.setFont("helvetica", "bold");
        pdf.setTextColor(44, 105, 117); // Deep Teal
        pdf.text("CareScribe Medical Summary", margin + 16, y);
      } catch (e) {
        pdf.setFontSize(22);
        pdf.setFont("helvetica", "bold");
        pdf.setTextColor(44, 105, 117); // Deep Teal
        pdf.text("CareScribe Medical Summary", margin, y);
      }
      y += 12;

      // --- Meta Info ---
      pdf.setFontSize(10);
      pdf.setFont("helvetica", "normal");
      pdf.setTextColor(100, 100, 100); // Gray
      pdf.text(`Generated on: ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}`, margin, y);
      y += 15;

      // --- Patient/Visit Info Box ---
      pdf.setDrawColor(200, 210, 210);
      pdf.setFillColor(236, 249, 245); // Minty background
      pdf.roundedRect(margin, y, maxLineWidth, 35, 3, 3, "F");
      pdf.setDrawColor(180, 200, 200);
      pdf.roundedRect(margin, y, maxLineWidth, 35, 3, 3, "S");

      let boxY = y + 10;
      const leftColX = margin + 5;
      const rightColX = pageWidth / 2 + 5;

      pdf.setTextColor(0, 0, 0);
      pdf.setFontSize(11);

      pdf.setFont("helvetica", "bold");
      pdf.text("Provider:", leftColX, boxY);
      pdf.setFont("helvetica", "normal");
      pdf.text(apt.doctor, leftColX + 25, boxY);

      pdf.setFont("helvetica", "bold");
      pdf.text("Date:", rightColX, boxY);
      pdf.setFont("helvetica", "normal");
      pdf.text(new Date(apt.date || "").toLocaleDateString(), rightColX + 15, boxY);

      boxY += 10;

      pdf.setFont("helvetica", "bold");
      pdf.text("Specialty:", leftColX, boxY);
      pdf.setFont("helvetica", "normal");
      pdf.text(apt.specialty || "General Practice", leftColX + 25, boxY);

      boxY += 10;
      y += 45; // Move past the box

      // --- Helper for Sections ---
      const addSection = (title: string, content: string | string[]) => {
        if (!content || (Array.isArray(content) && content.length === 0)) return;

        if (y > 250) {
          pdf.addPage();
          y = 20;
        }

        // Section Title
        pdf.setFontSize(14);
        pdf.setFont("helvetica", "bold");
        pdf.setTextColor(44, 105, 117);
        pdf.text(title.toUpperCase(), margin, y);

        // Underline
        pdf.setDrawColor(44, 105, 117);
        pdf.setLineWidth(0.5);
        pdf.line(margin, y + 2, margin + pdf.getTextWidth(title.toUpperCase()), y + 2);

        y += 10;

        // Content
        pdf.setFontSize(11);
        pdf.setFont("helvetica", "normal");
        pdf.setTextColor(0, 0, 0);

        if (Array.isArray(content)) {
          content.forEach(item => {
            if (y > 275) {
              pdf.addPage();
              y = 20;
            }
            pdf.text("•", margin, y);
            const splitItem = pdf.splitTextToSize(item, maxLineWidth - 5);
            pdf.text(splitItem, margin + 5, y);
            y += (splitItem.length * 6) + 2;
          });
        } else {
          const splitText = pdf.splitTextToSize(content, maxLineWidth);
          for (const line of splitText) {
            if (y > 275) {
              pdf.addPage();
              y = 20;
            }
            pdf.text(line, margin, y);
            y += 6;
          }
        }
        y += 10; // Spacing after section
      };

      // --- Sections ---
      addSection("Reason for Visit", apt.reason || "");
      addSection("Clinical Summary", apt.notes || "No summary available.");
      addSection("Key Takeaways & Instructions", apt.instructions || []);

      const medStrings = apt.medications?.map(m => {
        let s = `${m.name}`;
        if (m.dosage) s += ` - ${m.dosage}`;
        if (m.frequency) s += ` (${m.frequency})`;
        if (m.reason) s += ` for ${m.reason}`;
        return s;
      });
      addSection("Medications", medStrings || []);

      addSection("Diagnosis", apt.diagnosis || []);

      // --- Footer ---
      const pageCount = pdf.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        pdf.setPage(i);
        pdf.setFontSize(8);
        pdf.setTextColor(150, 150, 150);
        pdf.text(`Page ${i} of ${pageCount}`, pageWidth - margin, 290, { align: "right" });
        pdf.text("Generated by CareScribe AI - Not a replacement for professional medical advice.", margin, 290);
      }

      pdf.save(`Summary_${apt.doctor.replace(/\s+/g, "_")}_${apt.date?.split("T")[0]}.pdf`);

    } catch (err) {
      console.error(err);
      alert("Failed to generate summary. Please try again.");
    } finally {
      setSummaryLoadingId(null);
    }
  };
  const handleDeleteClick = (id: string) => {
    setConfirmingDocId(id);
  };

  const startRenaming = (doc: DocumentMeta) => {
    setRenamingDocId(doc.id);
    setRenameValue(doc.name);
  };

  const handleRenameSubmit = (docId: string) => {
    if (!renameValue.trim()) return;
    handleRename(docId, renameValue.trim());
    setRenamingDocId(null);
  };

  const handleConfirmDelete = (id: string) => {
    handleDelete(id);
    setConfirmingDocId(null);
  };

  const handleCancelDelete = () => {
    setConfirmingDocId(null);
  };

  const isSummaryLoading = (docId: string) => summaryLoadingId === docId;

  const renderPreviewContent = (doc: DocumentMeta | null) => {
    if (!doc) return null;

    // Check if transcript
    const transcript = transcripts.find(t => t.documentId === doc.id);
    if (transcript) {
      return (
        <div className="whitespace-pre-wrap font-mono text-sm p-4 bg-white rounded-lg border border-border text-foreground">
          {transcript.lines.join("\n")}
        </div>
      );
    }

    if (!doc.downloadUrl) {
      return (
        <p className="text-sm text-muted-foreground">
          This document doesn&apos;t have a preview URL.
        </p>
      );
    }
    if (doc.mimeType?.startsWith("image/")) {
      return (
        <div className="w-full h-[70vh] flex items-center justify-center overflow-auto">
          <img
            src={doc.downloadUrl}
            alt={doc.name}
            className="max-h-full max-w-full object-contain"
          />
        </div>
      );
    }
    if (doc.mimeType === "application/pdf") {
      return (
        <iframe
          src={doc.downloadUrl}
          title={doc.name}
          className="w-full h-[70vh] rounded-lg border border-border"
        />
      );
    }
    return (
      <p className="text-sm text-muted-foreground">
        Preview not available for this file type. Try downloading it instead.
      </p>
    );
  };

  const resolveAppointmentLabel = (doc: DocumentMeta) => {
    if (!doc.appointmentId) return "Unattached";
    const apt = appointments.find((a) => a.id === doc.appointmentId);
    if (!apt) return "Unknown Appointment";
    if (apt.type === "lab") return `${apt.labType || "Lab"} • ${new Date(apt.date || "").toLocaleDateString()}`;
    return `${apt.doctor} • ${new Date(apt.date || "").toLocaleDateString()}`;
  };

  return (
    <Layout>
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" />
              Documents & Reports
            </h1>
            <p className="text-sm text-muted-foreground">
              Upload lab reports, visit summaries, and other health documents.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleGenerateFullReport}
              disabled={isExporting}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-primary/60 text-xs font-medium text-primary hover:bg-primary/5 disabled:opacity-60"
            >
              <Sparkles className="w-4 h-4" />
              {isExporting ? "Generating..." : "Export full history"}
            </button>

            <button
              type="button"
              onClick={handleUploadClick}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90"
            >
              <Upload className="w-4 h-4" />
              Upload document
            </button>
          </div>
        </div>

        {/* Document list */}
        <div className="bg-card border border-border rounded-2xl p-4 md:p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-semibold text-foreground">
                Your documents
              </h2>
              <p className="text-xs text-muted-foreground">
                {sortedDocuments.length} file
                {sortedDocuments.length === 1 ? "" : "s"}
              </p>
            </div>

            {/* Loading bar for summary generation */}
            {summaryLoadingId && (
              <div className="mb-4 h-1 w-full rounded-full bg-muted overflow-hidden">
                <div className="h-full w-1/3 animate-pulse bg-primary" />
              </div>
            )}
          </div>

          {/* Search bar */}
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search documents..."
              className="pl-9 h-9 text-xs"
            />
          </div>

          {filteredDocuments.length === 0 ? (
            <div className="text-center py-10">
              <p className="text-sm text-muted-foreground">No documents found.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {filteredDocuments.map((doc) => {
                const isRenaming = renamingDocId === doc.id;
                const isConfirming = confirmingDocId === doc.id;
                const sizeLabel = doc.sizeBytes
                  ? `${Math.round(doc.sizeBytes / 1024)} KB`
                  : "";
                const isTranscript = transcripts.some(t => t.documentId === doc.id);

                return (
                  <div
                    key={doc.id}
                    className={`relative flex items-center gap-3 rounded-xl border border-border bg-background px-3 py-2 hover:bg-muted/60 transition-colors group ${doc.appointmentId ? "cursor-pointer" : ""}`}
                    onClick={(e) => {
                      // Prevent navigation if clicking on interactive elements
                      if ((e.target as HTMLElement).closest('button') || (e.target as HTMLElement).closest('input') || (e.target as HTMLElement).closest('select')) {
                        return;
                      }
                      if (doc.appointmentId) {
                        setLocation(`/appointment/${doc.appointmentId}`);
                      }
                    }}
                  >
                    <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                      <FileText className="w-4 h-4 text-muted-foreground" />
                    </div>

                    <div className="flex-1 min-w-0">
                      {isRenaming ? (
                        <div className="flex items-center gap-2">
                          <Input
                            value={renameValue}
                            onChange={(e) => setRenameValue(e.target.value)}
                            className="h-8 text-xs"
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                handleRenameSubmit(doc.id);
                              }
                              if (e.key === "Escape") {
                                setRenamingDocId(null);
                              }
                            }}
                          />
                          <button
                            type="button"
                            onClick={() => handleRenameSubmit(doc.id)}
                            className="text-xs font-semibold text-primary hover:underline"
                          >
                            Save
                          </button>
                          <button
                            type="button"
                            onClick={() => setRenamingDocId(null)}
                            className="text-xs text-muted-foreground hover:text-foreground"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <>
                          <p className="text-sm font-medium text-foreground truncate">
                            {doc.name}
                          </p>
                          <p className="text-[11px] text-muted-foreground truncate">
                            {doc.mimeType || "Document"}
                            {sizeLabel ? ` • ${sizeLabel}` : ""}
                          </p>

                          <div className="mt-0.5 flex flex-wrap items-center gap-2">
                            <p className="text-[11px] text-muted-foreground truncate">
                              {resolveAppointmentLabel(doc)}
                            </p>

                            {appointments.length > 0 && (
                              <select
                                value={doc.appointmentId ?? "none"}
                                onChange={(e) =>
                                  handleChangeAttachment(doc.id, e.target.value)
                                }
                                disabled={isTranscript}
                                className="text-[12px] border border-border bg-background rounded-lg px-2 py-1 h-9 max-w-[260px] font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                                title={isTranscript ? "Transcripts cannot be moved" : "Change attachment"}
                              >
                                <option value="none">None</option>
                                {appointments.map((apt) => {
                                  const isLab = apt.type === "lab";
                                  const dateLabel = apt.date
                                    ? new Date(apt.date).toLocaleDateString()
                                    : "No date";
                                  const label = isLab
                                    ? `${apt.labType || "Lab work"} (Lab) • ${dateLabel}`
                                    : `${apt.doctor || "Provider"}${apt.specialty
                                      ? ` - ${apt.specialty}`
                                      : ""
                                    } • ${dateLabel}`;
                                  return (
                                    <option key={apt.id} value={apt.id}>
                                      {label}
                                    </option>
                                  );
                                })}
                              </select>
                            )}
                          </div>
                        </>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1 ml-2">
                      <button
                        type="button"
                        onClick={() => handleOpenPreview(doc)}
                        className="p-2 rounded-full hover:bg-muted"
                        aria-label="Preview document"
                      >
                        <Eye className="w-5 h-5 text-muted-foreground" />
                      </button>

                      {isTranscript && (
                        <button
                          type="button"
                          onClick={() => handleGenerateSummary(doc)}
                          disabled={isSummaryLoading(doc.id)}
                          className="p-2 rounded-full hover:bg-muted disabled:opacity-40"
                          aria-label="Generate AI summary"
                        >
                          <Sparkles className="w-5 h-5 text-foreground" />
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => handleDeleteClick(doc.id)}
                        className="p-2 rounded-full hover:bg-muted"
                        aria-label="Delete document"
                      >
                        <Trash2 className="w-5 h-5 text-muted-foreground" />
                      </button>
                    </div>

                    {isConfirming && (
                      <div className="absolute right-3 top-3 bg-card border border-border shadow-md px-3 py-2 flex items-center gap-2 rounded-xl z-10">
                        <span className="text-[11px] text-muted-foreground">
                          Delete this document?
                        </span>
                        <button
                          type="button"
                          onClick={() => handleConfirmDelete(doc.id)}
                          className="text-[11px] font-semibold text-red-600 hover:text-red-700"
                        >
                          Delete
                        </button>
                        <button
                          type="button"
                          onClick={handleCancelDelete}
                          className="text-[11px] text-muted-foreground hover:text-foreground"
                        >
                          Cancel
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Upload Modal */}
        {showUploadModal && (
          <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 px-4">
            <div className="bg-card w-full max-w-md rounded-2xl border border-border shadow-xl">
              <div className="flex items-center justify-between border-b border-border px-4 py-3">
                <div className="flex items-center gap-2">
                  <Upload className="w-4 h-4 text-primary" />
                  <h2 className="text-sm font-semibold text-foreground">
                    Upload a document
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setShowUploadModal(false);
                    setUploadingFile(null);
                    setFileName("");
                    setUploadError(null);
                    setTargetAppointmentId("none");
                  }}
                  className="p-1 rounded-full hover:bg-muted"
                  aria-label="Close"
                >
                  <X className="w-4 h-4 text-muted-foreground" />
                </button>
              </div>

              <div className="p-4 space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground">
                    File
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="file"
                      onChange={handleFileChange}
                      className="block w-full text-xs text-muted-foreground file:mr-2 file:py-1.5 file:px-3 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"
                    />
                  </div>
                  {uploadingFile && (
                    <p className="text-[11px] text-muted-foreground mt-1">
                      Selected: {uploadingFile.name} (
                      {Math.round(uploadingFile.size / 1024)} KB)
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground">
                    Document name
                  </label>
                  <Input
                    value={fileName}
                    onChange={(e) => setFileName(e.target.value)}
                    placeholder="e.g. Lab results - July 2024"
                    className="h-8 text-xs"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground">
                    Attach to appointment (optional)
                  </label>
                  <select
                    value={targetAppointmentId}
                    onChange={(e) =>
                      setTargetAppointmentId(
                        (e.target.value || "none") as string | "none",
                      )
                    }
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs"
                  >
                    <option value="none">Don&apos;t attach</option>
                    {appointments.map((apt) => {
                      const isLab = apt.type === "lab";
                      const dateLabel = apt.date
                        ? new Date(apt.date).toLocaleDateString()
                        : "No date";
                      const label = isLab
                        ? `${apt.labType || "Lab work"} (Lab) • ${dateLabel}`
                        : `${apt.doctor || "Provider"}${apt.specialty ? ` - ${apt.specialty}` : ""
                        } • ${dateLabel}`;
                      return (
                        <option key={apt.id} value={apt.id}>
                          {label}
                        </option>
                      );
                    })}
                  </select>
                </div>

                {uploadError && (
                  <p className="text-[11px] text-red-500">{uploadError}</p>
                )}
              </div>

              <div className="flex justify-end gap-2 border-t border-border px-4 py-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowUploadModal(false);
                    setUploadingFile(null);
                    setFileName("");
                    setUploadError(null);
                    setTargetAppointmentId("none");
                  }}
                  className="px-3 py-1.5 rounded-xl border border-border text-xs text-muted-foreground hover:bg-muted/60"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleUpload}
                  className="px-3 py-1.5 rounded-xl bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 disabled:opacity-60"
                  disabled={!uploadingFile}
                >
                  Upload
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Preview Modal */}
        {previewDoc && (
          <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 px-4">
            <div className="bg-card w-full max-w-3xl rounded-2xl border border-border shadow-xl max-h-[90vh] flex flex-col">
              <div className="flex items-center justify-between border-b border-border px-4 py-3">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-primary" />
                  <h3 className="text-sm font-semibold text-foreground">
                    {previewDoc.name}
                  </h3>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleDownload(previewDoc)}
                    className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90"
                  >
                    <Download className="w-3 h-3" />
                    Download as PDF
                  </button>
                  <button
                    type="button"
                    onClick={handleClosePreview}
                    className="p-1 rounded-full hover:bg-muted"
                    aria-label="Close preview"
                  >
                    <X className="w-4 h-4 text-muted-foreground" />
                  </button>
                </div>
              </div>
              <div className="flex-1 overflow-auto p-4 bg-muted/20">
                {renderPreviewContent(previewDoc)}
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
