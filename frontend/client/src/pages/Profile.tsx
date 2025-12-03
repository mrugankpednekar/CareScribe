import { useState } from "react";
import { Layout } from "@/components/layout/Layout";
import { useUserProfile } from "@/context/UserProfileContext";
import { useMedications } from "@/context/MedicationsContext";
import { ArrowLeft, Pill, Calendar, User, Plus, Search, Edit2, X, Save } from "lucide-react";
import { Link } from "wouter";
import { cn } from "@/lib/utils";
import type { Medication } from "@/lib/types";
import { DatePicker } from "@/components/ui/date-picker";
import { TimePicker } from "@/components/ui/time-picker";

export default function Profile() {
  const { profile, updateProfile } = useUserProfile();
  const { medications, addMedication, updateMedication, deleteMedication, toggleMedicationActive } = useMedications();

  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editingProfile, setEditingProfile] = useState(profile);
  const [searchQuery, setSearchQuery] = useState("");
  const [showMedForm, setShowMedForm] = useState(false);
  const [editingMed, setEditingMed] = useState<Medication | null>(null);

  const [medForm, setMedForm] = useState({
    name: "",
    dosage: "",
    frequency: "Once daily",
    times: [] as string[],
    startDate: new Date().toISOString().split("T")[0],
    endDate: "",
    prescribedBy: "",
    reason: "",
    frequencyType: "once" as "daily" | "weekly" | "once",
    selectedDays: [] as number[],
  });
  const [newTime, setNewTime] = useState("");

  const activeMeds = medications.filter((m) => m.active);
  const filteredMeds = activeMeds.filter((med) =>
    med.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    med.prescribedBy?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    med.reason?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSaveProfile = () => {
    updateProfile(editingProfile);
    setIsEditingProfile(false);
  };

  const handleCancelEdit = () => {
    setEditingProfile(profile);
    setIsEditingProfile(false);
  };

  const handleAddTime = () => {
    if (newTime && !medForm.times.includes(newTime)) {
      setMedForm((prev) => ({
        ...prev,
        times: [...prev.times, newTime].sort(),
      }));
      setNewTime("");
    }
  };

  const handleRemoveTime = (time: string) => {
    setMedForm((prev) => ({
      ...prev,
      times: prev.times.filter((t) => t !== time),
    }));
  };

  const handleSaveMedication = () => {
    if (!medForm.name.trim() || !medForm.dosage.trim()) {
      return;
    }

    const medData = {
      ...medForm,
      times: medForm.times,
      endDate: medForm.endDate || undefined,
      frequencyType: medForm.frequencyType,
      selectedDays: medForm.selectedDays,
    };

    if (editingMed) {
      updateMedication(editingMed.id, medData);
      setEditingMed(null);
    } else {
      addMedication({
        ...medData,
        active: true,
      });
    }

    setMedForm({
      name: "",
      dosage: "",
      frequency: "Once daily",
      times: [],
      startDate: new Date().toISOString().split("T")[0],
      endDate: "",
      prescribedBy: "",
      reason: "",
      frequencyType: "once",
      selectedDays: [],
    });
    setShowMedForm(false);
  };

  const handleEditMedication = (med: Medication) => {
    setEditingMed(med);
    setMedForm({
      name: med.name,
      dosage: med.dosage,
      frequency: med.frequency,
      times: med.times || [],
      startDate: med.startDate || new Date().toISOString().split("T")[0],
      endDate: med.endDate || "",
      prescribedBy: med.prescribedBy || "",
      reason: med.reason || "",
      frequencyType: med.frequencyType || "once",
      selectedDays: med.selectedDays || [],
    });
    setShowMedForm(true);
  };

  const handleCancelMedForm = () => {
    setMedForm({
      name: "",
      dosage: "",
      frequency: "Once daily",
      times: [],
      startDate: new Date().toISOString().split("T")[0],
      endDate: "",
      prescribedBy: "",
      reason: "",
      frequencyType: "once",
      selectedDays: [],
    });
    setEditingMed(null);
    setShowMedForm(false);
  };

  return (
    <Layout>
      <div className="max-w-4xl">
        {/* Header */}
        <div className="mb-8">
          <Link href="/">
            <a className="inline-flex items-center gap-2 text-primary hover:text-primary/80 mb-4 font-medium">
              <ArrowLeft className="w-4 h-4" />
              Back
            </a>
          </Link>
          <h1 className="text-4xl font-bold text-foreground">Profile</h1>
        </div>

        {/* Profile Card */}
        <div className="bg-card border border-border rounded-lg p-8 mb-8">
          <div className="flex items-start justify-between mb-6">
            <div className="flex items-start gap-4 flex-1">
              <div className="w-16 h-16 rounded-full bg-primary text-primary-foreground flex items-center justify-center flex-shrink-0">
                <User className="w-8 h-8" />
              </div>
              <div className="flex-1">
                {isEditingProfile ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-foreground">First Name</label>
                        <input
                          type="text"
                          value={editingProfile.firstName}
                          onChange={(e) =>
                            setEditingProfile((prev) => ({ ...prev, firstName: e.target.value }))
                          }
                          className="w-full p-2 border border-border rounded-lg bg-background text-foreground"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-foreground">Last Name</label>
                        <input
                          type="text"
                          value={editingProfile.lastName}
                          onChange={(e) =>
                            setEditingProfile((prev) => ({ ...prev, lastName: e.target.value }))
                          }
                          className="w-full p-2 border border-border rounded-lg bg-background text-foreground"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-foreground">Age</label>
                        <input
                          type="number"
                          value={editingProfile.age || ""}
                          onChange={(e) =>
                            setEditingProfile((prev) => ({
                              ...prev,
                              age: e.target.value ? parseInt(e.target.value) : undefined,
                            }))
                          }
                          className="w-full p-2 border border-border rounded-lg bg-background text-foreground"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-foreground">Blood Type</label>
                        <input
                          type="text"
                          value={editingProfile.bloodType || ""}
                          onChange={(e) =>
                            setEditingProfile((prev) => ({ ...prev, bloodType: e.target.value || undefined }))
                          }
                          className="w-full p-2 border border-border rounded-lg bg-background text-foreground"
                          placeholder="e.g. O+"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-foreground">Weight (kg)</label>
                        <input
                          type="number"
                          value={editingProfile.weightKg || ""}
                          onChange={(e) =>
                            setEditingProfile((prev) => ({
                              ...prev,
                              weightKg: e.target.value ? parseFloat(e.target.value) : undefined,
                            }))
                          }
                          className="w-full p-2 border border-border rounded-lg bg-background text-foreground"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-foreground">Height (cm)</label>
                        <input
                          type="number"
                          value={editingProfile.heightCm || ""}
                          onChange={(e) =>
                            setEditingProfile((prev) => ({
                              ...prev,
                              heightCm: e.target.value ? parseFloat(e.target.value) : undefined,
                            }))
                          }
                          className="w-full p-2 border border-border rounded-lg bg-background text-foreground"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-foreground">Gender</label>
                        <input
                          type="text"
                          value={editingProfile.gender || ""}
                          onChange={(e) =>
                            setEditingProfile((prev) => ({ ...prev, gender: e.target.value || undefined }))
                          }
                          className="w-full p-2 border border-border rounded-lg bg-background text-foreground"
                          placeholder="e.g. Male, Female, Other"
                        />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={handleSaveProfile}
                        className="px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors flex items-center gap-2"
                      >
                        <Save className="w-4 h-4" />
                        Save
                      </button>
                      <button
                        onClick={handleCancelEdit}
                        className="px-4 py-2 border border-border rounded-lg font-medium hover:bg-muted transition-colors flex items-center gap-2"
                      >
                        <X className="w-4 h-4" />
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <h2 className="text-2xl font-bold text-foreground mb-1">
                      {profile.firstName} {profile.lastName}
                    </h2>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                      {profile.age && (
                        <div>
                          <p className="text-xs font-semibold text-muted-foreground uppercase">Age</p>
                          <p className="text-lg font-bold text-foreground">{profile.age}</p>
                        </div>
                      )}
                      <div>
                        <p className="text-xs font-semibold text-muted-foreground uppercase">Active Meds</p>
                        <p className="text-lg font-bold text-foreground">{activeMeds.length}</p>
                      </div>
                      {profile.bloodType && (
                        <div>
                          <p className="text-xs font-semibold text-muted-foreground uppercase">Blood Type</p>
                          <p className="text-lg font-bold text-foreground">{profile.bloodType}</p>
                        </div>
                      )}
                      {profile.weightKg && (
                        <div>
                          <p className="text-xs font-semibold text-muted-foreground uppercase">Weight</p>
                          <p className="text-lg font-bold text-foreground">{profile.weightKg} kg</p>
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => setIsEditingProfile(true)}
                      className="mt-4 px-4 py-2 border border-border rounded-lg font-medium hover:bg-muted transition-colors flex items-center gap-2"
                    >
                      <Edit2 className="w-4 h-4" />
                      Edit Profile
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Medications Section */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Pill className="w-6 h-6 text-secondary" />
              Current Medications
            </h2>
            <button
              onClick={() => {
                setShowMedForm(true);
                setEditingMed(null);
                setMedForm({
                  name: "",
                  dosage: "",
                  frequency: "Once daily",
                  times: [],
                  startDate: new Date().toISOString().split("T")[0],
                  endDate: "",
                  prescribedBy: "",
                  reason: "",
                  frequencyType: "once",
                  selectedDays: [],
                });
              }}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Add Medication
            </button>
          </div>

          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-5 h-5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search medications by name, prescriber, or reason..."
              className="w-full pl-10 pr-4 py-3 border border-border rounded-lg bg-background text-foreground focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>

          {/* Medication Form */}
          {showMedForm && (
            <div className="bg-card border border-border rounded-lg p-6 space-y-4">
              <h3 className="text-lg font-bold text-foreground">
                {editingMed ? "Edit Medication" : "Add New Medication"}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Medication Name *</label>
                  <input
                    type="text"
                    value={medForm.name}
                    onChange={(e) => setMedForm((prev) => ({ ...prev, name: e.target.value }))}
                    className="w-full p-2 border border-border rounded-lg bg-background text-foreground"
                    placeholder="e.g. Lisinopril"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Dosage *</label>
                  <input
                    type="text"
                    value={medForm.dosage}
                    onChange={(e) => setMedForm((prev) => ({ ...prev, dosage: e.target.value }))}
                    className="w-full p-2 border border-border rounded-lg bg-background text-foreground"
                    placeholder="e.g. 10mg"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Frequency</label>
                  <div className="space-y-3">
                    <div className="flex gap-2">
                      {(["once", "daily", "weekly"] as const).map(type => (
                        <button
                          key={type}
                          onClick={() => setMedForm(prev => ({ ...prev, frequencyType: type }))}
                          className={`px-3 py-1.5 rounded-md text-xs border ${medForm.frequencyType === type ? "bg-primary text-white border-primary" : "bg-background"}`}
                        >
                          {type.charAt(0).toUpperCase() + type.slice(1)}
                        </button>
                      ))}
                    </div>

                    {medForm.frequencyType === "weekly" && (
                      <div className="flex gap-1 flex-wrap">
                        {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
                          <button
                            key={i}
                            onClick={() => {
                              const current = medForm.selectedDays || [];
                              const newDays = current.includes(i)
                                ? current.filter(d => d !== i)
                                : [...current, i];
                              setMedForm(prev => ({ ...prev, selectedDays: newDays }));
                            }}
                            className={`w-8 h-8 rounded-full text-xs border flex items-center justify-center ${(medForm.selectedDays || []).includes(i) ? "bg-primary text-white border-primary" : "bg-background hover:bg-muted"}`}
                          >
                            {d}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Prescribed By</label>
                  <input
                    type="text"
                    value={medForm.prescribedBy}
                    onChange={(e) => setMedForm((prev) => ({ ...prev, prescribedBy: e.target.value }))}
                    className="w-full p-2 border border-border rounded-lg bg-background text-foreground"
                    placeholder="e.g. Dr. Sarah Chen"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Start Date</label>
                  <DatePicker
                    date={medForm.startDate ? new Date(medForm.startDate) : undefined}
                    setDate={(date) => setMedForm((prev) => ({ ...prev, startDate: date ? date.toISOString().split("T")[0] : "" }))}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">End Date (optional)</label>
                  <DatePicker
                    date={medForm.endDate ? new Date(medForm.endDate) : undefined}
                    setDate={(date) => setMedForm((prev) => ({ ...prev, endDate: date ? date.toISOString().split("T")[0] : "" }))}
                  />
                </div>
                <div className="md:col-span-2 space-y-2">
                  <label className="text-sm font-medium text-foreground">Reason</label>
                  <input
                    type="text"
                    value={medForm.reason}
                    onChange={(e) => setMedForm((prev) => ({ ...prev, reason: e.target.value }))}
                    className="w-full p-2 border border-border rounded-lg bg-background text-foreground"
                    placeholder="e.g. Blood Pressure"
                  />
                </div>
                <div className="md:col-span-2 space-y-2">
                  <label className="text-sm font-medium text-foreground">Times (HH:MM format)</label>
                  <div className="flex gap-2">
                    <TimePicker
                      value={newTime}
                      onChange={setNewTime}
                      className="flex-1"
                    />
                    <button
                      onClick={handleAddTime}
                      className="px-4 py-2 bg-muted text-foreground rounded-lg font-medium hover:bg-muted/80 transition-colors"
                    >
                      Add Time
                    </button>
                  </div>
                  {medForm.times.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {medForm.times.map((time) => (
                        <span
                          key={time}
                          className="inline-flex items-center gap-1 px-3 py-1 bg-primary/10 text-primary rounded-full text-sm"
                        >
                          {time}
                          <button
                            onClick={() => handleRemoveTime(time)}
                            className="hover:text-red-500"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleSaveMedication}
                  disabled={!medForm.name.trim() || !medForm.dosage.trim()}
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {editingMed ? "Update" : "Add"} Medication
                </button>
                <button
                  onClick={handleCancelMedForm}
                  className="px-4 py-2 border border-border rounded-lg font-medium hover:bg-muted transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Medications List */}
          {filteredMeds.length > 0 ? (
            <div className="space-y-4">
              {filteredMeds.map((med) => {
                const prescribedDate = med.prescribedDate
                  ? new Date(med.prescribedDate).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })
                  : null;

                return (
                  <div
                    key={med.id}
                    className="bg-card border border-border rounded-lg p-6 hover:border-muted transition-colors"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h3 className="text-xl font-bold text-foreground">{med.name}</h3>
                        {med.reason && (
                          <p className="text-sm text-secondary font-medium mt-1">{med.reason}</p>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-foreground">{med.dosage}</p>
                        <p className="text-xs text-muted-foreground">{med.frequency}</p>
                      </div>
                    </div>

                    {med.times && med.times.length > 0 && (
                      <div className="mb-3">
                        <p className="text-xs text-muted-foreground mb-1">Scheduled times:</p>
                        <div className="flex flex-wrap gap-2">
                          {med.times.map((time) => (
                            <span
                              key={time}
                              className="px-2 py-1 bg-primary/10 text-primary rounded text-xs font-medium"
                            >
                              {time}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="pt-3 border-t border-border flex items-center gap-4 text-xs flex-wrap">
                      {med.prescribedBy && (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <User className="w-4 h-4 text-primary" />
                          <span>
                            <span className="font-semibold text-foreground">Prescribed by:</span> {med.prescribedBy}
                          </span>
                        </div>
                      )}
                      {prescribedDate && (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Calendar className="w-4 h-4 text-primary" />
                          <span>{prescribedDate}</span>
                        </div>
                      )}
                    </div>

                    <div className="flex gap-2 mt-4">
                      <button
                        onClick={() => handleEditMedication(med)}
                        className="px-3 py-1.5 text-xs border border-border rounded-lg font-medium hover:bg-muted transition-colors flex items-center gap-1"
                      >
                        <Edit2 className="w-3 h-3" />
                        Edit
                      </button>

                      <button
                        onClick={() => deleteMedication(med.id)}
                        className="px-3 py-1.5 text-xs border border-red-200 text-red-600 rounded-lg font-medium hover:bg-red-50 transition-colors"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="bg-muted/30 rounded-lg p-12 text-center">
              <Pill className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
              <p className="text-muted-foreground">
                {searchQuery ? "No medications match your search" : "No active medications recorded"}
              </p>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
