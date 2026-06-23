"use client";

interface Props {
  confirmMessage: string;
  className?: string;
  children: React.ReactNode;
}

export function DeleteButton({ confirmMessage, className, children }: Props) {
  return (
    <button
      type="submit"
      className={className}
      onClick={(e) => {
        if (!confirm(confirmMessage)) e.preventDefault();
      }}
    >
      {children}
    </button>
  );
}
