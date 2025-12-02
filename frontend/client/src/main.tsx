import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import React from "react";
import ReactDOM from "react-dom/client";
import { TranscriptsProvider } from "@/context/TranscriptsContext";
import { AppointmentsProvider } from "@/context/AppointmentsContext";
import { DocumentsProvider } from "@/context/DocumentsContext";
import { UserProfileProvider } from "@/context/UserProfileContext";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <UserProfileProvider>
      <AppointmentsProvider>
        <DocumentsProvider>
          <TranscriptsProvider>
            <App />
          </TranscriptsProvider>
        </DocumentsProvider>
      </AppointmentsProvider>
    </UserProfileProvider>
  </React.StrictMode>,
);