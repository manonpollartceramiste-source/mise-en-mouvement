"use client";

import { deleteMediaAction } from "./actions";

export function DeleteButton({ id, fileUrl }: { id: string; fileUrl: string }) {
  return (
    <form action={deleteMediaAction}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="file_url" value={fileUrl} />
      <button
        type="submit"
        onClick={(e) => {
          if (!confirm("Supprimer ce média définitivement ?")) e.preventDefault();
        }}
        className="text-xs text-red-400 hover:text-red-600 transition-colors"
      >
        Supprimer
      </button>
    </form>
  );
}
