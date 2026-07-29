/**
 * Minimal renderer for the light Markdown the coach returns: headings,
 * **bold**, bullets, numbered items, and paragraphs. Deliberately not a full
 * Markdown parser — the coach output is constrained and a dependency isn't
 * warranted.
 */
function renderInline(text: string, keyPrefix: string): React.ReactNode[] {
  return text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g).map((part, i) => {
    const key = `${keyPrefix}-${i}`;
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={key} className="font-semibold">
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith("`") && part.endsWith("`")) {
      return (
        <code key={key} className="rounded bg-background px-1 py-0.5 text-[0.9em]">
          {part.slice(1, -1)}
        </code>
      );
    }
    return <span key={key}>{part}</span>;
  });
}

export function Markdown({ text }: { text: string }) {
  const lines = text.split("\n");
  const blocks: React.ReactNode[] = [];
  let list: { ordered: boolean; items: string[] } | null = null;

  function flushList(key: string) {
    if (!list) return;
    const items = list.items;
    blocks.push(
      list.ordered ? (
        <ol key={key} className="ml-5 list-decimal space-y-1">
          {items.map((item, i) => (
            <li key={i}>{renderInline(item, `${key}-${i}`)}</li>
          ))}
        </ol>
      ) : (
        <ul key={key} className="ml-5 list-disc space-y-1">
          {items.map((item, i) => (
            <li key={i}>{renderInline(item, `${key}-${i}`)}</li>
          ))}
        </ul>
      ),
    );
    list = null;
  }

  lines.forEach((raw, index) => {
    const line = raw.trimEnd();
    const key = `b-${index}`;

    if (line.trim() === "") {
      flushList(`${key}-list`);
      return;
    }

    const heading = /^(#{1,4})\s+(.*)$/.exec(line);
    if (heading) {
      flushList(`${key}-list`);
      blocks.push(
        <h3 key={key} className="mt-4 text-sm font-semibold uppercase tracking-wide text-muted first:mt-0">
          {renderInline(heading[2], key)}
        </h3>,
      );
      return;
    }

    const bullet = /^\s*[-*]\s+(.*)$/.exec(line);
    if (bullet) {
      if (!list || list.ordered) {
        flushList(`${key}-list`);
        list = { ordered: false, items: [] };
      }
      list.items.push(bullet[1]);
      return;
    }

    const numbered = /^\s*\d+\.\s+(.*)$/.exec(line);
    if (numbered) {
      if (!list || !list.ordered) {
        flushList(`${key}-list`);
        list = { ordered: true, items: [] };
      }
      list.items.push(numbered[1]);
      return;
    }

    flushList(`${key}-list`);
    blocks.push(<p key={key}>{renderInline(line, key)}</p>);
  });

  flushList("tail-list");

  return <div className="flex flex-col gap-2 text-sm leading-relaxed">{blocks}</div>;
}
