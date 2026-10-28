import type { GameMatrix, MatrixCell } from "@/lib/guild/matrix";
import { de } from "@/i18n/de";

/**
 * Tasks down, members or characters across. Scrolls sideways on phones while the task
 * column stays in place (SPEC 7, item 5).
 */
export function MatrixTable({ matrix }: { matrix: GameMatrix }) {
  if (matrix.rows.length === 0 || matrix.columns.length === 0) {
    return <p className="text-sm text-muted">{de.matrix.empty}</p>;
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr>
            <th className="sticky left-0 z-10 bg-surface p-2 text-left font-semibold">
              {de.matrix.task}
            </th>
            {matrix.columns.map((column) => (
              <th
                key={column.key}
                className="p-2 text-center font-semibold whitespace-nowrap"
              >
                {column.label}
                {column.sublabel && (
                  <span className="block text-xs font-normal text-muted">
                    {column.sublabel}
                  </span>
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {matrix.rows.map((row) => (
            <tr key={row.taskId} className="border-t border-border">
              <th
                scope="row"
                className="sticky left-0 z-10 bg-surface p-2 text-left font-normal"
              >
                {row.title}
                {row.category && (
                  <span className="block text-xs text-muted">
                    {row.category}
                  </span>
                )}
              </th>
              {row.cells.map((cell, index) => (
                <Cell key={matrix.columns[index].key} cell={cell} />
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Cell({ cell }: { cell: MatrixCell }) {
  const tone =
    cell.done === true
      ? "text-success"
      : cell.done === false
        ? "text-muted"
        : "";
  return (
    <td
      className={`p-2 text-center whitespace-nowrap tabular-nums ${tone}`}
      title={cell.detail}
    >
      {cell.text}
      {/* The tooltip is mouse-only; screen readers get the breakdown as text. */}
      {cell.detail && <span className="sr-only">: {cell.detail}</span>}
      {cell.shared && (
        <i
          className="pi pi-link ml-1 text-xs text-muted"
          aria-label={de.matrix.shared}
          title={de.matrix.shared}
        />
      )}
    </td>
  );
}
