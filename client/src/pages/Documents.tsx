import { Layout } from "@/components/layout/Layout";
import { FileText, Upload, Download } from "lucide-react";

export default function Documents() {
  const docs = [
    { name: "Visit Summary - May 15, 2024", size: "2.4 MB", type: "PDF" },
    { name: "Lab Results - Lipid Panel", size: "1.1 MB", type: "PDF" },
    { name: "Cardiology Referral Letter", size: "0.5 MB", type: "PDF" },
  ];

  return (
    <Layout>
      <header className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Documents</h1>
          <p className="text-muted-foreground">Uploads and exported summaries.</p>
        </div>
        <button className="bg-primary text-primary-foreground px-4 py-2 rounded-lg font-medium flex items-center gap-2 hover:bg-primary/90 transition-colors shadow-sm">
          <Upload className="w-4 h-4" />
          Upload
        </button>
      </header>

      <div className="grid gap-4">
        {docs.map((doc, i) => (
          <div key={i} className="bg-card border border-border/50 p-4 rounded-xl flex items-center justify-between hover:shadow-sm transition-shadow group">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-red-50 text-red-600 rounded-lg flex items-center justify-center">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <p className="font-medium text-foreground">{doc.name}</p>
                <p className="text-xs text-muted-foreground">{doc.type} • {doc.size}</p>
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
        <button className="px-6 py-2 bg-white border border-border/50 rounded-lg text-sm font-medium shadow-sm hover:bg-gray-50 transition-colors">
          Generate Full Report
        </button>
      </div>
    </Layout>
  );
}
