import React from "react";
import "./Waiting.css";

export default function Waiting() {
  return (
    <div className="waiting">
      <div className="text-center">
        <span className="material-symbols-outlined progress-icon rotating">
          progress_activity
        </span>
        <div className="waiting-text">Waiting for users to join</div>
      </div>
    </div>
  );
}
