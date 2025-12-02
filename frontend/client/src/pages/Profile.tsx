import { Layout } from "@/components/layout/Layout";
import { mockAppointments } from "@/lib/mockData";
import { ArrowLeft, Pill, Calendar, User } from "lucide-react";
import { Link } from "wouter";

export default function Profile() {
  // Collect all medications from all appointments
  const allMedications = mockAppointments
    .flatMap(apt => 
      (apt.medications || []).map(med => ({
        ...med,
        prescribedBy: apt.doctor,
        specialty: apt.specialty,
        appointmentDate: apt.date,
        appointmentId: apt.id,
      }))
    )
    .filter(med => med.active);

  // Group medications by prescription
  const activeMeds = allMedications.filter(m => m.active);

  return (
    <Layout>
      <div className="max-w-3xl">
        {/* Header */}
        <div className="mb-8">
          <Link href="/">
            <a className="inline-flex items-center gap-2 text-primary hover:text-primary/80 mb-4 font-medium">
              <ArrowLeft className="w-4 h-4" />
              Back
            </a>
          </Link>
          <h1 className="text-4xl font-bold text-foreground">Profile</h1>
          <p className="text-muted-foreground mt-2">Alex Johnson</p>
        </div>

        {/* Profile Card */}
        <div className="bg-card border border-border rounded-lg p-8 mb-8">
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 rounded-full bg-primary text-primary-foreground flex items-center justify-center flex-shrink-0">
              <User className="w-8 h-8" />
            </div>
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-foreground mb-1">Alex Johnson</h2>
              <p className="text-muted-foreground mb-4">Patient ID: PX-2024-1895</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase">Age</p>
                  <p className="text-lg font-bold text-foreground">42</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase">Active Meds</p>
                  <p className="text-lg font-bold text-foreground">{activeMeds.length}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase">Blood Type</p>
                  <p className="text-lg font-bold text-foreground">O+</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase">Allergies</p>
                  <p className="text-lg font-bold text-foreground">Penicillin</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Current Medications */}
        <div className="space-y-6">
          <div>
            <h2 className="text-2xl font-bold text-foreground mb-4 flex items-center gap-2">
              <Pill className="w-6 h-6 text-secondary" />
              Current Medications
            </h2>
          </div>

          {activeMeds.length > 0 ? (
            <div className="space-y-4">
              {activeMeds.map((med, idx) => {
                const appointmentDate = new Date(med.appointmentDate);
                const dateStr = appointmentDate.toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                });

                return (
                  <div key={`${med.id}-${idx}`} className="bg-card border border-border rounded-lg p-6 hover:border-muted transition-colors">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="text-xl font-bold text-foreground">{med.name}</h3>
                        <p className="text-sm text-secondary font-medium mt-1">{med.reason}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-foreground">{med.dosage}</p>
                        <p className="text-xs text-muted-foreground">{med.frequency}</p>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-border flex items-center gap-4 text-xs">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <User className="w-4 h-4 text-primary" />
                        <span>
                          <span className="font-semibold text-foreground">{med.prescribedBy}</span> • {med.specialty}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Calendar className="w-4 h-4 text-primary" />
                        <span>{dateStr}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="bg-muted/30 rounded-lg p-12 text-center">
              <Pill className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
              <p className="text-muted-foreground">No active medications recorded</p>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
