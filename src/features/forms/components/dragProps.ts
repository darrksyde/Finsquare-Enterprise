let dragging: { kind: string; id: string } | null = null

/** Native drag-and-drop reordering; no extra dependency needed. */
export const dragProps = (kind: string, id: string, onDrop: (fromId: string, toId: string) => void) => ({
  draggable: true,
  onDragStart: () => { dragging = { kind, id } },
  onDragOver: (e: React.DragEvent) => { if (dragging?.kind === kind) e.preventDefault() },
  onDrop: (e: React.DragEvent) => { e.preventDefault(); if (dragging?.kind === kind && dragging.id !== id) onDrop(dragging.id, id); dragging = null },
})
