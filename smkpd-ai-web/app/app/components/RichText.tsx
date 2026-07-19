import { ReactNode } from "react";

function cleanInline(value: string) {
  return value
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/__(.*?)__/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/(?<!\*)\*([^*\n]+)\*(?!\*)/g, "$1")
    .trim();
}

function splitRow(value: string) {
  return value
    .trim()
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((cell) => cleanInline(cell));
}

function divider(value: string) {
  return /^\s*\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?\s*$/.test(value);
}

export default function RichText({ text }: { text: string }) {
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  const nodes: ReactNode[] = [];
  let index = 0;

  while (index < lines.length) {
    const line = lines[index].trim();

    if (!line || /^```/.test(line)) {
      index += 1;
      continue;
    }

    const next = lines[index + 1] || "";
    if (line.includes("|") && divider(next)) {
      const headers = splitRow(line);
      const rows: string[][] = [];
      index += 2;

      while (index < lines.length) {
        const row = lines[index].trim();
        if (!row || !row.includes("|") || divider(row)) break;
        rows.push(splitRow(row));
        index += 1;
      }

      nodes.push(
        <div className="rich-table-wrap" key={`table-${index}`}>
          <table className="rich-table">
            <thead>
              <tr>
                {headers.map((header, headerIndex) => (
                  <th key={`${header}-${headerIndex}`}>{header}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, rowIndex) => (
                <tr key={`row-${rowIndex}`}>
                  {headers.map((_, cellIndex) => (
                    <td key={`cell-${rowIndex}-${cellIndex}`}>
                      {row[cellIndex] || ""}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
      continue;
    }

    const heading = line.match(/^(#{1,6})\s+(.+)$/);
    if (heading) {
      nodes.push(
        <h3 key={`heading-${index}`}>{cleanInline(heading[2])}</h3>
      );
      index += 1;
      continue;
    }

    const bullet = line.match(/^[-*+•]\s+(.+)$/);
    if (bullet) {
      const items: string[] = [];
      while (index < lines.length) {
        const current = lines[index].trim().match(/^[-*+•]\s+(.+)$/);
        if (!current) break;
        items.push(cleanInline(current[1]));
        index += 1;
      }
      nodes.push(
        <ul key={`list-${index}`}>
          {items.map((item, itemIndex) => (
            <li key={`${item}-${itemIndex}`}>{item}</li>
          ))}
        </ul>
      );
      continue;
    }

    const numbered = line.match(/^\d+[.)]\s+(.+)$/);
    if (numbered) {
      const items: string[] = [];
      while (index < lines.length) {
        const current = lines[index].trim().match(/^\d+[.)]\s+(.+)$/);
        if (!current) break;
        items.push(cleanInline(current[1]));
        index += 1;
      }
      nodes.push(
        <ol key={`ordered-${index}`}>
          {items.map((item, itemIndex) => (
            <li key={`${item}-${itemIndex}`}>{item}</li>
          ))}
        </ol>
      );
      continue;
    }

    nodes.push(<p key={`paragraph-${index}`}>{cleanInline(line)}</p>);
    index += 1;
  }

  return <div className="rich-text">{nodes}</div>;
}
