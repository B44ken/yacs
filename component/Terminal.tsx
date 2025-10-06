interface TerminalProps {
  title: string;
  children?: React.ReactNode;
  grid: { x?: number; y?: number; w?: number; h?: number };
}
export const Terminal = ({ title, children, grid }: TerminalProps) => {
  grid = { x: grid.x || 0, y: grid.y || 0, w: grid.w || 1, h: grid.h || 1 };
  return (
    <div
      className="rounded-lg border border-slate-700 shadow-2xl flex min-h-0 flex-col"
      style={{ gridRow: `span ${grid.h}`, gridColumn: `span ${grid.w}` }}
    >
      <div className="bg-slate-800 border-b border-slate-700 flex p-1">
        <span className="flex items-center">{title}</span>
      </div>
      {children && (
        <div className="p-1 flex min-h-0 flex-1 overflow-auto">{children}</div>
      )}
    </div>
  );
};

interface TerminalsProps {
  children: React.ReactNode;
  header?: React.ReactNode;
  grid: { w: number; h: number };
}
export const TerminalLayout = ({ children, header, grid }: TerminalsProps) => {
  return (
    <div className="bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 font-mono text-gray-200 flex h-screen min-h-0 flex-col p-2">
      {header && (
        <h1 className="text-2xl font-bold font-mono py-2 flex-shrink-0">
          {header}
        </h1>
      )}
      <div
        className="grid flex-1 gap-3"
        style={{
          gridTemplateColumns: `repeat(${grid.w}, 1fr)`,
          gridTemplateRows: `repeat(${grid.h}, 1fr)`,
          height: "100%",
        }}
      >
        {children}
      </div>
    </div>
  );
};
