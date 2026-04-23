import Link from "next/link";

type Props = {
  title: string;
  meta: { label: string; value: string }[];
  links: { label: string; href: string }[];
  note?: React.ReactNode;
  accent?: string;
};

export function TopBar({ title, meta, links, note, accent = "#4bb3ff" }: Props) {
  return (
    <header
      className="hpi-topbar"
      style={{ ["--accent" as string]: accent }}
    >
      <div className="hpi-topbar-inner">
        <Link href="/" className="hpi-topbar-back">
          ← 返回工具合集
        </Link>
        <div className="hpi-topbar-meta">
          <span style={{ color: "#fff", fontWeight: 600 }}>{title}</span>
          {meta.map((m) => (
            <span key={m.label} className="hpi-meta-cell">
              <span className="hpi-meta-dot" />
              <em>{m.label}</em>
              {m.value}
            </span>
          ))}
        </div>
        <div className="hpi-topbar-links">
          {links.map((l) => (
            <a
              key={l.href}
              href={l.href}
              target="_blank"
              rel="noopener noreferrer"
              className="hpi-topbar-link"
            >
              {l.label} ↗
            </a>
          ))}
        </div>
      </div>
      {note && <div className="hpi-topbar-note">{note}</div>}
    </header>
  );
}
