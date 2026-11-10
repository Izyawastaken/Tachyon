import React from "react";
import { useUpdater, type UpdaterStatus } from "../hooks/useUpdater";
import "./UpdateButton.css";

export interface UpdateButtonProps {
  autoCheck?: boolean;
  className?: string;
  variant?: "card" | "compact" | "button-only";
  onUpdateAvailable?: (version: string) => void;
}

export const UpdateButton: React.FC<UpdateButtonProps> = ({
  autoCheck = false,
  className = "",
  variant = "card",
  onUpdateAvailable,
}) => {
  const {
    status,
    update,
    currentVersion,
    targetVersion,
    progress,
    error,
    checkForUpdates,
    downloadAndInstall,
    reset,
  } = useUpdater({ autoCheckOnMount: autoCheck });

  React.useEffect(() => {
    if (status === "available" && targetVersion && onUpdateAvailable) {
      onUpdateAvailable(targetVersion);
    }
  }, [status, targetVersion, onUpdateAvailable]);

  const handleCheck = () => {
    checkForUpdates(false);
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  };

  if (variant === "button-only") {
    return (
      <button
        type="button"
        className={`update-btn update-btn--standalone ${className}`}
        onClick={status === "available" ? downloadAndInstall : handleCheck}
        disabled={status === "checking" || status === "downloading"}
      >
        {status === "checking" && <span className="update-spinner" />}
        {status === "idle" && "Check for Updates"}
        {status === "checking" && "Checking..."}
        {status === "available" && `Install v${targetVersion}`}
        {status === "downloading" && `Downloading (${progress?.percentage ?? 0}%)`}
        {status === "up-to-date" && "Up to Date"}
        {status === "error" && "Check Failed - Retry"}
      </button>
    );
  }

  return (
    <div className={`update-card update-card--${variant} ${className}`}>
      <div className="update-card__header">
        <div className="update-card__icon-wrapper">
          <StatusIcon status={status} />
        </div>
        <div className="update-card__info">
          <div className="update-card__title-row">
            <h3 className="update-card__title">Software Updates</h3>
            <span className="update-card__badge">v{currentVersion}</span>
          </div>
          <p className="update-card__description">
            {status === "idle" && "Check if a newer version of Tachyon is available."}
            {status === "checking" && "Connecting to update servers..."}
            {status === "up-to-date" && "You are running the latest version of Tachyon."}
            {status === "available" && `Version ${targetVersion} is ready to install.`}
            {status === "downloading" && "Downloading and preparing installation..."}
            {status === "downloaded" && "Download complete! Restarting to apply..."}
            {status === "error" && (error ?? "Failed to check for updates.")}
          </p>
        </div>
      </div>

      {status === "downloading" && progress && (
        <div className="update-progress">
          <div className="update-progress__bar">
            <div
              className="update-progress__fill"
              style={{ width: `${progress.percentage}%` }}
            />
          </div>
          <div className="update-progress__labels">
            <span>
              {formatBytes(progress.downloaded)} / {formatBytes(progress.total)}
            </span>
            <span>{progress.percentage}%</span>
          </div>
        </div>
      )}

      {status === "available" && update?.body && (
        <div className="update-notes">
          <span className="update-notes__label">Release Notes</span>
          <div className="update-notes__content">{update.body}</div>
        </div>
      )}

      <div className="update-card__actions">
        {status === "available" ? (
          <button
            type="button"
            className="update-btn update-btn--primary"
            onClick={downloadAndInstall}
          >
            Download & Install Update
          </button>
        ) : (
          <button
            type="button"
            className="update-btn update-btn--primary"
            onClick={handleCheck}
            disabled={status === "checking" || status === "downloading"}
          >
            {status === "checking" && <span className="update-spinner" />}
            {status === "checking" ? "Checking for updates..." : "Check for Updates"}
          </button>
        )}

        {status === "error" && (
          <button
            type="button"
            className="update-btn update-btn--ghost"
            onClick={reset}
          >
            Dismiss
          </button>
        )}
      </div>
    </div>
  );
};

const StatusIcon: React.FC<{ status: UpdaterStatus }> = ({ status }) => {
  switch (status) {
    case "checking":
      return (
        <svg className="update-icon update-icon--spin" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <circle cx="12" cy="12" r="10" strokeWidth="2" strokeOpacity="0.25" />
          <path d="M12 2a10 10 0 0 1 10 10" strokeWidth="2" strokeLinecap="round" />
        </svg>
      );
    case "up-to-date":
      return (
        <svg className="update-icon update-icon--success" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path d="M20 6L9 17l-5-5" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case "available":
      return (
        <svg className="update-icon update-icon--available" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path d="M12 3v12m0 0l-4-4m4 4l4-4M4 17v2a2 2 0 002 2h12a2 2 0 002-2v-2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case "error":
      return (
        <svg className="update-icon update-icon--error" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <circle cx="12" cy="12" r="10" strokeWidth="2" />
          <line x1="12" y1="8" x2="12" y2="12" strokeWidth="2" strokeLinecap="round" />
          <line x1="12" y1="16" x2="12.01" y2="16" strokeWidth="2.5" strokeLinecap="round" />
        </svg>
      );
    case "downloading":
    case "downloaded":
      return (
        <svg className="update-icon update-icon--download" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          <polyline points="7 10 12 15 17 10" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          <line x1="12" y1="15" x2="12" y2="3" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    default:
      return (
        <svg className="update-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
  }
};

