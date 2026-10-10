import { useState } from "react";

// An inline confirmation works on mobile and avoids blocking browser dialogs.
export default function ConfirmAction({
  label,
  message,
  onConfirm,
  disabled = false,
  danger = false,
}) {
  const [confirming, setConfirming] = useState(false);
  if (!confirming)
    return (
      <button
        type="button"
        className={`text-btn ${danger ? "text-clay" : ""}`}
        disabled={disabled}
        onClick={() => setConfirming(true)}
      >
        {label}
      </button>
    );
  return (
    <div
      className="max-w-[300px] rounded-lg border border-[#f1ddc8] bg-[#fff5ed] p-3"
      role="group"
      aria-label={`Confirm ${label}`}
    >
      <p className="mb-2.5 text-[11px] text-[#8b684e]">{message}</p>
      <div className="flex items-center gap-2.5">
        <button
          type="button"
          className="btn px-3 py-[7px] text-[10px]"
          disabled={disabled}
          onClick={async () => {
            await onConfirm();
            setConfirming(false);
          }}
        >
          Confirm
        </button>
        <button
          type="button"
          className="text-btn text-[10px]"
          disabled={disabled}
          onClick={() => setConfirming(false)}
        >
          Keep / Cancel
        </button>
      </div>
    </div>
  );
}
