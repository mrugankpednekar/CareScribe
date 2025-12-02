import { useState } from "react";
import { Layout } from "@/components/layout/Layout";
import { FileText, Upload, Download, X } from "lucide-react";
import { useAppointments } from "@/context/AppointmentsContext";

export default function Documents() {
  const { appointments } = useAppointments();
  const [docs, setDocs] = useState([
    { id: 1, name: "Visit Summary - May 15, 2024", size: "2.4 MB", type: "PDF", appointmentId: "apt-1" },
    { id: 2, name: "Lab Results - Lipid Panel", size: "1.1 MB", type: "PDF", appointmentId: null },
    { id: 3, name: "Cardiology Referral Letter", size: "0.5 MB", type: "PDF", appointmentId: "apt-2" },
  ]);

  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedAppointmentId, setSelectedAppointmentId] = useState<string | null>(null);

  const handleUpload = () => {
    const newDoc = {
      id: docs.length + 1,
      name: "New Document - " + new Date().toLocaleDateString(),
      size: "0.8 MB",
      type: "PDF",
      appointmentId: selectedAppointmentId,
    };
    setDocs([...docs, newDoc]);
    setShowUploadModal(false);
    setSelectedAppointmentId(null);
  };

  const getAppointmentName = (appointmentId: string | null) => {
    if (appointmentId === null) return "Not attached";
    const apt = appointments.find(a => a.id === appointmentId);
    return apt ? apt.doctor : "Unknown";
  };

  return (
    <Layout>
      <header className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Documents</h1>
          <p className="text-muted-foreground">Upload or export your medical history.</p>
        </div>
        <button 
          onClick={() => setShowUploadModal(true)}
          className="bg-secondary text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 hover:bg-secondary/90 transition-colors shadow-sm"
        >
          <Upload className="w-4 h-4" />
          Upload
        </button>
      </header>

      <div className="grid gap-4">
        {docs.map((doc) => (
          <div key={doc.id} className="bg-card border border-border/50 p-4 rounded-xl flex items-center justify-between hover:shadow-sm transition-shadow group">
            <div className="flex items-center gap-4 flex-1">
              <div className="w-10 h-10 bg-muted text-muted-foreground rounded-lg flex items-center justify-center">
                <FileText className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-foreground">{doc.name}</p>
                <div className="flex gap-3 text-xs text-muted-foreground mt-1">
                  <span>{doc.type} • {doc.size}</span>
                  <span className="text-primary">
                    {doc.appointmentId ? ` ${getAppointmentName(doc.appointmentId)}` : "No appointment"}
                  </span>
                </div>
              </div>
            </div>
            <button className="text-muted-foreground hover:text-primary p-2 rounded-lg hover:bg-secondary transition-colors">
              <Download className="w-5 h-5" />
            </button>
          </div>
        ))}
      </div>

      <div className="mt-8 p-6 bg-secondary/30 rounded-2xl border border-dashed border-border text-center">
        <h3 className="font-bold text-foreground mb-2">Export History</h3>
        <p className="text-sm text-muted-foreground mb-4">Download your full medical timeline for a new doctor.</p>
        <button className="px-6 py-2 bg-card border border-border/50 rounded-lg text-sm font-medium shadow-sm hover:bg-secondary transition-colors">
          Generate Full Report
        </button>
      </div>

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 shadow-lg">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-foreground">Upload Document</h2>
              <button 
                onClick={() => setShowUploadModal(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mb-6">
              <div className="border-2 border-dashed border-muted rounded-lg p-8 text-center">
                <Upload className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-foreground font-medium">Click to upload a file</p>
                <p className="text-xs text-muted-foreground">PDF, JPG, PNG up to 10MB</p>
              </div>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-foreground mb-3">
                Attach to appointment (optional)
              </label>
              <select
                value={selectedAppointmentId ?? ""}
                onChange={(e) => setSelectedAppointmentId(e.target.value || null)}
                className="w-full p-2 border border-border rounded-lg text-sm text-foreground bg-white focus:ring-2 focus:ring-primary focus:border-transparent"
              >
                <option value="">Select an appointment</option>
                {appointments.map(apt => (
                  <option key={apt.id} value={apt.id}>
                    {apt.doctor} - {new Date(apt.date).toLocaleDateString()}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex gap-3">
              <button 
                onClick={() => setShowUploadModal(false)}
                className="flex-1 px-4 py-2 border border-border rounded-lg text-foreground hover:bg-muted transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={handleUpload}
                className="flex-1 px-4 py-2 bg-secondary text-white rounded-lg hover:bg-secondary/90 transition-colors font-medium"
              >
                Upload
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
